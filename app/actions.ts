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
  redirect('/dashboard');
}

export async function resetDemo() {
  await requireOwner();
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
    agentId = String(formData.get('agentId'));
    await bindCurrentDomain(agentId, owner.id, (await headers()).get('host'), {
      repository,
      verifier: new SameOriginHttpsDomainVerificationService(),
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
      {
        task: formData.get('task'),
        contextAndEvidence: formData.get('contextAndEvidence'),
        successCriteria: formData.get('successCriteria'),
      },
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
    await parkAgentLifecycle(
      { reason: formData.get('reason') },
      agentId,
      owner.id,
      { repository },
    );
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
    await reactivateAgentLifecycle(
      { reason: formData.get('reactivationReason') },
      agentId,
      owner.id,
      { repository },
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to reactivate the Agent.' };
  }
  redirect(`/agents/${agentId}`);
}
