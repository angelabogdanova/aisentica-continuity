import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { demoSessionSecret } from './config';
import { repository } from './repository';

const sessionCookieName = 'ac_demo_session';

export function signOwner(ownerId: string): string {
  const signature = createHmac('sha256', demoSessionSecret()).update(ownerId).digest('hex');
  return `${ownerId}.${signature}`;
}

export function verifyOwner(value?: string): string | undefined {
  if (!value) return undefined;
  const [ownerId, signature] = value.split('.');
  if (!ownerId || !signature || value.split('.').length !== 2) return undefined;
  const expected = signOwner(ownerId).split('.')[1];
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? ownerId : undefined;
  } catch {
    return undefined;
  }
}

export function canModifyAgent(ownerId: string, agentOwnerId: string): boolean {
  return ownerId === agentOwnerId;
}

export async function currentOwner() {
  const ownerId = verifyOwner((await cookies()).get(sessionCookieName)?.value);
  return ownerId ? repository.owner(ownerId) : undefined;
}

export async function requireOwner() {
  const owner = await currentOwner();
  if (!owner) redirect('/demo');
  return owner;
}

export async function assertAgentOwner(agentId: string, ownerId: string) {
  const detail = await repository.detail(agentId);
  if (!detail) throw new Error('Agent not found.');
  if (!canModifyAgent(ownerId, detail.agent.ownerId)) {
    throw new Error('You are not authorized to modify this agent.');
  }
  return detail;
}

export { sessionCookieName };
