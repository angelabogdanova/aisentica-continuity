import { randomUUID } from 'crypto';
import { storageBackend } from './config';
import { generateAgentId } from './id';
import { SupabaseRepository } from './supabase-repository';
import type { Agent, AgentDetail, DevelopmentRecord, DomainBinding, Event, Manifest, Owner, Version } from './types';

export interface Repository {
  owners(): Promise<Owner[]>;
  owner(id: string): Promise<Owner | undefined>;
  create(ownerId: string, manifest: Manifest): Promise<AgentDetail>;
  byOwner(ownerId: string): Promise<Agent[]>;
  detail(id: string): Promise<AgentDetail | undefined>;
  pendingBinding(agentId: string, domain?: string): Promise<DomainBinding | undefined>;
  createPendingDomainBinding(agentId: string, ownerId: string, domain: string, token: string): Promise<DomainBinding>;
  failDomainBinding(agentId: string, ownerId: string, bindingId: string): Promise<void>;
  completeDomainBinding(agentId: string, ownerId: string, bindingId: string): Promise<AgentDetail>;
  develop(agentId: string, ownerId: string, development: DevelopmentRecord): Promise<AgentDetail>;
  park(agentId: string, ownerId: string, reason: string): Promise<AgentDetail>;
  reactivate(agentId: string, ownerId: string, reason: string): Promise<AgentDetail>;
  reset(): Promise<void>;
}

const demoOwners: Owner[] = [
  { id: 'owner-a', displayName: 'Owner A', slug: 'owner-a', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'owner-b', displayName: 'Owner B', slug: 'owner-b', createdAt: '2026-01-01T00:00:00.000Z' },
];

export class MemoryRepository implements Repository {
  private agents: Agent[] = [];
  private versions: Version[] = [];
  private events: Event[] = [];
  private bindings: DomainBinding[] = [];

  async owners() { return demoOwners; }
  async owner(id: string) { return demoOwners.find((owner) => owner.id === id); }

  async create(ownerId: string, manifest: Manifest): Promise<AgentDetail> {
    if (!(await this.owner(ownerId))) throw new Error('Owner not found.');
    const now = new Date().toISOString();
    let id = generateAgentId();
    while (this.agents.some((agent) => agent.id === id)) id = generateAgentId();

    const agent: Agent = {
      id,
      canonicalName: manifest.canonicalName,
      role: manifest.role,
      purpose: manifest.purpose,
      field: manifest.field,
      ownerId,
      status: 'ACTIVE',
      canonicalDomain: null,
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    const version: Version = {
      id: randomUUID(),
      agentId: id,
      versionNumber: 1,
      versionType: 'INITIAL_MANIFEST',
      stateJson: manifest,
      changeSummary: 'Initial Agent Manifest created.',
      createdByOwnerId: ownerId,
      createdAt: now,
    };
    const event: Event = {
      id: randomUUID(),
      agentId: id,
      eventType: 'CREATE',
      actorOwnerId: ownerId,
      metadataJson: { version: '1' },
      createdAt: now,
    };

    this.agents.push(agent);
    this.versions.push(version);
    this.events.push(event);

    return { agent, owner: demoOwners.find((owner) => owner.id === ownerId)!, version, versions: [version], events: [event] };
  }

  async byOwner(ownerId: string) {
    return this.agents.filter((agent) => agent.ownerId === ownerId);
  }

  async detail(id: string): Promise<AgentDetail | undefined> {
    const agent = this.agents.find((item) => item.id === id);
    if (!agent) return undefined;
    const versions = this.versions.filter((item) => item.agentId === id).sort((a, b) => a.versionNumber - b.versionNumber);
    const version = versions.find((item) => item.versionNumber === agent.currentVersion);
    if (!version) throw new Error('Current Agent Version is missing.');

    return {
      agent,
      owner: demoOwners.find((owner) => owner.id === agent.ownerId)!,
      version,
      versions,
      events: this.events.filter((item) => item.agentId === id),
    };
  }

  async pendingBinding(agentId: string, domain?: string) {
    return this.bindings.find((binding) => binding.agentId === agentId && binding.verificationStatus === 'PENDING' && (!domain || binding.domain === domain));
  }

  async createPendingDomainBinding(agentId: string, ownerId: string, domain: string, token: string): Promise<DomainBinding> {
    const agent = this.agents.find((item) => item.id === agentId);
    if (!agent) throw new Error('Agent not found.');
    if (agent.ownerId !== ownerId) throw new Error('You are not authorized to bind this agent.');
    if (agent.canonicalDomain) throw new Error('This agent already has a verified domain.');

    this.bindings = this.bindings.filter((item) => !(item.agentId === agentId && item.verificationStatus !== 'VERIFIED'));
    const binding: DomainBinding = {
      id: randomUUID(),
      agentId,
      domain,
      verificationToken: token,
      verificationStatus: 'PENDING',
      verifiedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.bindings.push(binding);
    return binding;
  }

  async failDomainBinding(agentId: string, ownerId: string, bindingId: string): Promise<void> {
    const agent = this.agents.find((item) => item.id === agentId);
    const binding = this.bindings.find((item) => item.id === bindingId && item.agentId === agentId);
    if (!agent || agent.ownerId !== ownerId || !binding) throw new Error('Domain binding is not authorized.');
    if (binding.verificationStatus === 'PENDING') binding.verificationStatus = 'FAILED';
  }

  async completeDomainBinding(agentId: string, ownerId: string, bindingId: string): Promise<AgentDetail> {
    const agent = this.agents.find((item) => item.id === agentId);
    const binding = this.bindings.find((item) => item.id === bindingId && item.agentId === agentId);
    if (!agent || agent.ownerId !== ownerId || !binding) throw new Error('Domain binding is not authorized.');
    if (binding.verificationStatus !== 'PENDING') throw new Error('Domain binding is not pending.');
    if (this.bindings.some((item) => item.domain === binding.domain && item.verificationStatus === 'VERIFIED')) {
      throw new Error('This domain is already bound to an agent.');
    }

    const initial = this.versions.find((item) => item.agentId === agentId && item.versionNumber === 1);
    if (!initial || agent.currentVersion !== 1) throw new Error('Agent cannot enter Domain Binding from its current state.');

    const now = new Date().toISOString();
    binding.verificationStatus = 'VERIFIED';
    binding.verifiedAt = now;
    agent.canonicalDomain = binding.domain;
    agent.currentVersion = 2;
    agent.updatedAt = now;

    const version: Version = {
      id: randomUUID(),
      agentId,
      versionNumber: 2,
      versionType: 'DOMAIN_BINDING',
      stateJson: {
        ...initial.stateJson,
        canonicalDomain: binding.domain,
        domainVerificationStatus: 'VERIFIED',
        domainVerifiedAt: now,
      },
      changeSummary: `Verified canonical domain ${binding.domain}.`,
      createdByOwnerId: ownerId,
      createdAt: now,
    };
    const event: Event = {
      id: randomUUID(),
      agentId,
      eventType: 'BIND_DOMAIN',
      actorOwnerId: ownerId,
      metadataJson: { domain: binding.domain, version: '2' },
      createdAt: now,
    };

    this.versions.push(version);
    this.events.push(event);
    return (await this.detail(agentId))!;
  }

  async develop(agentId: string, ownerId: string, development: DevelopmentRecord): Promise<AgentDetail> {
    const agent = this.agents.find((item) => item.id === agentId);
    if (!agent) throw new Error('Agent not found.');
    if (agent.ownerId !== ownerId) throw new Error('You are not authorized to develop this agent.');
    if (agent.status !== 'ACTIVE') throw new Error('Only ACTIVE agents can Develop.');
    if (!agent.canonicalDomain || agent.currentVersion < 2) {
      throw new Error('A verified canonical domain is required before Develop.');
    }

    const current = this.versions.find((item) => item.agentId === agentId && item.versionNumber === agent.currentVersion);
    if (!current) throw new Error('Current Agent Version is missing.');

    const now = new Date().toISOString();
    const nextNumber = agent.currentVersion + 1;
    const history = [...(current.stateJson.developmentHistory ?? []), development];
    const version: Version = {
      id: randomUUID(),
      agentId,
      versionNumber: nextNumber,
      versionType: 'DEVELOPMENT',
      stateJson: {
        ...current.stateJson,
        developmentHistory: history,
        latestDevelopment: development,
      },
      changeSummary: development.taskSummary,
      createdByOwnerId: ownerId,
      createdAt: now,
    };
    const event: Event = {
      id: randomUUID(),
      agentId,
      eventType: 'DEVELOP',
      actorOwnerId: ownerId,
      metadataJson: { version: String(nextNumber) },
      createdAt: now,
    };

    this.versions.push(version);
    this.events.push(event);
    agent.currentVersion = nextNumber;
    agent.updatedAt = now;
    return (await this.detail(agentId))!;
  }

  async park(agentId: string, ownerId: string, reason: string): Promise<AgentDetail> {
    const agent = this.agents.find((item) => item.id === agentId);
    if (!agent) throw new Error('Agent not found.');
    if (agent.ownerId !== ownerId) throw new Error('You are not authorized to park this agent.');
    if (agent.status !== 'ACTIVE') throw new Error('Only ACTIVE agents can be parked.');
    if (!agent.canonicalDomain || agent.currentVersion < 3) {
      throw new Error('The agent must have a verified domain and developed state before Park.');
    }
    if (!this.events.some((event) => event.agentId === agentId && event.eventType === 'DEVELOP')) {
      throw new Error('At least one DEVELOP event is required before Park.');
    }

    const current = this.versions.find((item) => item.agentId === agentId && item.versionNumber === agent.currentVersion);
    if (!current) throw new Error('Current Agent Version is missing.');

    const now = new Date().toISOString();
    const nextNumber = agent.currentVersion + 1;
    const parkRecord = { reason: reason.trim(), parkedAt: now };
    const parkHistory = [...(current.stateJson.parkHistory ?? []), parkRecord];
    const version: Version = {
      id: randomUUID(),
      agentId,
      versionNumber: nextNumber,
      versionType: 'PARKED',
      stateJson: {
        ...current.stateJson,
        parkHistory,
        latestPark: parkRecord,
      },
      changeSummary: `Agent parked: ${parkRecord.reason}`,
      createdByOwnerId: ownerId,
      createdAt: now,
    };
    const event: Event = {
      id: randomUUID(),
      agentId,
      eventType: 'PARK',
      actorOwnerId: ownerId,
      metadataJson: { version: String(nextNumber) },
      createdAt: now,
    };

    this.versions.push(version);
    this.events.push(event);
    agent.status = 'PARKED';
    agent.currentVersion = nextNumber;
    agent.updatedAt = now;
    return (await this.detail(agentId))!;
  }

  async reactivate(agentId: string, ownerId: string, reason: string): Promise<AgentDetail> {
    const agent = this.agents.find((item) => item.id === agentId);
    if (!agent) throw new Error('Agent not found.');
    if (agent.ownerId !== ownerId) throw new Error('You are not authorized to reactivate this agent.');
    if (agent.status !== 'PARKED') throw new Error('Only PARKED agents can be reactivated.');
    if (!agent.canonicalDomain || agent.currentVersion < 4) {
      throw new Error('A parked, domain-bound state is required before Reactivate.');
    }
    if (!this.events.some((event) => event.agentId === agentId && event.eventType === 'PARK')) {
      throw new Error('A PARK event is required before Reactivate.');
    }

    const current = this.versions.find((item) => item.agentId === agentId && item.versionNumber === agent.currentVersion);
    if (!current) throw new Error('Current Agent Version is missing.');

    const now = new Date().toISOString();
    const nextNumber = agent.currentVersion + 1;
    const reactivationRecord = { reason: reason.trim(), reactivatedAt: now };
    const reactivationHistory = [...(current.stateJson.reactivationHistory ?? []), reactivationRecord];
    const version: Version = {
      id: randomUUID(),
      agentId,
      versionNumber: nextNumber,
      versionType: 'REACTIVATED',
      stateJson: {
        ...current.stateJson,
        reactivationHistory,
        latestReactivation: reactivationRecord,
      },
      changeSummary: `Agent reactivated: ${reactivationRecord.reason}`,
      createdByOwnerId: ownerId,
      createdAt: now,
    };
    const event: Event = {
      id: randomUUID(),
      agentId,
      eventType: 'REACTIVATE',
      actorOwnerId: ownerId,
      metadataJson: { version: String(nextNumber) },
      createdAt: now,
    };

    this.versions.push(version);
    this.events.push(event);
    agent.status = 'ACTIVE';
    agent.currentVersion = nextNumber;
    agent.updatedAt = now;
    return (await this.detail(agentId))!;
  }

  async reset() {
    this.agents = [];
    this.versions = [];
    this.events = [];
    this.bindings = [];
  }
}

export function createConfiguredRepository(): Repository {
  return storageBackend() === 'supabase' ? new SupabaseRepository() : new MemoryRepository();
}

export const repository = createConfiguredRepository();

export function publicAgent(detail: AgentDetail) {
  return {
    id: detail.agent.id,
    canonicalName: detail.agent.canonicalName,
    role: detail.agent.role,
    purpose: detail.agent.purpose,
    field: detail.agent.field,
    status: detail.agent.status,
    canonicalDomain: detail.agent.canonicalDomain,
    createdAt: detail.agent.createdAt,
    currentVersion: detail.agent.currentVersion,
    publicIdentitySummary: detail.version.stateJson.publicIdentitySummary,
    latestPublicDevelopmentSummary: detail.version.stateJson.latestDevelopment?.publicDevelopmentSummary ?? null,
    developed: detail.events.some((event) => event.eventType === 'DEVELOP'),
    parked: detail.agent.status === 'PARKED',
    reactivated: detail.events.some((event) => event.eventType === 'REACTIVATE'),
  };
}
