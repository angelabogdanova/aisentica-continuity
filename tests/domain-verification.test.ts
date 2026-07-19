import { describe, expect, it, vi } from 'vitest';
import {
  DOMAIN_PROOF_PROTOCOL,
  SameOriginHttpsDomainVerificationService,
  normalizeRequestHost,
  type DomainProof,
} from '@/lib/domain-verification';

const proof: DomainProof = {
  protocol: DOMAIN_PROOF_PROTOCOL,
  agentId: 'AC-TEST123',
  domain: 'protected.example.com',
  verificationToken: 'verification-token',
};

describe('same-origin HTTPS domain verification', () => {
  it('normalizes a valid public host and rejects unsafe host syntax', () => {
    expect(normalizeRequestHost('Protected.Example.com')).toBe('protected.example.com');
    expect(() => normalizeRequestHost('https://example.com')).toThrow();
    expect(() => normalizeRequestHost('example.com:443')).toThrow();
  });

  it('forwards the current request cookie only to the expected same-origin proof request', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify(proof), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const cookie = '_vercel_jwt=temporary-protection-cookie; ac_demo_session=signed-owner';

    await new SameOriginHttpsDomainVerificationService(fetcher as unknown as typeof fetch, cookie).verify(proof);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe('https://protected.example.com/.well-known/aisentica-continuity/AC-TEST123');
    expect(init?.cache).toBe('no-store');
    expect(init?.redirect).toBe('error');
    expect(new Headers(init?.headers).get('cookie')).toBe(cookie);
  });

  it('omits the cookie header for an unprotected request context', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify(proof), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    await new SameOriginHttpsDomainVerificationService(fetcher as unknown as typeof fetch).verify(proof);

    const [, init] = fetcher.mock.calls[0];
    expect(new Headers(init?.headers).has('cookie')).toBe(false);
  });

  it('rejects a proof whose token does not match the pending challenge', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ ...proof, verificationToken: 'wrong-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    await expect(
      new SameOriginHttpsDomainVerificationService(fetcher as unknown as typeof fetch).verify(proof),
    ).rejects.toThrow('did not match');
  });
});
