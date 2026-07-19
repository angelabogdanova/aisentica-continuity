'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { aiService } from '@/lib/ai';
import { requireOwner, sessionCookieName, signOwner } from '@/lib/auth';
import { createAgentLifecycle } from '@/lib/create-agent';
import { repository } from '@/lib/repository';
import { bindCurrentDomain } from '@/lib/bind-domain';
import { SameOriginHttpsDomainVerificationService } from '@/lib/domain-verification';
import { developAgentLifecycle } from '@/lib/develop-agent';
import { developmentService } from '@/lib/development';
import { parkAgentLifecycle } from '@/lib/park-agent';
import { reactivateAgentLifecycle } from '@/lib/reactivate-agent';
import { acceptTransferLifecycle, initiateTransferLifecycle } from '@/lib/transfer-agent';
import { continueAgentLifecycle } from '@/lib/continue-agent';
import { storageBackend } from '@/lib/config';

function safeReturnPath(value: FormDataEntryValue | null): string {
  const path = typeof value === 'string' ? value : '';
  return path.startsWith('/transfer/') && !path.startsWith('//') ? path : '/dashboard';
}

export type CreateState = { error?: string };

export async function selectOwner(formData: FormData) {
  const ownerId = String(formData.get('ownerId'));
  if (!(await repository.owner(ownerId))) return;
  (await cookies()).set(sessionCookieName, signOwner(ownerId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  redirect(safeReturnPath(formData.get('returnTo')));
}

export async function resetDemo() {
  await requireOwner();
  if (storageBackend() !== 'memory') throw new Error('Production demo reset is disabled.');
  await repository.reset();
  redirect('/dashboard');
}

export async function createAgent(_previous: CreateState, formData: FormData): Promise<CreateState> {
  let agentId: string;
  try {
    const owner = await requireOwner();
    agentId = await createAgentLifecycle(Object.fromEntries(formData), owner.id, { ai: aiService, repository });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to create the agent.' };
  }
  redirect(`/agents/${agentId}`);
}

export type BindDomainState = { error?: string };

export async function bindDomain(_previous: BindDomainState, formData: FormData): Promise<BindDomainState> {
  let agentId: string;
  try {
    const owner = await requireOwner();
    const requestHeaders = await headers();
    agentId = String(formData.get('agentId'));
    await bindCurrentDomain(agentId, owner.id, requestHeaders.get('host'), {
      repository,
      verifier: new SameOriginHttpsDomainVerificationService(fetch, requestHeaders.get('cookie') ?? undefined),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Domain verification failed.' };
  }
  redirect(`/agents/${agentId}`);
}

export type DevelopState = { error?: string };

export async function developAgent(_previous: DevelopState, formData: FormData): Promise<DevelopState> {
  let agentId: string;
  try {
    const owner = await requireOwner();
    agentId = String(formData.get('agentId'));
    await developAgentLifecycle(
      { task: formData.get('task'), contextAndEvidence: formData.get('contextAndEvidence'), successCriteria: formData.get('successCriteria') },
      agentId,
      owner.id,
      { repository, development: developmentService },
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to develop the Agent.' };
  }
  redirect(`/agents/${agentId}`);
}

export type ParkState = { error?: string };

export async function parkAgent(_previous: ParkState, formData: FormData): Promise<ParkState> {
  let agentId: string;
  try {
    const owner = await requireOwner();
    agentId = String(formData.get('agentId'));
    await parkAgentLifecycle({ reason: formData.get('reason') }, agentId, owner.id, { repository });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to park the Agent.' };
  }
  redirect(`/agents/${agentId}`);
}

export type ReactivateState = { error?: string };

export async function reactivateAgent(_previous: ReactivateState, formData: FormData): Promise<ReactivateState> {
  let agentId: string;
  try {
    const owner = await requireOwner();
    agentId = String(formData.get('agentId'));
    await reactivateAgentLifecycle({ reason: formData.get('reactivationReason') }, agentId, owner.id, { repository });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to reactivate the Agent.' };
  }
  redirect(`/agents/${agentId}`);
}

export type TransferState = { error?: string };

export async function initiateAgentTransfer(_previous: TransferState, formData: FormData): Promise<TransferState> {
  let token: string;
  try {
    const owner = await requireOwner();
    token = await initiateTransferLifecycle(
      { intendedOwnerId: formData.get('intendedOwnerId'), handoffSummary: formData.get('handoffSummary') },
      String(formData.get('agentId')),
      owner.id,
      { repository },
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to create the transfer offer.' };
  }
  redirect(`/transfer/${token}`);
}

export type AcceptTransferState = { error?: string };

export async function acceptAgentTransfer(_previous: AcceptTransferState, formData: FormData): Promise<AcceptTransferState> {
  let agentId: string;
  try {
    const owner = await requireOwner();
    agentId = await acceptTransferLifecycle(String(formData.get('token')), owner.id, { repository });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to accept the transfer.' };
  }
  redirect(`/agents/${agentId}`);
}

export type ContinueState = { error?: string };

export async function continueAgent(_previous: ContinueState, formData: FormData): Promise<ContinueState> {
  let agentId: string;
  try {
    const owner = await requireOwner();
    agentId = String(formData.get('agentId'));
    await continueAgentLifecycle({ objective: formData.get('objective') }, agentId, owner.id, { repository });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to continue the Agent.' };
  }
  redirect(`/agents/${agentId}`);
}
