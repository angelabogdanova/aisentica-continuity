import { describe, expect, it, vi } from 'vitest';
import { bindCurrentDomain } from '@/lib/bind-domain';
import { developAgentLifecycle } from '@/lib/develop-agent';
import { DeterministicDevelopmentService, type DevelopmentService } from '@/lib/development';
import { developmentInputSchema } from '@/lib/development-schema';
import { DeterministicDomainVerificationService } from '@/lib/domain-verification';
import { MemoryRepository, publicAgent } from '@/lib/repository';
import { mapDomainCompletionRpcResult } from '@/lib/supabase-repository';
import { lifecycleCompletion } from '@/components/lifecycle';
import type { DevelopmentRecord, Manifest } from '@/lib/types';

const manifest: Manifest = {
  canonicalName: 'Atlas',
  role: 'Research Agent',
  purpose: 'Conduct structured research and preserve validated methods across tasks.',
  field: 'Research',
  capabilities: ['Research'],
  operatingPrinciples: ['Traceability'],
  memorySchema: ['Sources'],
  transferableStateRules: ['Preserve history'],
  privateOwnerDataRules: ['Keep credentials private'],
  publicIdentitySummary: 'Atlas is a public research identity with traceable methods.',
};

const input = {
  task: 'Create a compact source-verification protocol for historical claims.',
  contextAndEvidence: 'Primary documents, scholarship, metadata, and translations may conflict or omit provenance.',
  successCriteria: 'Separate facts, inferences, unresolved questions, and follow-up checks.',
};

const record: DevelopmentRecord = {
  taskSummary: 'Develop a source-verification protocol.',
  workResult: 'Classify claims, record provenance, compare evidence, label inference, and log follow-up checks.',
  validatedKnowledge: [],
  reusableMethods: ['Separate facts from inference.'],
  evidenceAssessment: ['The supplied context was not externally verified.'],
  corrections: [],
  openQuestions: ['Which primary records are available?'],
  limitations: ['No external verification was performed.'],
  confidenceStatement: 'High confidence in the method, not in any unstated historical claim.',
  publicDevelopmentSummary: 'Developed a reusable source-verification method.',
};

async function boundRepository() {
  const repo = new MemoryRepository();
  const created = await repo.create('owner-a', manifest);
  await bindCurrentDomain(created.agent.id, 'owner-a', 'app.example.com', {
    repository: repo,
    verifier: new DeterministicDomainVerificationService(),
  });
  return { repo, agentId: created.agent.id };
}

describe('Develop lifecycle', () => {
  it('validates bounded owner input', () => {
    expect(developmentInputSchema.safeParse(input).success).toBe(true);
    expect(developmentInputSchema.safeParse({ ...input, task: 'short' }).success).toBe(false);
  });

  it('does not call GPT for invalid input', async () => {
    const { repo, agentId } = await boundRepository();
    const develop = vi.fn(async () => record);
    await expect(developAgentLifecycle({ ...input, task: 'short' }, agentId, 'owner-a', { repository: repo, development: { develop } })).rejects.toThrow();
    expect(develop).not.toHaveBeenCalled();
  });

  it('creates no state after GPT failure', async () => {
    const { repo, agentId } = await boundRepository();
    const before = await repo.detail(agentId);
    await expect(developAgentLifecycle(input, agentId, 'owner-a', {
      repository: repo,
      development: new DeterministicDevelopmentService(undefined, new Error('GPT failed')),
    })).rejects.toThrow('GPT failed');
    const after = await repo.detail(agentId);
    expect(after?.versions).toHaveLength(before?.versions.length ?? 0);
    expect(after?.events).toHaveLength(before?.events.length ?? 0);
  });

  it('rejects malformed structured output', async () => {
    const { repo, agentId } = await boundRepository();
    const malformed: DevelopmentService = { develop: async () => ({ taskSummary: 'bad' } as unknown as DevelopmentRecord) };
    await expect(developAgentLifecycle(input, agentId, 'owner-a', { repository: repo, development: malformed })).rejects.toThrow();
    expect((await repo.detail(agentId))?.agent.currentVersion).toBe(2);
  });

  it('rejects another owner, unbound agents, and non-ACTIVE agents before GPT', async () => {
    const { repo, agentId } = await boundRepository();
    const service = new DeterministicDevelopmentService(record);
    await expect(developAgentLifecycle(input, agentId, 'owner-b', { repository: repo, development: service })).rejects.toThrow('authorized');

    const unbound = await repo.create('owner-a', { ...manifest, canonicalName: 'Beacon' });
    await expect(developAgentLifecycle(input, unbound.agent.id, 'owner-a', { repository: repo, development: service })).rejects.toThrow('verified');

    const detail = await repo.detail(agentId);
    detail!.agent.status = 'PARKED';
    await expect(developAgentLifecycle(input, agentId, 'owner-a', { repository: repo, development: service })).rejects.toThrow('ACTIVE');
  });

  it('creates Version 3 and one DEVELOP event without changing identity or prior versions', async () => {
    const { repo, agentId } = await boundRepository();
    const before = await repo.detail(agentId);
    const snapshots = structuredClone(before!.versions);

    await expect(developAgentLifecycle(input, agentId, 'owner-a', {
      repository: repo,
      development: new DeterministicDevelopmentService(record),
    })).resolves.toBe(agentId);

    const after = await repo.detail(agentId);
    expect(after?.agent).toMatchObject({
      id: agentId,
      canonicalName: 'Atlas',
      ownerId: 'owner-a',
      canonicalDomain: 'app.example.com',
      currentVersion: 3,
    });
    expect(after?.versions.slice(0, 2)).toEqual(snapshots);
    expect(after?.version.versionType).toBe('DEVELOPMENT');
    expect(after?.version.stateJson.capabilities).toEqual(manifest.capabilities);
    expect(after?.version.stateJson.developmentHistory).toEqual([record]);
    expect(after?.events.filter((event) => event.eventType === 'DEVELOP')).toHaveLength(1);
  });

  it('appends repeated development at sequential versions', async () => {
    const { repo, agentId } = await boundRepository();
    const service = new DeterministicDevelopmentService(record);
    await developAgentLifecycle(input, agentId, 'owner-a', { repository: repo, development: service });
    await developAgentLifecycle(input, agentId, 'owner-a', { repository: repo, development: service });
    const after = await repo.detail(agentId);
    expect(after?.agent.currentVersion).toBe(4);
    expect(after?.versions.map((version) => version.versionNumber)).toEqual([1, 2, 3, 4]);
    expect(after?.version.stateJson.developmentHistory).toHaveLength(2);
    expect(after?.events.filter((event) => event.eventType === 'DEVELOP')).toHaveLength(2);
  });

  it('projects only safe public development state', async () => {
    const { repo, agentId } = await boundRepository();
    await developAgentLifecycle(input, agentId, 'owner-a', {
      repository: repo,
      development: new DeterministicDevelopmentService(record),
    });
    const safe = publicAgent((await repo.detail(agentId))!);
    expect(safe.latestPublicDevelopmentSummary).toBe(record.publicDevelopmentSummary);
    const json = JSON.stringify(safe);
    expect(json).not.toContain(input.task);
    expect(json).not.toContain(input.contextAndEvidence);
    expect(json).not.toContain('privateOwnerDataRules');
    expect(json).not.toContain('owner-a');
  });

  it('maps a Supabase DEVELOPMENT RPC result to the shared contract', () => {
    const mapped = mapDomainCompletionRpcResult({
      agent: { id: 'AC-TEST', canonical_name: 'Atlas', role: 'Research Agent', purpose: manifest.purpose, field: 'Research', owner_id: 'owner-a', status: 'ACTIVE', canonical_domain: 'app.example.com', current_version: 3, created_at: '', updated_at: '' },
      owner: { id: 'owner-a', display_name: 'Owner A', slug: 'owner-a', created_at: '' },
      version: { id: 'v3', agent_id: 'AC-TEST', version_number: 3, version_type: 'DEVELOPMENT', state_json: { ...manifest, canonicalDomain: 'app.example.com', developmentHistory: [record], latestDevelopment: record }, change_summary: record.taskSummary, created_by_owner_id: 'owner-a', created_at: '' },
      event: { id: 'event', agent_id: 'AC-TEST', event_type: 'DEVELOP', actor_owner_id: 'owner-a', metadata_json: { version: '3' }, created_at: '' },
    });
    expect(mapped.version.versionType).toBe('DEVELOPMENT');
    expect(mapped.version.stateJson.latestDevelopment).toEqual(record);
  });

  it('derives lifecycle completion from events rather than version number', async () => {
    const { repo, agentId } = await boundRepository();
    await developAgentLifecycle(input, agentId, 'owner-a', {
      repository: repo,
      development: new DeterministicDevelopmentService(record),
    });
    expect(lifecycleCompletion((await repo.detail(agentId))!.events)).toEqual({ create: true, bindDomain: true, develop: true, park: false });
  });
});
