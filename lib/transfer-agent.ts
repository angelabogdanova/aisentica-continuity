import type { Repository } from './repository';
import { transferInputSchema } from './transfer-schema';
import { generateTransferToken, hashTransferToken, transferExpiresAt } from './transfer-token';

export async function initiateTransferLifecycle(
  rawInput: unknown,
  agentId: string,
  ownerId: string,
  dependencies: { repository: Repository },
): Promise<string> {
  const input = transferInputSchema.parse(rawInput);
  const detail = await dependencies.repository.detail(agentId);

  if (!detail) throw new Error('Agent not found.');
  if (detail.agent.ownerId !== ownerId) throw new Error('You are not authorized to transfer this agent.');
  if (detail.agent.status !== 'ACTIVE') throw new Error('Only ACTIVE agents can be transferred.');
  if (!detail.agent.canonicalDomain || detail.agent.currentVersion < 5) {
    throw new Error('The agent must complete Reactivate before Transfer.');
  }
  if (!detail.events.some((event) => event.eventType === 'REACTIVATE')) {
    throw new Error('A REACTIVATE event is required before Transfer.');
  }
  if (input.intendedOwnerId === ownerId) throw new Error('The intended owner must be different from the current owner.');
  if (!(await dependencies.repository.owner(input.intendedOwnerId))) throw new Error('Intended owner not found.');

  const token = generateTransferToken();
  await dependencies.repository.createTransferOffer(
    agentId,
    ownerId,
    input.intendedOwnerId,
    hashTransferToken(token),
    input.handoffSummary,
    transferExpiresAt(),
  );
  return token;
}

export async function acceptTransferLifecycle(
  token: string,
  ownerId: string,
  dependencies: { repository: Repository },
): Promise<string> {
  const tokenHash = hashTransferToken(token);
  const offer = await dependencies.repository.transferOffer(tokenHash);
  if (!offer) throw new Error('Transfer offer not found.');
  if (offer.intendedOwnerId !== ownerId) throw new Error('This transfer offer is intended for another owner.');
  if (offer.acceptedAt) throw new Error('This transfer offer has already been accepted.');
  if (new Date(offer.expiresAt).getTime() <= Date.now()) throw new Error('This transfer offer has expired.');

  const detail = await dependencies.repository.acceptTransfer(tokenHash, ownerId);
  return detail.agent.id;
}
