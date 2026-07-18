# Aisentica Continuity

**Domain-Anchored Continuity for Transferable AI Agents.** Aisentica treats an agent as a persistent digital asset whose identity and structured state remain continuous across lifecycle changes.

## Problem and solution
Agents are commonly copied, recreated, or trapped in one account. Aisentica creates a stable identity and versioned state history so domain binding and future ownership transfer preserve one trajectory rather than fork a copy.

## Lifecycle
`Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue`.

Phases 1 and 2 implement **Create** and **Bind Domain**: signed demo-owner selection, server validation, GPT-5.6 manifest generation, immutable Version 1, a same-origin HTTPS domain challenge, and atomic verified Version 2. Develop and all later lifecycle operations remain intentionally unimplemented.

## Architecture and data
Next.js App Router server actions validate forms and signed demo cookies before writes. `lib/ai.ts` isolates the OpenAI Responses integration. `lib/repository.ts` defines storage adapters and a deterministic in-memory adapter for tests and local development. Deployed environments use the server-only `SupabaseRepository`.

The production Postgres schema is defined by the ordered migrations in `supabase/migrations/`. It includes owners, agents, versions, events, domain bindings, and transfer tokens. Atomic `SECURITY DEFINER` RPCs create the initial agent state and complete verified domain binding.

## GPT-5.6
With `OPENAI_API_KEY`, creation calls the official OpenAI JavaScript SDK Responses API using `OPENAI_MODEL` (default `gpt-5.6`) and validates strict JSON with Zod before persistence. Without a key the app fails clearly unless `ENABLE_LOCAL_AI_FALLBACK=true`; the UI labels this deterministic fallback and never calls it GPT-5.6.

## Local setup
```bash
cp .env.example .env.local
npm install
npm run dev
```

Required variables are `STORAGE_BACKEND`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6`, `DEMO_SESSION_SECRET`, and optionally `ENABLE_LOCAL_AI_FALLBACK=true`. Do not expose the Supabase secret or OpenAI key as `NEXT_PUBLIC_*`.

## Supabase and deployment
Apply these migrations in filename order:

1. `001_phase1.sql`
2. `002_atomic_create.sql`
3. `003_production_schema_alignment.sql`
4. `004_bind_domain.sql`

Migration 003 aligns the Create RPC, enables RLS on all six lifecycle tables, restricts table and function access to `service_role`, and idempotently preserves Owner A and Owner B. Migration 004 adds constrained domain-binding states, verified-domain uniqueness, owner-authorized RPCs, and atomic creation of Version 2 plus the `BIND_DOMAIN` event. It does not delete existing agents or lifecycle history.

Map the Supabase values into Vercel without committing their real contents:

```text
STORAGE_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=<Supabase SUPABASE_URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase SUPABASE_SECRET_KEY>
```

Add the remaining server-only variables from `.env.example` in Vercel and deploy. Never place the Supabase secret key in a `NEXT_PUBLIC_*` variable.

## Commands
`npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Judge demo
1. Open `/demo` and choose Owner A.
2. Open Atlas at State Version 1.
3. Select **Bind current domain**.
4. Observe the same-origin HTTPS proof complete and Atlas advance to State Version 2 with a verified canonical domain and `BIND_DOMAIN` event.
5. Open the public card and confirm the verified domain is visible while the owner, token, private rules, and event metadata remain hidden.
6. Switch to Owner B and confirm Atlas's private page remains inaccessible.

Do not reset the production demonstration.

## Security and limitations
Cookies are signed and HTTP-only; every mutation resolves and authorizes its owner server-side. Supabase tables use RLS, public roles have no lifecycle-table access, and lifecycle RPCs are restricted to `service_role`. The Phase 2 proof accepts only the validated current request hostname and a fixed HTTPS well-known path, avoiding arbitrary outbound URLs.

This remains a hackathon demonstration. Production use requires real user authentication, owner-aware authorization policies, rate limiting, audit controls, monitoring, and the remaining lifecycle stages.

## Phase 2 verification model
An authenticated owner can bind an unbound agent to the normalized hostname of the current application request. The application creates a cryptographically random pending challenge, exposes only the protocol, Agent ID, hostname, and token at `/.well-known/aisentica-continuity/[agentId]`, and verifies that proof over same-origin HTTPS.

Success atomically marks the binding verified, sets `canonicalDomain`, creates `DOMAIN_BINDING` Version 2 while preserving the complete Version 1 manifest, and records `BIND_DOMAIN`. Failure leaves Version 1 and `canonical_domain` unchanged. Arbitrary external domains are intentionally deferred to a future DNS TXT or externally hosted well-known proof adapter.

## OpenAI Build Week
The repository now delivers the working Create and Bind Domain stages. Codex accelerated scaffolding, validation, testing, and documentation; humans directed the product boundary, lifecycle semantics, security model, public/private separation, and continuity requirements.
