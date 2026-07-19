import type { Repository } from './repository';
import { reactivateInputSchema } from './reactivate-schema';

export async function reactivateAgentLifecycle(
  rawInput: unknown,
  agentId: string,
  ownerId: string,
  dependencies: { repository: Repository },
): Promise<string> {
  const input = reactivateInputSchema.parse(rawInput);
  const detail = await dependencies.repository.detail(agentId);

  if (!detail) throw new Error('Agent not found.');
  if (detail.agent.ownerId !== ownerId) throw new Error('You are not authorized to reactivate this agent.');
  if (detail.agent.status !== 'PARKED') throw new Error('Only PARKED agents can be reactivated.');
  if (!detail.agent.canonicalDomain || detail.agent.currentVersion < 4) {
    throw new Error('A parked, domain-bound state is required before Reactivate.');
  }
  if (!detail.events.some((event) => event.eventType === 'PARK')) {
    throw new Error('A PARK event is required before Reactivate.');
  }

  await dependencies.repository.reactivate(agentId, ownerId, input.reason);
  return agentId;
}
