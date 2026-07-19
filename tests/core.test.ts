import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIServiceError, type AIService } from '@/lib/ai';
import { canModifyAgent, signOwner, verifyOwner } from '@/lib/auth';
import { demoSessionSecret, storageBackend } from '@/lib/config';
import { createAgentLifecycle } from '@/lib/create-agent';
import { generateAgentId } from '@/lib/id';
import { MemoryRepository, publicAgent } from '@/lib/repository';
import { manifestSchema } from '@/lib/schema';
import { mapCreateRpcResult } from '@/lib/supabase-repository';
import type { AgentDetail, Manifest } from '@/lib/types';

const manifest: Manifest = manifestSchema.parse({
  canonicalName: 'Atlas', role: 'Research Agent', purpose: 'Conduct structured research and preserve validated methods across tasks.', field: 'Research', capabilities: ['Research'], operatingPrinciples: ['Traceability'], memorySchema: ['Sources'], transferableStateRules: ['Preserve history'], privateOwnerDataRules: ['Keep credentials private'], publicIdentitySummary: 'Atlas is a public research identity with traceable methods.',
});
const values = { agentName: 'Atlas', purpose: manifest.purpose, field: 'Research', operatingPrinciples: 'Traceability and validated methods.' };
const generateManifest = vi.fn(async (): Promise<Manifest> => manifest);
const ai: AIService = { generateManifest };

describe('Phase 1 lifecycle', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('STORAGE_BACKEND', 'memory');
    vi.stubEnv('DEMO_SESSION_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('generates readable collision-resistant IDs', () => { const ids = new Set(Array.from({ length: 500 }, generateAgentId)); expect(ids.size).toBe(500); expect([...ids][0]).toMatch(/^AC-[A-Z2-9]{7}$/); });
  it('creates an Agent, v1 and CREATE event and returns its ID', async () => { const detail = await new MemoryRepository().create('owner-a', manifest); expect(detail.agent.id).toMatch(/^AC-/); expect(detail.version.versionNumber).toBe(1); expect(detail.events[0].eventType).toBe('CREATE'); });
  it('validates before invoking AI', async () => { const generate = vi.fn(async (): Promise<Manifest> => manifest); const service: AIService = { generateManifest: generate }; await expect(createAgentLifecycle({ ...values, purpose: 'short' }, 'owner-a', { ai: service, repository: new MemoryRepository() })).rejects.toThrow(); expect(generate).not.toHaveBeenCalled(); });
  it('does not persist after AI failure', async () => { const repo = new MemoryRepository(); const failingAI: AIService = { generateManifest: async () => { throw new AIServiceError('Nope', 'api'); } }; await expect(createAgentLifecycle(values, 'owner-a', { ai: failingAI, repository: repo })).rejects.toThrow('Nope'); expect(await repo.byOwner('owner-a')).toHaveLength(0); });
  it('orchestrates creation separately from redirect concerns', async () => { await expect(createAgentLifecycle(values, 'owner-a', { ai, repository: new MemoryRepository() })).resolves.toMatch(/^AC-/); });
  it('rejects a tampered signed session', () => { expect(verifyOwner(`${signOwner('owner-a')}x`)).toBeUndefined(); });
  it('rejects another owner modifying an agent', () => { expect(canModifyAgent('owner-b', 'owner-a')).toBe(false); });
  it('does not expose owner or private manifest data publicly', () => { const detail: AgentDetail = { agent: { id: 'AC-TEST123', canonicalName: 'Atlas', role: 'Research Agent', purpose: manifest.purpose, field: 'Research', ownerId: 'owner-a', status: 'ACTIVE', canonicalDomain: null, currentVersion: 1, createdAt: '', updatedAt: '' }, owner: { id: 'owner-a', displayName: 'Owner A', slug: 'owner-a', createdAt: '' }, version: { id: 'v', agentId: 'AC-TEST123', versionNumber: 1, versionType: 'INITIAL_MANIFEST', stateJson: manifest, changeSummary: '', createdByOwnerId: 'owner-a', createdAt: '' }, versions: [{ id: 'v', agentId: 'AC-TEST123', versionNumber: 1, versionType: 'INITIAL_MANIFEST', stateJson: manifest, changeSummary: '', createdByOwnerId: 'owner-a', createdAt: '' }], events: [] }; const safe = publicAgent(detail); expect(safe).not.toHaveProperty('ownerId'); expect(safe).not.toHaveProperty('privateOwnerDataRules'); });
  it('selects only explicit storage and requires production secrets', () => {
    expect(storageBackend()).toBe('memory');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEMO_SESSION_SECRET', '');
    expect(() => demoSessionSecret()).toThrow('DEMO_SESSION_SECRET');
  });
  it('maps a Supabase RPC lifecycle result', () => { const row = { agent: { id: 'AC-1', canonical_name: 'Atlas', role: 'Research', purpose: manifest.purpose, field: 'Research', owner_id: 'owner-a', status: 'ACTIVE', canonical_domain: null, current_version: 1, created_at: '', updated_at: '' }, owner: { id: 'owner-a', display_name: 'Owner A', slug: 'owner-a', created_at: '' }, version: { id: 'v', agent_id: 'AC-1', version_number: 1, version_type: 'INITIAL_MANIFEST', state_json: manifest, change_summary: '', created_by_owner_id: 'owner-a', created_at: '' }, event: { id: 'e', agent_id: 'AC-1', event_type: 'CREATE', actor_owner_id: 'owner-a', metadata_json: {}, created_at: '' } }; expect(mapCreateRpcResult(row).agent.id).toBe('AC-1'); });
});
