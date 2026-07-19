import { describe, expect, it, vi } from 'vitest';
import { bindCurrentDomain } from '@/lib/bind-domain';
import { developAgentLifecycle } from '@/lib/develop-agent';
import { DeterministicDevelopmentService } from '@/lib/development';
import { DeterministicDomainVerificationService } from '@/lib/domain-verification';
import { parkAgentLifecycle } from '@/lib/park-agent';
import { parkInputSchema } from '@/lib/park-schema';
import { MemoryRepository, publicAgent } from '@/lib/repository';
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

const developmentInput = {
  task: 'Create a compact source-verification protocol for historical claims.',
  contextAndEvidence: 'Primary documents, scholarship, metadata, and translations may conflict or omit provenance.',
  successCriteria: 'Separate facts, inferences, unresolved questions, and follow-up checks.',
};

const development: DevelopmentRecord = {
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

const reason = 'Pause the agent after completing the development cycle while preserving its full immutable state.';

async function boundRepository() {
  const repo = new MemoryRepository();
  const created = await repo.create('owner-a', manifest);
  await bindCurrentDomain(created.agent.id, 'owner-a', 'app.example.com', {
    repository: repo,
    verifier: new DeterministicDomainVerificationService(),
  });
  return { repo, agentId: created.agent.id };
}

async function developedRepository() {
  const { repo, agentId } = await boundRepository();
  await developAgentLifecycle(developmentInput, agentId, 'owner-a', {
    repository: repo,
    development: new DeterministicDevelopmentService(development),
  });
  return { repo, agentId };
}

describe('Park lifecycle', () => {
  it('validates a bounded parking reason', () => {
    expect(parkInputSchema.safeParse({ reason }).success).toBe(true);
    expect(parkInputSchema.safeParse({ reason: 'short' }).success).toBe(false);
  });

  it('rejects another owner and agents without developed state', async () => {
    const developed = await developedRepository();
    await expect(parkAgentLifecycle({ reason }, developed.agentId, 'owner-b', { repository: developed.repo })).rejects.toThrow('authorized');

    const bound = await boundRepository();
    await expect(parkAgentLifecycle({ reason }, bound.agentId, 'owner-a', { repository: bound.repo })).rejects.toThrow('developed state');
  });

  it('creates Version 4 and one PARK event without rewriting prior history', async () => {
    const { repo, agentId } = await developedRepository();
    const before = await repo.detail(agentId);
    const snapshots = structuredClone(before!.versions);

    await expect(parkAgentLifecycle({ reason }, agentId, 'owner-a', { repository: repo })).resolves.toBe(agentId);

    const after = await repo.detail(agentId);
    expect(after?.agent).toMatchObject({
      id: agentId,
      canonicalName: 'Atlas',
      ownerId: 'owner-a',
      canonicalDomain: 'app.example.com',
      status: 'PARKED',
      currentVersion: 4,
    });
    expect(after?.versions.slice(0, 3)).toEqual(snapshots);
    expect(after?.version.versionType).toBe('PARKED');
    expect(after?.version.stateJson.developmentHistory).toEqual([development]);
    expect(after?.version.stateJson.latestPark?.reason).toBe(reason);
    expect(after?.version.stateJson.parkHistory).toHaveLength(1);
    expect(after?.events.filter((event) => event.eventType === 'PARK')).toHaveLength(1);
  });

  it('does not permit duplicate Park or Develop while parked', async () => {
    const { repo, agentId } = await developedRepository();
    await parkAgentLifecycle({ reason }, agentId, 'owner-a', { repository: repo });
    const before = await repo.detail(agentId);

    await expect(parkAgentLifecycle({ reason }, agentId, 'owner-a', { repository: repo })).rejects.toThrow('ACTIVE');

    const develop = vi.fn(async () => development);
    await expect(developAgentLifecycle(developmentInput, agentId, 'owner-a', {
      repository: repo,
      development: { develop },
    })).rejects.toThrow('ACTIVE');
    expect(develop).not.toHaveBeenCalled();

    const after = await repo.detail(agentId);
    expect(after?.versions).toHaveLength(before?.versions.length ?? 0);
    expect(after?.events.filter((event) => event.eventType === 'PARK')).toHaveLength(1);
  });

  it('keeps the parking reason out of the public projection', async () => {
    const { repo, agentId } = await developedRepository();
    await parkAgentLifecycle({ reason }, agentId, 'owner-a', { repository: repo });
    const safe = publicAgent((await repo.detail(agentId))!);
    expect(safe.status).toBe('PARKED');
    expect(safe.parked).toBe(true);
    expect(JSON.stringify(safe)).not.toContain(reason);
    expect(JSON.stringify(safe)).not.toContain('owner-a');
  });

  it('derives Park completion from the event trail', async () => {
    const { repo, agentId } = await developedRepository();
    await parkAgentLifecycle({ reason }, agentId, 'owner-a', { repository: repo });
    expect(lifecycleCompletion((await repo.detail(agentId))!.events)).toEqual({
      create: true,
      bindDomain: true,
      develop: true,
      park: true,
      reactivate: false,
    });
  });
});
