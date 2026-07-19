# Aisentica Continuity

**Domain-Anchored Continuity for Transferable AI Agents.** Aisentica treats an agent as a persistent digital asset whose identity and structured state remain continuous across lifecycle and ownership changes.

## Problem and solution
Agents are commonly copied, recreated, or trapped in one account. Aisentica creates a stable identity, verified canonical domain, and immutable state history so development, availability changes, ownership transfer, and successor continuation preserve one trajectory rather than fork a copy.

## Complete lifecycle
`Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue`.

The live MVP implements all seven stages:

1. Create establishes identity and immutable Version 1.
2. Bind Domain verifies the canonical hostname and creates Version 2.
3. Develop uses GPT-5.6 structured output to append reusable professional state.
4. Park changes availability to `PARKED` without deleting state.
5. Reactivate restores `ACTIVE` availability from the parked checkpoint.
6. Transfer creates a single-use, short-lived offer and atomically changes ownership only when the intended owner accepts it.
7. Continue lets the successor owner resume the same Agent from the transferred checkpoint without copying or resetting it.

## Architecture and data
Next.js App Router server actions validate forms and signed demo cookies before writes. `AIService` and `DevelopmentService` isolate the OpenAI Responses API. `Repository` separates lifecycle orchestration from persistence. Tests use `MemoryRepository`; deployed environments use the server-only `SupabaseRepository`.

Production Postgres state is defined by ordered migrations. Atomic `SECURITY DEFINER` RPCs create initial state, bind domains, append development, park, reactivate, transfer ownership, and continue under the successor owner. Every successful lifecycle operation creates exactly one immutable version and one event.

## GPT-5.6
Create and Develop call the official OpenAI JavaScript SDK Responses API using `OPENAI_MODEL` (default `gpt-5.6`) and validate strict structured output with Zod before persistence. Owner-supplied development context is treated as untrusted material, not automatically verified truth. Park, Reactivate, Transfer, and Continue are deterministic lifecycle operations and do not invent model-generated state.

## Local setup
```bash
cp .env.example .env.local
npm install
npm run dev
```

Required variables are `STORAGE_BACKEND`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6`, `DEMO_SESSION_SECRET`, and optionally `ENABLE_LOCAL_AI_FALLBACK=true`. Never expose the Supabase secret or OpenAI key as `NEXT_PUBLIC_*`.

## Supabase migration order
1. `001_phase1.sql`
2. `002_atomic_create.sql`
3. `003_production_schema_alignment.sql`
4. `004_bind_domain.sql`
5. `005_develop.sql`
6. `006_park.sql`
7. `007_reactivate.sql`
8. `008_transfer.sql`
9. `009_continue.sql`

Migration 008 extends the existing transfer-token table with version locking and private handoff metadata, allows the temporary `TRANSFERRED` availability state, creates single-use offers, and atomically creates the `TRANSFERRED` version plus `TRANSFER` event while changing ownership. Migration 009 requires that transferred checkpoint and atomically creates the `CONTINUED` version plus `CONTINUE` event while restoring `ACTIVE` availability.

## Transfer security
The raw transfer token is generated with 256 bits of cryptographic randomness and is never stored. Supabase stores only its SHA-256 hash. Offers expire after 15 minutes, are intended for one named demo owner, are single-use, and are bound to the exact Agent version present when created. A later state change makes the offer stale. Acceptance locks both offer and Agent rows before changing ownership.

The transfer link is private and may display the private handoff summary to its holder. Public Agent cards never expose the token, token hash, owner identifiers, handoff summary, or continuation objective.

## Judge demo
1. Choose Owner A and open Atlas.
2. Inspect the same Agent ID, verified domain, immutable Version History, and completed Create through Reactivate events.
3. Create the transfer offer for Owner B.
4. Follow the private acceptance link, select Owner B, and accept.
5. Confirm Atlas—not a copy—moves to Owner B as the next sequential `TRANSFERRED` version with the same ID, domain, Manifest, developed state, and prior history.
6. Confirm Owner A loses private access and Owner B gains it.
7. Submit Continue under Owner B.
8. Confirm the next sequential `CONTINUED` version, `ACTIVE` status, one `CONTINUE` event, and all seven lifecycle stages completed.
9. Open the public card and confirm it shows only safe identity, domain, public development summary, and continuity badges.

Do not reset the production demonstration. Production reset is disabled; reset remains available only for local in-memory storage.

## Security and limitations
Cookies are signed and HTTP-only; every mutation resolves and authorizes its owner server-side. Supabase tables use RLS, public roles have no lifecycle-table access, and mutation RPCs are restricted to `service_role`. All lifecycle inputs are bounded and validated server-side. Private lifecycle reasons, transfer records, and continuation objectives remain owner-only.

This is a hackathon demonstration. Production use requires real user authentication, owner-aware authorization policies, rate limiting, audited notification delivery, token revocation UX, and operational monitoring.

## Public and private state
Private Agent pages expose complete current state and immutable Version History to the authorized owner. Public cards expose only stable identity, current version, verified domain, current availability, safe development summary, and lifecycle continuity badges. Raw task data, private lifecycle reasons, owner identity, transfer secrets, handoff summaries, continuation objectives, credentials, and full structured state remain private.

## OpenAI Build Week
The repository delivers the complete working seven-stage lifecycle. Codex accelerated initial scaffolding; the product model, migrations, security boundaries, tests, public/private projections, deployment, and live continuity trajectory are maintained through the Aisentica Continuity build process.
