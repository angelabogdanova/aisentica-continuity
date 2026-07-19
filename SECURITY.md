# Security

Aisentica Continuity is a working hackathon MVP with server-side authorization, restricted lifecycle RPCs, atomic Postgres writes, protected secrets, and separate public/private projections. Demo identity is intentionally simpler than commercial authentication and must be replaced before multi-tenant production use.

## Secrets and server boundaries

OpenAI and Supabase service-role credentials are server-only environment variables and are never serialized to clients. They must never use the `NEXT_PUBLIC_*` prefix.

The browser submits forms to Next.js server actions. Lifecycle orchestration and Supabase access execute only on the server.

## Demo authorization

Demo identities use a signed, HTTP-only, same-site cookie. Every mutation resolves the current owner server-side and verifies that owner against the current Agent state before writing.

The cookie is suitable for a controlled hackathon demonstration, not for public multi-tenant production. A commercial release requires real authentication, owner-aware RLS tied to authenticated user IDs, rate limiting, audit logging, and session-management controls.

## Supabase authorization and atomicity

Lifecycle tables use RLS. Public, `anon`, and `authenticated` roles cannot execute lifecycle mutation functions. Atomic mutation RPCs are restricted to `service_role`.

Each RPC locks the current Agent row, verifies status, owner, current version, and lifecycle prerequisites, then creates exactly one next sequential immutable version and one event in the same transaction.

Production reset is disabled. Reset is available only with temporary in-memory storage.

## Same-origin domain proof

Phase 2 accepts only a normalized public hostname derived from the current request Host. Protocols, paths, ports, credentials, localhost, IP literals, and arbitrary external destinations are rejected.

Verification fetches only the fixed HTTPS path:

```text
/.well-known/aisentica-continuity/{agentId}
```

While verification is pending, the proof contains only the protocol name, Agent ID, normalized domain, and random challenge value. It contains no owner identity, session information, Manifest, credentials, or private configuration.

For a deployment protected by Vercel Authentication, the current request cookie may be forwarded only to the exact normalized same-origin proof host. It is never forwarded cross-origin. This behavior was added after independent production E2E testing exposed the protected-deployment interaction.

The database enforces canonical-domain uniqueness so one domain cannot identify two Agents.

Arbitrary external domain verification is intentionally deferred to a future DNS TXT or external well-known adapter.

## GPT-5.6 state generation

Create and Develop inputs are bounded and validated server-side. Owner-supplied development text is treated as untrusted material, not verified fact or system instruction.

The model output must match strict Zod schemas before persistence. Invalid structured output fails closed.

The transferable Development Record excludes credentials, personal identifiers, private preferences, and unsafe retention content. Public projection contains only the explicitly safe public development summary.

## Park and Reactivate privacy

Parking and reactivation reasons remain private owner state. Public cards may show generic availability or continuity badges but never expose the private reasons.

## Transfer protection

Transfer offers use cryptographically random raw values that are shown only in the private acceptance link. The database stores only a SHA-256 digest.

Offers are:

- short-lived;
- single-use;
- restricted to one intended successor;
- locked to the exact Agent version present when the offer was created;
- rejected after expiry, acceptance, owner mismatch, or state change.

Acceptance locks both the offer and Agent rows before atomically changing ownership, appending the Transfer Record, creating the `TRANSFERRED` version, and recording one `TRANSFER` event.

The successor must Continue from that checkpoint before ordinary lifecycle work resumes.

## Public/private projection

Public cards expose only:

- stable Agent identity;
- role and purpose;
- current version and availability;
- verified canonical domain;
- safe public development summary;
- generic lifecycle continuity badges.

Public cards never expose:

- owner identity or owner IDs;
- signed session material;
- raw owner submissions;
- complete private state;
- parking or reactivation reasons;
- transfer acceptance values or stored digests;
- handoff summaries;
- continuation objectives;
- service credentials.

## Remaining production hardening

Before commercial multi-tenant launch, add:

- real authentication and account recovery;
- authenticated owner-aware RLS;
- rate limiting and abuse detection;
- audited notification delivery;
- transfer revocation UX;
- monitoring, backups, and incident response;
- retention and deletion policies;
- external-domain proof adapters.
