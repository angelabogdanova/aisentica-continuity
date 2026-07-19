import { createClient } from '@supabase/supabase-js';
import { assertSupabaseConfiguration } from './config';
import { generateAgentId } from './id';
import type { Repository } from './repository';
import type { Agent, AgentDetail, DevelopmentRecord, DomainBinding, Event, Manifest, Owner, TransferOffer, Version, VersionState } from './types';

type Row = Record<string, unknown>;
type DatabaseError = { code?: string; message: string } | null;
type QueryResult = { data: unknown; error: DatabaseError };

type QueryBuilder = {
  select(columns: string): QueryBuilder;
  order(column: string, options?: { ascending: boolean }): PromiseLike<QueryResult>;
  eq(column: string, value: string): QueryBuilder;
  maybeSingle(): PromiseLike<QueryResult>;
  delete(): QueryBuilder;
  neq(column: string, value: string): PromiseLike<QueryResult>;
};

type SupabaseDataClient = {
  from(table: string): QueryBuilder;
  rpc(name: string, args: Record<string, unknown>): PromiseLike<QueryResult>;
};

function asRow(value: unknown, context: string): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Supabase returned an invalid ${context} record.`);
  return value as Row;
}

function asRows(value: unknown, context: string): Row[] {
  if (!Array.isArray(value)) throw new Error(`Supabase returned invalid ${context} records.`);
  return value.map((item) => asRow(item, context));
}

function mapOwner(row: Row): Owner {
  return { id: row.id as string, displayName: row.display_name as string, slug: row.slug as string, createdAt: row.created_at as string };
}

function mapAgent(row: Row): Agent {
  return {
    id: row.id as string,
    canonicalName: row.canonical_name as string,
    role: row.role as string,
    purpose: row.purpose as string,
    field: row.field as string,
    ownerId: row.owner_id as string,
    status: row.status as Agent['status'],
    canonicalDomain: row.canonical_domain as string | null,
    currentVersion: row.current_version as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapVersion(row: Row): Version {
  return {
    id: row.id as string,
    agentId: row.agent_id as string,
    versionNumber: row.version_number as number,
    versionType: row.version_type as Version['versionType'],
    stateJson: row.state_json as VersionState,
    changeSummary: row.change_summary as string,
    createdByOwnerId: row.created_by_owner_id as string,
    createdAt: row.created_at as string,
  };
}

function mapEvent(row: Row): Event {
  return {
    id: row.id as string,
    agentId: row.agent_id as string,
    eventType: row.event_type as Event['eventType'],
    actorOwnerId: row.actor_owner_id as string,
    metadataJson: row.metadata_json as Record<string, string>,
    createdAt: row.created_at as string,
  };
}

function mapBinding(row: Row): DomainBinding {
  return {
    id: row.id as string,
    agentId: row.agent_id as string,
    domain: row.domain as string,
    verificationToken: row.verification_token as string,
    verificationStatus: row.verification_status as DomainBinding['verificationStatus'],
    verifiedAt: row.verified_at as string | null,
    createdAt: row.created_at as string,
  };
}

function mapTransferOffer(row: Row): TransferOffer {
  return {
    id: row.id as string,
    agentId: row.agent_id as string,
    fromOwnerId: row.from_owner_id as string,
    intendedOwnerId: row.intended_owner_id as string,
    fromVersion: row.from_version as number,
    handoffSummary: row.handoff_summary as string,
    expiresAt: row.expires_at as string,
    acceptedAt: row.accepted_at as string | null,
    createdAt: row.created_at as string,
  };
}

export function mapDomainBindingRpcResult(value: unknown): DomainBinding {
  return mapBinding(asRow(value, 'Domain Binding RPC'));
}

export function mapDomainCompletionRpcResult(value: unknown): AgentDetail {
  return mapCreateRpcResult(value);
}

export function mapCreateRpcResult(value: unknown): AgentDetail {
  const row = asRow(value, 'Create RPC');
  const version = mapVersion(asRow(row.version, 'Agent Version'));
  return {
    agent: mapAgent(asRow(row.agent, 'Agent')),
    owner: mapOwner(asRow(row.owner, 'Owner')),
    version,
    versions: [version],
    events: [mapEvent(asRow(row.event, 'Agent Event'))],
  };
}

export class SupabaseRepository implements Repository {
  private readonly client: SupabaseDataClient;

  constructor(client?: SupabaseDataClient) {
    if (client) this.client = client;
    else {
      assertSupabaseConfiguration();
      this.client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as unknown as SupabaseDataClient;
    }
  }

  async owners(): Promise<Owner[]> {
    const { data, error } = await this.client.from('demo_owners').select('*').order('slug');
    if (error) throw error;
    return asRows(data ?? [], 'Demo Owner').map(mapOwner);
  }

  async owner(id: string): Promise<Owner | undefined> {
    const { data, error } = await this.client.from('demo_owners').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapOwner(asRow(data, 'Demo Owner')) : undefined;
  }

  async create(ownerId: string, manifest: Manifest): Promise<AgentDetail> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await this.client.rpc('create_agent_with_initial_state', { p_agent_id: generateAgentId(), p_owner_id: ownerId, p_manifest: manifest });
      if (!error && data) return mapCreateRpcResult(data);
      if (error?.code === '23505' && attempt < 2) continue;
      throw new Error(error?.code === 'P0001' ? error.message : `Unable to persist agent: ${error?.message ?? 'empty RPC response'}`);
    }
    throw new Error('Unable to allocate a unique Agent ID.');
  }

  async byOwner(ownerId: string): Promise<Agent[]> {
    const { data, error } = await this.client.from('agents').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false });
    if (error) throw error;
    return asRows(data ?? [], 'Agent').map(mapAgent);
  }

  async detail(id: string): Promise<AgentDetail | undefined> {
    const { data, error } = await this.client.from('agents').select('*, demo_owners(*), agent_versions(*), agent_events(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;

    const record = asRow(data, 'Agent');
    const versions = asRows(record.agent_versions, 'Agent Version').map(mapVersion).sort((a, b) => a.versionNumber - b.versionNumber);
    const version = versions.find((item) => item.versionNumber === record.current_version);
    if (!version) throw new Error('Current Agent Version is missing.');

    return {
      agent: mapAgent(record),
      owner: mapOwner(asRow(record.demo_owners, 'Demo Owner')),
      version,
      versions,
      events: asRows(record.agent_events, 'Agent Event').map(mapEvent).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  }

  async pendingBinding(agentId: string, domain?: string): Promise<DomainBinding | undefined> {
    let query = this.client.from('domain_bindings').select('*').eq('agent_id', agentId).eq('verification_status', 'PENDING');
    if (domain) query = query.eq('domain', domain);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? mapBinding(asRow(data, 'Domain Binding')) : undefined;
  }

  async createPendingDomainBinding(agentId: string, ownerId: string, domain: string, token: string): Promise<DomainBinding> {
    const { data, error } = await this.client.rpc('create_pending_domain_binding', { p_agent_id: agentId, p_owner_id: ownerId, p_domain: domain, p_verification_token: token });
    if (error || !data) throw new Error(error?.message ?? 'Unable to create a pending domain binding.');
    return mapDomainBindingRpcResult(data);
  }

  async failDomainBinding(agentId: string, ownerId: string, bindingId: string): Promise<void> {
    const { error } = await this.client.rpc('fail_domain_binding', { p_agent_id: agentId, p_owner_id: ownerId, p_binding_id: bindingId });
    if (error) throw new Error(error.message);
  }

  async completeDomainBinding(agentId: string, ownerId: string, bindingId: string): Promise<AgentDetail> {
    const { data, error } = await this.client.rpc('complete_domain_binding', { p_agent_id: agentId, p_owner_id: ownerId, p_binding_id: bindingId });
    if (error || !data) throw new Error(error?.message ?? 'Unable to complete domain binding.');
    return mapDomainCompletionRpcResult(data);
  }

  async develop(agentId: string, ownerId: string, development: DevelopmentRecord): Promise<AgentDetail> {
    const { data, error } = await this.client.rpc('develop_agent', { p_agent_id: agentId, p_owner_id: ownerId, p_development: development });
    if (error || !data) throw new Error(error?.message ?? 'Unable to persist Agent development.');
    return mapDomainCompletionRpcResult(data);
  }

  async park(agentId: string, ownerId: string, reason: string): Promise<AgentDetail> {
    const { data, error } = await this.client.rpc('park_agent', { p_agent_id: agentId, p_owner_id: ownerId, p_reason: reason });
    if (error || !data) throw new Error(error?.message ?? 'Unable to park Agent.');
    return mapDomainCompletionRpcResult(data);
  }

  async reactivate(agentId: string, ownerId: string, reason: string): Promise<AgentDetail> {
    const { data, error } = await this.client.rpc('reactivate_agent', { p_agent_id: agentId, p_owner_id: ownerId, p_reason: reason });
    if (error || !data) throw new Error(error?.message ?? 'Unable to reactivate Agent.');
    return mapDomainCompletionRpcResult(data);
  }

  async createTransferOffer(agentId: string, fromOwnerId: string, intendedOwnerId: string, tokenHash: string, handoffSummary: string, expiresAt: string): Promise<TransferOffer> {
    const { data, error } = await this.client.rpc('create_transfer_offer', {
      p_agent_id: agentId,
      p_from_owner_id: fromOwnerId,
      p_intended_owner_id: intendedOwnerId,
      p_token_hash: tokenHash,
      p_handoff_summary: handoffSummary,
      p_expires_at: expiresAt,
    });
    if (error || !data) throw new Error(error?.message ?? 'Unable to create transfer offer.');
    return mapTransferOffer(asRow(data, 'Transfer Offer RPC'));
  }

  async transferOffer(tokenHash: string): Promise<TransferOffer | undefined> {
    const { data, error } = await this.client.from('transfer_tokens').select('*').eq('token_hash', tokenHash).maybeSingle();
    if (error) throw error;
    return data ? mapTransferOffer(asRow(data, 'Transfer Offer')) : undefined;
  }

  async acceptTransfer(tokenHash: string, intendedOwnerId: string): Promise<AgentDetail> {
    const { data, error } = await this.client.rpc('accept_agent_transfer', { p_token_hash: tokenHash, p_intended_owner_id: intendedOwnerId });
    if (error || !data) throw new Error(error?.message ?? 'Unable to accept Agent transfer.');
    return mapDomainCompletionRpcResult(data);
  }

  async continueAgent(agentId: string, ownerId: string, objective: string): Promise<AgentDetail> {
    const { data, error } = await this.client.rpc('continue_agent', { p_agent_id: agentId, p_owner_id: ownerId, p_objective: objective });
    if (error || !data) throw new Error(error?.message ?? 'Unable to continue Agent.');
    return mapDomainCompletionRpcResult(data);
  }

  async reset(): Promise<void> {
    const { error } = await this.client.from('agents').delete().neq('id', '');
    if (error) throw error;
  }
}
