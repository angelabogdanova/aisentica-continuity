# Aisentica Continuity

**Domain-Anchored Continuity for Transferable AI Agents.** Aisentica treats an agent as a persistent digital asset: its identity and structured state can remain continuous through future lifecycle changes.

## Problem and solution
Agents are commonly copied, recreated, or trapped in one account. Aisentica creates a stable identity plus versioned state history so future domain binding and ownership transfer can preserve one trajectory rather than fork a copy.

## Lifecycle
`Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue`.

Phase 1 implements **Create** only: signed demo-owner selection, server validation, GPT-5.6 manifest generation, an Agent, initial immutable manifest version, CREATE event, private detail and safe public card, plus reset. Later lifecycle steps are intentionally disabled.

## Architecture and data
Next.js App Router server actions validate forms and demo cookies before writes. `lib/ai.ts` isolates the OpenAI Responses integration; `lib/repository.ts` defines storage adapters and a deterministic in-memory adapter for tests/local prototype operation. The production Postgres schema is defined by the ordered migrations in `supabase/migrations/`. It includes owners, agents, versions, events, domain bindings, and transfer tokens. The server-only Supabase adapter calls a transactional RPC that returns one JSON object containing the Agent, initial Version, CREATE event, and Owner.

## GPT-5.6
With `OPENAI_API_KEY`, creation calls the official OpenAI JavaScript SDK Responses API using `OPENAI_MODEL` (default `gpt-5.6`) and validates strict JSON with Zod before persistence. Without a key the app fails clearly unless `ENABLE_LOCAL_AI_FALLBACK=true`; the UI labels this deterministic fallback and never calls it GPT-5.6.

## Local setup
```bash
cp .env.example .env.local
npm install
npm run dev
```
Required variables are `STORAGE_BACKEND`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6`, `DEMO_SESSION_SECRET`, and optionally `ENABLE_LOCAL_AI_FALLBACK=true`. Do not expose the Supabase secret or OpenAI keys as `NEXT_PUBLIC_*`.

## Supabase and deployment
Create a Supabase project and apply `001_phase1.sql`, `002_atomic_create.sql`, and `003_production_schema_alignment.sql` in filename order (or run `supabase db push`). Migration 003 aligns the RPC's single-object JSON contract, enables RLS on all six lifecycle tables, restricts table and function access to `service_role`, and idempotently preserves Owner A and Owner B. The separate `supabase/seed.sql` remains available for local resets.

Map the Supabase values into Vercel without committing their real contents:

```text
STORAGE_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=<Supabase SUPABASE_URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase SUPABASE_SECRET_KEY>
```

Add the remaining server-only variables from `.env.example` in Vercel and deploy. Never place the Supabase secret key in a `NEXT_PUBLIC_*` variable.

## Commands
`npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Demo
Open `/demo`, choose Owner A, create Atlas, inspect `/agents/<id>` and its public card. Use Reset Demo (after confirmation) to remove all created records. Demo authentication is deliberately not production authentication.

## Security and limitations
Cookies are signed and HTTP-only; modifying actions require a server owner. Public cards omit owner and private manifest rules. Supabase tables use RLS, public roles have no lifecycle-table access, and the atomic Create RPC is restricted to `service_role`. This prototype still needs real user authentication, audit controls, and the remaining domain/transfer lifecycle stages before production use.

## OpenAI Build Week
This repository delivers the Phase 1 working foundation. Codex accelerated scaffolding, validation, testing, and documentation; humans directed the product boundary, lifecycle semantics, public/private separation, and deliberate exclusion of transfers, payments, and marketplaces.

## Stabilization notes
Storage selection is explicit: use `STORAGE_BACKEND=supabase` for deployed environments, with both Supabase variables configured. `STORAGE_BACKEND=memory` is temporary local/test storage only and is visibly labelled in the dashboard. Production refuses an unspecified backend. Apply migrations in order through `003_production_schema_alignment.sql`; its aligned RPC atomically creates the Agent, initial version, and CREATE event and returns the single JSON object consumed by the repository. `DEMO_SESSION_SECRET` is required to be at least 32 characters in production.
