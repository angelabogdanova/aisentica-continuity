import { developmentInputSchema, developmentRecordSchema } from './development-schema';
import type { DevelopmentService } from './development';
import type { Repository } from './repository';

export async function developAgentLifecycle(
  values: Record<string, unknown>,
  agentId: string,
  ownerId: string,
  dependencies: { repository: Repository; development: DevelopmentService },
): Promise<string> {
  const input = developmentInputSchema.parse(values);
  const detail = await dependencies.repository.detail(agentId);

  if (!detail) throw new Error('Agent not found.');
  if (detail.agent.ownerId !== ownerId) throw new Error('You are not authorized to develop this agent.');
  if (detail.agent.status !== 'ACTIVE') throw new Error('Only ACTIVE agents can Develop.');
  if (!detail.agent.canonicalDomain || detail.agent.currentVersion < 2) {
    throw new Error('A verified canonical domain is required before Develop.');
  }

  const record = developmentRecordSchema.parse(await dependencies.development.develop(input));
  await dependencies.repository.develop(agentId, ownerId, record);
  return agentId;
}
