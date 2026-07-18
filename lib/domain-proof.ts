import { DOMAIN_PROOF_PROTOCOL, normalizeRequestHost, type DomainProof } from './domain-verification';
import type { Repository } from './repository';

export async function domainProofForHost(repository: Repository, agentId: string, requestHost: string | null): Promise<DomainProof | undefined> {
  const domain = normalizeRequestHost(requestHost);
  const binding = await repository.pendingBinding(agentId, domain);
  if (!binding) return undefined;
  return { protocol: DOMAIN_PROOF_PROTOCOL, agentId, domain, verificationToken: binding.verificationToken };
}
