import { type AIService } from './ai';
import { creationSchema, type CreationInput } from './schema';
import { type Repository } from './repository';

export async function createAgentLifecycle(
  formValues: Record<string, unknown>,
  ownerId: string,
  dependencies: { ai: AIService; repository: Repository },
): Promise<string> {
  const input: CreationInput = creationSchema.parse(formValues);
  const manifest = await dependencies.ai.generateManifest(input);
  const detail = await dependencies.repository.create(ownerId, manifest);
  return detail.agent.id;
}
