import { randomUUID } from 'crypto';
import { storageBackend } from './config';
import { generateAgentId } from './id';
import { SupabaseRepository } from './supabase-repository';
import type { Agent, AgentDetail, Event, Manifest, Owner, Version } from './types';

export interface Repository {
  owners(): Promise<Owner[]>;
  owner(id: string): Promise<Owner | undefined>;
  create(ownerId: string, manifest: Manifest): Promise<AgentDetail>;
  byOwner(ownerId: string): Promise<Agent[]>;
  detail(id: string): Promise<AgentDetail | undefined>;
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

  async owners() { return demoOwners; }
  async owner(id: string) { return demoOwners.find((owner) => owner.id === id); }

  async create(ownerId: string, manifest: Manifest): Promise<AgentDetail> {
    if (!(await this.owner(ownerId))) throw new Error('Owner not found.');
    const now = new Date().toISOString();
    let id = generateAgentId();
    while (this.agents.some((agent) => agent.id === id)) id = generateAgentId();
    const agent: Agent = { id, canonicalName: manifest.canonicalName, role: manifest.role, purpose: manifest.purpose, field: manifest.field, ownerId, status: 'ACTIVE', canonicalDomain: null, currentVersion: 1, createdAt: now, updatedAt: now };
    const version: Version = { id: randomUUID(), agentId: id, versionNumber: 1, versionType: 'INITIAL_MANIFEST', stateJson: manifest, changeSummary: 'Initial Agent Manifest created.', createdByOwnerId: ownerId, createdAt: now };
    const event: Event = { id: randomUUID(), agentId: id, eventType: 'CREATE', actorOwnerId: ownerId, metadataJson: { version: '1' }, createdAt: now };
    this.agents.push(agent); this.versions.push(version); this.events.push(event);
    return { agent, owner: demoOwners.find((owner) => owner.id === ownerId)!, version, events: [event] };
  }

  async byOwner(ownerId: string) { return this.agents.filter((agent) => agent.ownerId === ownerId); }
  async detail(id: string) { const agent = this.agents.find((item) => item.id === id); if (!agent) return undefined; return { agent, owner: demoOwners.find((owner) => owner.id === agent.ownerId)!, version: this.versions.find((item) => item.agentId === id && item.versionNumber === agent.currentVersion)!, events: this.events.filter((item) => item.agentId === id) }; }
  async reset() { this.agents = []; this.versions = []; this.events = []; }
}

export function createConfiguredRepository(): Repository {
  return storageBackend() === 'supabase' ? new SupabaseRepository() : new MemoryRepository();
}

export const repository = createConfiguredRepository();

export function publicAgent(detail: AgentDetail) {
  return { id: detail.agent.id, canonicalName: detail.agent.canonicalName, role: detail.agent.role, purpose: detail.agent.purpose, field: detail.agent.field, status: detail.agent.status, canonicalDomain: detail.agent.canonicalDomain, createdAt: detail.agent.createdAt, currentVersion: detail.agent.currentVersion, publicIdentitySummary: detail.version.stateJson.publicIdentitySummary };
}
