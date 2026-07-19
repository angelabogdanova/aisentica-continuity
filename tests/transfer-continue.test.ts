import { describe, expect, it } from 'vitest';
import { bindCurrentDomain } from '@/lib/bind-domain';
import { continueAgentLifecycle } from '@/lib/continue-agent';
import { continueInputSchema } from '@/lib/continue-schema';
import { developAgentLifecycle } from '@/lib/develop-agent';
import { DeterministicDevelopmentService } from '@/lib/development';
import { DeterministicDomainVerificationService } from '@/lib/domain-verification';
import { parkAgentLifecycle } from '@/lib/park-agent';
import { reactivateAgentLifecycle } from '@/lib/reactivate-agent';
import { MemoryRepository, publicAgent } from '@/lib/repository';
import { acceptTransferLifecycle, initiateTransferLifecycle } from '@/lib/transfer-agent';
import { transferInputSchema } from '@/lib/transfer-schema';
import { hashTransferToken, validateTransferToken } from '@/lib/transfer-token';
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
const handoffSummary = 'Transfer Atlas with its verified domain, immutable versions, developed protocol, parked checkpoint, and reactivation history intact.';
const objective = 'Continue Atlas under Owner B by applying its inherited verification protocol to a new research task without resetting prior state.';

async function reactivatedRepository() {
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
  await reactivateAgentLifecycle({ reason: reactivateReason }, created.agent.id, 'owner-a', { repository: repo });
  return { repo, agentId: created.agent.id };
}

async function transferredRepository() {
  const { repo, agentId } = await reactivatedRepository();
  const token = await initiateTransferLifecycle({ intendedOwnerId: 'owner-b', handoffSummary }, agentId, 'owner-a', { repository: repo });
  await acceptTransferLifecycle(token, 'owner-b', { repository: repo });
  return { repo, agentId, token };
}

describe('Transfer and Continue lifecycle', () => {
  it('validates transfer, continuation, and high-entropy token inputs', () => {
    expect(transferInputSchema.safeParse({ intendedOwnerId: 'owner-b', handoffSummary }).success).toBe(true);
    expect(transferInputSchema.safeParse({ intendedOwnerId: 'owner-a', handoffSummary: 'short' }).success).toBe(false);
    expect(continueInputSchema.safeParse({ objective }).success).toBe(true);
    expect(continueInputSchema.safeParse({ objective: 'short' }).success).toBe(false);
    const token = 'A'.repeat(43);
    expect(validateTransferToken(token)).toBe(token);
    expect(hashTransferToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('allows only the current ACTIVE owner to initiate for another existing owner', async () => {
    const { repo, agentId } = await reactivatedRepository();
    await expect(initiateTransferLifecycle({ intendedOwnerId: 'owner-b', handoffSummary }, agentId, 'owner-b', { repository: repo })).rejects.toThrow('authorized');
    await expect(initiateTransferLifecycle({ intendedOwnerId: 'owner-a', handoffSummary }, agentId, 'owner-a', { repository: repo })).rejects.toThrow('different');
  });

  it('stores only a safe offer projection and requires the intended owner', async () => {
    const { repo, agentId } = await reactivatedRepository();
    const token = await initiateTransferLifecycle({ intendedOwnerId: 'owner-b', handoffSummary }, agentId, 'owner-a', { repository: repo });
    const offer = await repo.transferOffer(hashTransferToken(token));
    expect(offer).toMatchObject({ agentId, fromOwnerId: 'owner-a', intendedOwnerId: 'owner-b', fromVersion: 5 });
    expect(JSON.stringify(offer)).not.toContain(token);
    expect(JSON.stringify(offer)).not.toContain(hashTransferToken(token));
    await expect(acceptTransferLifecycle(token, 'owner-a', { repository: repo })).rejects.toThrow('another owner');
  });

  it('creates Version 6, transfers ownership once, and preserves Versions 1 through 5', async () => {
    const { repo, agentId } = await reactivatedRepository();
    const before = await repo.detail(agentId);
    const snapshots = structuredClone(before!.versions);
    const token = await initiateTransferLifecycle({ intendedOwnerId: 'owner-b', handoffSummary }, agentId, 'owner-a', { repository: repo });

    await expect(acceptTransferLifecycle(token, 'owner-b', { repository: repo })).resolves.toBe(agentId);
    const after = await repo.detail(agentId);
    expect(after?.agent).toMatchObject({ id: agentId, ownerId: 'owner-b', status: 'TRANSFERRED', currentVersion: 6, canonicalDomain: 'app.example.com' });
    expect(after?.versions.slice(0, 5)).toEqual(snapshots);
    expect(after?.version.versionType).toBe('TRANSFERRED');
    expect(after?.version.stateJson.transferHistory).toHaveLength(1);
    expect(after?.version.stateJson.latestTransfer?.handoffSummary).toBe(handoffSummary);
    expect(after?.events.filter((event) => event.eventType === 'TRANSFER')).toHaveLength(1);
    expect(await repo.byOwner('owner-a')).toHaveLength(0);
    expect((await repo.byOwner('owner-b')).map((agent) => agent.id)).toEqual([agentId]);
    await expect(acceptTransferLifecycle(token, 'owner-b', { repository: repo })).rejects.toThrow('already');
  });

  it('rejects an expired or stale offer without changing ownership', async () => {
    const expired = await reactivatedRepository();
    const rawExpired = 'E'.repeat(43);
    await expired.repo.createTransferOffer(expired.agentId, 'owner-a', 'owner-b', hashTransferToken(rawExpired), handoffSummary, new Date(Date.now() - 1000).toISOString());
    await expect(acceptTransferLifecycle(rawExpired, 'owner-b', { repository: expired.repo })).rejects.toThrow('expired');
    expect((await expired.repo.detail(expired.agentId))?.agent.ownerId).toBe('owner-a');

    const stale = await reactivatedRepository();
    const token = await initiateTransferLifecycle({ intendedOwnerId: 'owner-b', handoffSummary }, stale.agentId, 'owner-a', { repository: stale.repo });
    await developAgentLifecycle(developmentInput, stale.agentId, 'owner-a', {
      repository: stale.repo,
      development: new DeterministicDevelopmentService(development),
    });
    await expect(acceptTransferLifecycle(token, 'owner-b', { repository: stale.repo })).rejects.toThrow('stale');
    expect((await stale.repo.detail(stale.agentId))?.agent.ownerId).toBe('owner-a');
  });

  it('requires the successor owner and transferred checkpoint before Continue', async () => {
    const { repo, agentId } = await transferredRepository();
    await expect(continueAgentLifecycle({ objective }, agentId, 'owner-a', { repository: repo })).rejects.toThrow('authorized');

    const active = await reactivatedRepository();
    await expect(continueAgentLifecycle({ objective }, active.agentId, 'owner-a', { repository: active.repo })).rejects.toThrow('transferred');
  });

  it('creates Version 7 and restores ACTIVE availability without rewriting Versions 1 through 6', async () => {
    const { repo, agentId } = await transferredRepository();
    const before = await repo.detail(agentId);
    const snapshots = structuredClone(before!.versions);

    await expect(continueAgentLifecycle({ objective }, agentId, 'owner-b', { repository: repo })).resolves.toBe(agentId);
    const after = await repo.detail(agentId);
    expect(after?.agent).toMatchObject({ id: agentId, ownerId: 'owner-b', status: 'ACTIVE', currentVersion: 7, canonicalDomain: 'app.example.com' });
    expect(after?.versions.slice(0, 6)).toEqual(snapshots);
    expect(after?.version.versionType).toBe('CONTINUED');
    expect(after?.version.stateJson.continuationHistory).toHaveLength(1);
    expect(after?.version.stateJson.latestContinuation).toMatchObject({ objective, inheritedFromVersion: 6 });
    expect(after?.version.stateJson.developmentHistory).toEqual([development]);
    expect(after?.version.stateJson.parkHistory).toHaveLength(1);
    expect(after?.version.stateJson.reactivationHistory).toHaveLength(1);
    expect(after?.events.filter((event) => event.eventType === 'CONTINUE')).toHaveLength(1);
  });

  it('allows the successor owner to Develop after Continue', async () => {
    const { repo, agentId } = await transferredRepository();
    await continueAgentLifecycle({ objective }, agentId, 'owner-b', { repository: repo });
    await developAgentLifecycle(developmentInput, agentId, 'owner-b', {
      repository: repo,
      development: new DeterministicDevelopmentService(development),
    });
    expect((await repo.detail(agentId))?.agent.currentVersion).toBe(8);
  });

  it('keeps tokens, owner IDs, handoff summary, and continuation objective out of public projection', async () => {
    const { repo, agentId, token } = await transferredRepository();
    await continueAgentLifecycle({ objective }, agentId, 'owner-b', { repository: repo });
    const safe = publicAgent((await repo.detail(agentId))!);
    const json = JSON.stringify(safe);
    expect(safe).toMatchObject({ status: 'ACTIVE', transferred: true, continued: true });
    expect(safe.latestPublicContinuationSummary).toContain('same Agent continued');
    expect(json).not.toContain(token);
    expect(json).not.toContain('owner-a');
    expect(json).not.toContain('owner-b');
    expect(json).not.toContain(handoffSummary);
    expect(json).not.toContain(objective);
  });

  it('marks every canonical lifecycle stage complete from the event trail', async () => {
    const { repo, agentId } = await transferredRepository();
    await continueAgentLifecycle({ objective }, agentId, 'owner-b', { repository: repo });
    expect(lifecycleCompletion((await repo.detail(agentId))!.events)).toEqual({
      create: true,
      bindDomain: true,
      develop: true,
      park: true,
      reactivate: true,
      transfer: true,
      continue: true,
    });
  });
});
