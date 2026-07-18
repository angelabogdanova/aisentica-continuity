import { randomBytes } from 'crypto';
import { DOMAIN_PROOF_PROTOCOL, type DomainVerificationService, normalizeRequestHost } from './domain-verification';
import type { Repository } from './repository';

export async function bindCurrentDomain(agentId: string, ownerId: string, requestHost: string | null, dependencies: { repository: Repository; verifier: DomainVerificationService }): Promise<string> {
  const domain = normalizeRequestHost(requestHost);
  const token = randomBytes(32).toString('base64url');
  const binding = await dependencies.repository.createPendingDomainBinding(agentId, ownerId, domain, token);
  try {
    await dependencies.verifier.verify({ protocol: DOMAIN_PROOF_PROTOCOL, agentId, domain, verificationToken: token });
  } catch (error) {
    await dependencies.repository.failDomainBinding(agentId, ownerId, binding.id);
    throw error;
  }
  await dependencies.repository.completeDomainBinding(agentId, ownerId, binding.id);
  return agentId;
}
