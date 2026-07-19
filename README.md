# Aisentica Continuity

**Domain-Anchored Continuity for Transferable AI Agents.** Aisentica treats an agent as a persistent digital asset whose identity and structured state remain continuous across lifecycle changes.

## Problem and solution
Agents are commonly copied, recreated, or trapped in one account. Aisentica creates a stable identity and immutable version history so domain binding, professional development, and future ownership transfer preserve one trajectory rather than fork a copy.

## Lifecycle
`Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue`.

Phases 1–3 implement **Create**, **Bind Domain**, and **Develop**: signed demo-owner selection, server validation, GPT-5.6 manifest generation, immutable Version 1, a same-origin HTTPS domain challenge, atomic verified Version 2, and repeatable GPT-5.6 development records beginning with Version 3. Later lifecycle operations remain intentionally unimplemented.

## Architecture and data
Next.js App Router server actions validate forms and signed demo cookies before writes. `AIService` and `DevelopmentService` isolate the OpenAI Responses API. `Repository` separates lifecycle orchestration from persistence. Tests use `MemoryRepository`; deployed environments use the server-only `SupabaseRepository`.

The production Postgres schema is defined by ordered migrations in `supabase/migrations/`. Atomic `SECURITY DEFINER` RPCs create the initial agent state, complete verified domain binding, and append development state without rewriting prior versions.

## GPT-5.6
With `OPENAI_API_KEY`, Create and Develop call the official OpenAI JavaScript SDK Responses API using `OPENAI_MODEL` (default `gpt-5.6`) and validate strict structured output with Zod before persistence. Without a key the app fails clearly unless `ENABLE_LOCAL_AI_FALLBACK=true`; the UI labels this deterministic fallback and never calls it GPT-5.6.

Owner-supplied development context is treated as untrusted material, not automatically verified truth. The model is instructed not to invent sources, claim external verification, retain secrets, or alter canonical identity and prior history.

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
5. `005_develop.sql`

Migration 003 aligns the Create RPC, enables RLS on all six lifecycle tables, restricts table and function access to `service_role`, and preserves Owner A and Owner B. Migration 004 adds constrained domain-binding states, verified-domain uniqueness, owner-authorized RPCs, and atomic creation of Version 2 plus `BIND_DOMAIN`. Migration 005 adds the atomic Develop RPC, preserving all prior records while appending the next sequential `DEVELOPMENT` version and one `DEVELOP` event.

Map the Supabase values into Vercel without committing their real contents:

```text
STORAGE_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=<Supabase SUPABASE_URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase SUPABASE SECRET KEY>
```

Add the remaining server-only variables from `.env.example` in Vercel and deploy. Never place the Supabase secret key in a `NEXT_PUBLIC_*` variable.

## Commands
`npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Judge demo
1. Open `/demo` and choose Owner A.
2. Open Atlas at verified State Version 2.
3. In **Develop Atlas**, select **Use Atlas development example**.
4. Submit **Develop Agent** and allow GPT-5.6 to produce the structured Development Record.
5. Confirm Atlas keeps the same ID, owner, Manifest, and verified domain while advancing to Version 3.
6. Inspect the `DEVELOP` timeline event and Version History for Versions 1, 2, and 3.
7. Open the public card and confirm it shows only the verified domain and safe public development summary.
8. Switch to Owner B and confirm Atlas remains inaccessible privately.

Do not reset the production demonstration.

## Security and limitations
Cookies are signed and HTTP-only; every mutation resolves and authorizes its owner server-side. Supabase tables use RLS, public roles have no lifecycle-table access, and lifecycle RPCs are restricted to `service_role`. The domain proof accepts only the validated current request hostname and a fixed HTTPS well-known path. Develop inputs are bounded, validated server-side, treated as untrusted text, and never rendered as HTML.

This remains a hackathon demonstration. Production use requires real user authentication, owner-aware authorization policies, rate limiting, audit controls, monitoring, and the remaining lifecycle stages.

## Public and private state
Private Agent pages expose the complete current state and immutable Version History to the authorized owner. Public cards expose only stable public identity, current version, verified domain, and the latest safe `publicDevelopmentSummary`. Raw task text, context/evidence, success criteria, private rules, owner identity, credentials, verification tokens, and full structured state remain private.

## OpenAI Build Week
The repository delivers the working Create, Bind Domain, and Develop stages. Codex accelerated scaffolding, validation, testing, and documentation; humans directed the product boundary, lifecycle semantics, security model, public/private separation, and continuity requirements.
