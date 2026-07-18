# Aisentica Continuity

**Domain-Anchored Continuity for Transferable AI Agents.** Aisentica treats an agent as a persistent digital asset: its identity and structured state can remain continuous through future lifecycle changes.

## Problem and solution
Agents are commonly copied, recreated, or trapped in one account. Aisentica creates a stable identity plus versioned state history so future domain binding and ownership transfer can preserve one trajectory rather than fork a copy.

## Lifecycle
`Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue`.

Phase 1 implements **Create** only: signed demo-owner selection, server validation, GPT-5.6 manifest generation, an Agent, initial immutable manifest version, CREATE event, private detail and safe public card, plus reset. Later lifecycle steps are intentionally disabled.

## Architecture and data
Next.js App Router server actions validate forms and demo cookies before writes. `lib/ai.ts` isolates the OpenAI Responses integration; `lib/repository.ts` defines storage adapters and a deterministic in-memory adapter for tests/local prototype operation. The production Postgres schema is in `supabase/migrations/001_phase1.sql` and includes owners, agents, versions, events, domain bindings and transfer tokens. The server-only Supabase adapter persists production records; its cleanup path prevents partial lifecycle data if a secondary write fails.

## GPT-5.6
With `OPENAI_API_KEY`, creation calls the official OpenAI JavaScript SDK Responses API using `OPENAI_MODEL` (default `gpt-5.6`) and validates strict JSON with Zod before persistence. Without a key the app fails clearly unless `ENABLE_LOCAL_AI_FALLBACK=true`; the UI labels this deterministic fallback and never calls it GPT-5.6.

## Local setup
```bash
cp .env.example .env.local
npm install
npm run dev
```
Required variables are `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6`, `DEMO_SESSION_SECRET`, and optionally `ENABLE_LOCAL_AI_FALLBACK=true`. Do not expose service role or OpenAI keys as `NEXT_PUBLIC_*`.

## Supabase and deployment
Create a Supabase project, run `supabase/migrations/001_phase1.sql` in the SQL editor (or `supabase db push`), then seed with `supabase/seed.sql`. Add the same server-only values to Vercel project settings and deploy with `vercel`; Vercel detects Next.js.

## Commands
`npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Demo
Open `/demo`, choose Owner A, create Atlas, inspect `/agents/<id>` and its public card. Use Reset Demo (after confirmation) to remove all created records. Demo authentication is deliberately not production authentication.

## Security and limitations
Cookies are signed and HTTP-only; modifying actions require a server owner. Public cards omit owner and private manifest rules. This prototype needs real auth, transactional Supabase repository wiring/RLS, audit controls, and domain/transfer lifecycle work before production.

## OpenAI Build Week
This repository delivers the Phase 1 working foundation. Codex accelerated scaffolding, validation, testing, and documentation; humans directed the product boundary, lifecycle semantics, public/private separation, and deliberate exclusion of transfers, payments, and marketplaces.
