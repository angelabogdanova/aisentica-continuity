# Aisentica Continuity

**Domain-Anchored Continuity for Transferable AI Agents.** Aisentica treats an agent as a persistent digital asset: its identity and structured state can remain continuous through future lifecycle changes.

## Problem and solution
Agents are commonly copied, recreated, or trapped in one account. Aisentica creates a stable identity plus versioned state history so future domain binding and ownership transfer can preserve one trajectory rather than fork a copy.

## Lifecycle
`Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue`.

Phases 1 and 2 implement **Create** and **Bind Domain**: signed demo-owner selection, GPT-5.6 manifest generation, immutable Version 1, a same-origin HTTPS domain challenge, and atomic verified Version 2. Develop and all later lifecycle operations remain disabled.

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
Required variables are `STORAGE_BACKEND`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6`, `DEMO_SESSION_SECRET`, and optionally `ENABLE_LOCAL_AI_FALLBACK=true`. Do not expose the service-role or OpenAI keys as `NEXT_PUBLIC_*`.

## Supabase and deployment
Create a Supabase project and apply `001_phase1.sql`, `002_atomic_create.sql`, `003_production_schema_alignment.sql`, and `004_bind_domain.sql` in filename order (or run `supabase db push`). Migration 003 aligns the Create RPC and production access controls; migration 004 adds owner-authorized domain-binding RPCs, binding constraints, and verified-domain uniqueness without deleting existing lifecycle data. The separate `supabase/seed.sql` remains available for local resets.

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
Cookies are signed and HTTP-only; modifying actions require a server owner. Public cards omit owner and private manifest rules. This prototype needs real auth, transactional Supabase repository wiring/RLS, audit controls, and domain/transfer lifecycle work before production.

## OpenAI Build Week
This repository delivers the Phase 1 working foundation. Codex accelerated scaffolding, validation, testing, and documentation; humans directed the product boundary, lifecycle semantics, public/private separation, and deliberate exclusion of transfers, payments, and marketplaces.

## Stabilization notes
Storage selection is explicit: use `STORAGE_BACKEND=supabase` for deployed environments, with both Supabase variables configured. `STORAGE_BACKEND=memory` is temporary local/test storage only and is visibly labelled in the dashboard. Production refuses an unspecified backend. Apply migrations in order through `004_bind_domain.sql`; its aligned RPC atomically creates the Agent, initial version, and CREATE event and returns the single JSON object consumed by the repository. `DEMO_SESSION_SECRET` is required to be at least 32 characters in production.

## Phase 2 — Bind Domain

An authenticated owner can bind an unbound Agent to the normalized hostname of the current application request. The application creates a random pending challenge, exposes only the protocol, Agent ID, hostname, and token at `/.well-known/aisentica-continuity/[agentId]`, then verifies that proof over same-origin HTTPS. Success atomically creates `DOMAIN_BINDING` Version 2, records `BIND_DOMAIN`, and sets the Agent's canonical domain. Failure leaves Version 1 and `canonical_domain` unchanged.

This phase intentionally does not accept arbitrary URLs: constraining verification to the current request host avoids SSRF and creates a deterministic demonstration. External customer domains can later use DNS TXT or an externally hosted well-known proof. Apply migrations in order through `004_bind_domain.sql`; it preserves all existing Agents and lifecycle history.
