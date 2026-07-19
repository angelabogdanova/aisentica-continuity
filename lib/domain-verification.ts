import { z } from 'zod';

export const DOMAIN_PROOF_PROTOCOL = 'Aisentica Continuity Domain Proof';
const proofSchema = z.object({ protocol: z.literal(DOMAIN_PROOF_PROTOCOL), agentId: z.string(), domain: z.string(), verificationToken: z.string() }).strict();

export type DomainProof = z.infer<typeof proofSchema>;
export interface DomainVerificationService { verify(proof: DomainProof): Promise<void> }

export function normalizeRequestHost(value: string | null): string {
  if (!value) throw new Error('The current request host is unavailable.');
  const host = value.trim().toLowerCase();
  if (host.includes('://') || /[\/@?#]/.test(host) || host.includes(':')) throw new Error('The request host must be a hostname without protocol, path, credentials, or port.');
  if (host === 'localhost' || host.endsWith('.localhost')) throw new Error('Localhost cannot be a canonical domain.');
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes('[') || host.includes(']')) throw new Error('IP address hosts cannot be a canonical domain.');
  if (host.length > 253 || !host.includes('.') || !host.split('.').every((label) => /^(?!-)[a-z0-9-]{1,63}(?<!-)$/.test(label))) throw new Error('The request host is not a valid public hostname.');
  return host;
}

export class SameOriginHttpsDomainVerificationService implements DomainVerificationService {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly sameOriginCookie?: string,
  ) {}

  async verify(expected: DomainProof): Promise<void> {
    const headers = new Headers();
    if (this.sameOriginCookie) headers.set('cookie', this.sameOriginCookie);

    const response = await this.fetcher(
      `https://${expected.domain}/.well-known/aisentica-continuity/${encodeURIComponent(expected.agentId)}`,
      { cache: 'no-store', redirect: 'error', headers },
    );
    if (!response.ok) throw new Error(`Domain proof returned HTTP ${response.status}.`);
    const actual = proofSchema.parse(await response.json());
    if (actual.agentId !== expected.agentId || normalizeRequestHost(actual.domain) !== expected.domain || actual.verificationToken !== expected.verificationToken) throw new Error('Domain proof did not match the pending challenge.');
  }
}

export class DeterministicDomainVerificationService implements DomainVerificationService {
  constructor(private readonly succeeds = true) {}
  async verify(): Promise<void> { if (!this.succeeds) throw new Error('Deterministic domain verification failed.'); }
}
