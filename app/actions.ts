'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { aiService } from '@/lib/ai';
import { requireOwner, sessionCookieName, signOwner } from '@/lib/auth';
import { createAgentLifecycle } from '@/lib/create-agent';
import { repository } from '@/lib/repository';

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
