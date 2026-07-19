import { describe, expect, it } from 'vitest';
import { bindCurrentDomain } from '@/lib/bind-domain';
import { developAgentLifecycle } from '@/lib/develop-agent';
import { DeterministicDevelopmentService } from '@/lib/development';
import { DeterministicDomainVerificationService } from '@/lib/domain-verification';
import { parkAgentLifecycle } from '@/lib/park-agent';
import { reactivateAgentLifecycle } from '@/lib/reactivate-agent';
import { reactivateInputSchema } from '@/lib/reactivate-schema';
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

const parkReason = 'Pause the agent after completing the development cycle while preserving its full immutable state.';
const reactivateReason = 'Resume the agent from its parked checkpoint while preserving identity, domain, and complete prior history.';

async function parkedRepository() {
  const repo = new MemoryRepository();
  const created = await repo.create('owner-a', manifest);
  await bindCurrentDomain(created.agent.id, 'owner-a', 'app.example.com', {
    repository: repo,
    verifier: new DeterministicDomainVerificationService(),
  });
  await developAgentLifecycle(developmentInput, created.agent.id, 'owner-a', {
    repository: repo,
    development: new DeterministicDevelopmentService(development),
  });
  await parkAgentLifecycle({ reason: parkReason }, created.agent.id, 'owner-a', { repository: repo });
  return { repo, agentId: created.agent.id };
}

describe('Reactivate lifecycle', () => {
  it('validates a bounded reactivation reason', () => {
    expect(reactivateInputSchema.safeParse({ reason: reactivateReason }).success).toBe(true);
    expect(reactivateInputSchema.safeParse({ reason: 'short' }).success).toBe(false);
  });

  it('rejects another owner and an ACTIVE agent', async () => {
    const parked = await parkedRepository();
    await expect(reactivateAgentLifecycle({ reason: reactivateReason }, parked.agentId, 'owner-b', { repository: parked.repo })).rejects.toThrow('authorized');

    await reactivateAgentLifecycle({ reason: reactivateReason }, parked.agentId, 'owner-a', { repository: parked.repo });
    await expect(reactivateAgentLifecycle({ reason: reactivateReason }, parked.agentId, 'owner-a', { repository: parked.repo })).rejects.toThrow('PARKED');
  });

  it('creates Version 5 and one REACTIVATE event without rewriting Versions 1 through 4', async () => {
    const { repo, agentId } = await parkedRepository();
    const before = await repo.detail(agentId);
    const snapshots = structuredClone(before!.versions);

    await expect(reactivateAgentLifecycle({ reason: reactivateReason }, agentId, 'owner-a', { repository: repo })).resolves.toBe(agentId);

    const after = await repo.detail(agentId);
    expect(after?.agent).toMatchObject({ id: agentId, canonicalName: 'Atlas', ownerId: 'owner-a', canonicalDomain: 'app.example.com', status: 'ACTIVE', currentVersion: 5 });
    expect(after?.versions.slice(0, 4)).toEqual(snapshots);
    expect(after?.version.versionType).toBe('REACTIVATED');
    expect(after?.version.stateJson.developmentHistory).toEqual([development]);
    expect(after?.version.stateJson.parkHistory).toHaveLength(1);
    expect(after?.version.stateJson.latestReactivation?.reason).toBe(reactivateReason);
    expect(after?.version.stateJson.reactivationHistory).toHaveLength(1);
    expect(after?.events.filter((event) => event.eventType === 'REACTIVATE')).toHaveLength(1);
  });

  it('allows Develop again after Reactivate and continues sequential versioning', async () => {
    const { repo, agentId } = await parkedRepository();
    await reactivateAgentLifecycle({ reason: reactivateReason }, agentId, 'owner-a', { repository: repo });
    await developAgentLifecycle(developmentInput, agentId, 'owner-a', { repository: repo, development: new DeterministicDevelopmentService(development) });
    const after = await repo.detail(agentId);
    expect(after?.agent.currentVersion).toBe(6);
    expect(after?.version.versionType).toBe('DEVELOPMENT');
    expect(after?.version.stateJson.developmentHistory).toHaveLength(2);
    expect(after?.version.stateJson.parkHistory).toHaveLength(1);
    expect(after?.version.stateJson.reactivationHistory).toHaveLength(1);
  });

  it('keeps the reactivation reason out of the public projection', async () => {
    const { repo, agentId } = await parkedRepository();
    await reactivateAgentLifecycle({ reason: reactivateReason }, agentId, 'owner-a', { repository: repo });
    const safe = publicAgent((await repo.detail(agentId))!);
    expect(safe.status).toBe('ACTIVE');
    expect(safe.parked).toBe(false);
    expect(safe.reactivated).toBe(true);
    expect(JSON.stringify(safe)).not.toContain(reactivateReason);
    expect(JSON.stringify(safe)).not.toContain('owner-a');
  });

  it('derives Reactivate completion from the event trail', async () => {
    const { repo, agentId } = await parkedRepository();
    await reactivateAgentLifecycle({ reason: reactivateReason }, agentId, 'owner-a', { repository: repo });
    expect(lifecycleCompletion((await repo.detail(agentId))!.events)).toEqual({
      create: true,
      bindDomain: true,
      develop: true,
      park: true,
      reactivate: true,
      transfer: false,
      continue: false,
    });
  });
});
