import type { Repository } from './repository';
import { continueInputSchema } from './continue-schema';

export async function continueAgentLifecycle(
  rawInput: unknown,
  agentId: string,
  ownerId: string,
  dependencies: { repository: Repository },
): Promise<string> {
  const input = continueInputSchema.parse(rawInput);
  const detail = await dependencies.repository.detail(agentId);

  if (!detail) throw new Error('Agent not found.');
  if (detail.agent.ownerId !== ownerId) throw new Error('You are not authorized to continue this agent.');
  if (detail.agent.status !== 'TRANSFERRED') throw new Error('Only a transferred agent can enter Continue.');
  if (detail.version.versionType !== 'TRANSFERRED') throw new Error('The current state must be the transferred checkpoint.');
  if (!detail.events.some((event) => event.eventType === 'TRANSFER')) {
    throw new Error('A TRANSFER event is required before Continue.');
  }

  await dependencies.repository.continueAgent(agentId, ownerId, input.objective);
  return agentId;
}
