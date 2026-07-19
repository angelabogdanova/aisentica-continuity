import type { Repository } from './repository';
import { parkInputSchema } from './park-schema';

export async function parkAgentLifecycle(
  rawInput: unknown,
  agentId: string,
  ownerId: string,
  dependencies: { repository: Repository },
): Promise<string> {
  const input = parkInputSchema.parse(rawInput);
  const detail = await dependencies.repository.detail(agentId);

  if (!detail) throw new Error('Agent not found.');
  if (detail.agent.ownerId !== ownerId) throw new Error('You are not authorized to park this agent.');
  if (detail.agent.status !== 'ACTIVE') throw new Error('Only ACTIVE agents can be parked.');
  if (!detail.agent.canonicalDomain || detail.agent.currentVersion < 3) {
    throw new Error('The agent must have a verified domain and developed state before Park.');
  }
  if (!detail.events.some((event) => event.eventType === 'DEVELOP')) {
    throw new Error('At least one DEVELOP event is required before Park.');
  }

  await dependencies.repository.park(agentId, ownerId, input.reason);
  return agentId;
}
