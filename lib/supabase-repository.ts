import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertSupabaseConfiguration } from './config';
import { generateAgentId } from './id';
import type { Repository } from './repository';
import type { Agent, AgentDetail, Event, Manifest, Owner, Version } from './types';

type Row = Record<string, unknown>;
type RpcClient = Pick<SupabaseClient, 'from' | 'rpc'>;

function mapOwner(row: Row): Owner { return { id: row.id as string, displayName: row.display_name as string, slug: row.slug as string, createdAt: row.created_at as string }; }
function mapAgent(row: Row): Agent { return { id: row.id as string, canonicalName: row.canonical_name as string, role: row.role as string, purpose: row.purpose as string, field: row.field as string, ownerId: row.owner_id as string, status: row.status as 'ACTIVE', canonicalDomain: row.canonical_domain as string | null, currentVersion: row.current_version as number, createdAt: row.created_at as string, updatedAt: row.updated_at as string }; }
function mapVersion(row: Row): Version { return { id: row.id as string, agentId: row.agent_id as string, versionNumber: row.version_number as number, versionType: row.version_type as 'INITIAL_MANIFEST', stateJson: row.state_json as Manifest, changeSummary: row.change_summary as string, createdByOwnerId: row.created_by_owner_id as string, createdAt: row.created_at as string }; }
function mapEvent(row: Row): Event { return { id: row.id as string, agentId: row.agent_id as string, eventType: row.event_type as 'CREATE', actorOwnerId: row.actor_owner_id as string, metadataJson: row.metadata_json as Record<string, string>, createdAt: row.created_at as string }; }

export function mapCreateRpcResult(row: Row): AgentDetail {
  return { agent: mapAgent(row.agent as Row), owner: mapOwner(row.owner as Row), version: mapVersion(row.version as Row), events: [mapEvent(row.event as Row)] };
}

export class SupabaseRepository implements Repository {
  private readonly client: RpcClient;

  constructor(client?: RpcClient) {
    if (client) this.client = client;
    else {
      assertSupabaseConfiguration();
      this.client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    }
  }

  async owners() { const { data, error } = await this.client.from('demo_owners').select('*').order('slug'); if (error) throw error; return (data ?? []).map(mapOwner); }
  async owner(id: string) { const { data, error } = await this.client.from('demo_owners').select('*').eq('id', id).maybeSingle(); if (error) throw error; return data ? mapOwner(data) : undefined; }

  async create(ownerId: string, manifest: Manifest): Promise<AgentDetail> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await this.client.rpc('create_agent_with_initial_state', { p_agent_id: generateAgentId(), p_owner_id: ownerId, p_manifest: manifest });
      if (!error && data) return mapCreateRpcResult(data as Row);
      if (error?.code === '23505' && attempt < 2) continue;
      throw new Error(error?.code === 'P0001' ? error.message : `Unable to persist agent: ${error?.message ?? 'empty RPC response'}`);
    }
    throw new Error('Unable to allocate a unique Agent ID.');
  }

  async byOwner(ownerId: string) { const { data, error } = await this.client.from('agents').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }); if (error) throw error; return (data ?? []).map(mapAgent); }
  async detail(id: string): Promise<AgentDetail | undefined> { const { data, error } = await this.client.from('agents').select('*, demo_owners(*), agent_versions(*), agent_events(*)').eq('id', id).maybeSingle(); if (error) throw error; if (!data) return undefined; const version = (data.agent_versions as Row[]).find((item) => item.version_number === data.current_version); if (!version) throw new Error('Current Agent Version is missing.'); return { agent: mapAgent(data), owner: mapOwner(data.demo_owners as Row), version: mapVersion(version), events: (data.agent_events as Row[]).map(mapEvent) }; }
  async reset() { const { error } = await this.client.from('agents').delete().neq('id', ''); if (error) throw error; }
}
