# Aisentica Continuity

**Domain-Anchored Continuity for Transferable AI Agents.** Aisentica treats an agent as a persistent digital asset whose identity and structured state remain continuous across lifecycle changes.

## Problem and solution
Agents are commonly copied, recreated, or trapped in one account. Aisentica creates a stable identity and immutable version history so domain binding, professional development, availability changes, and future ownership transfer preserve one trajectory rather than fork a copy.

## Lifecycle
`Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue`.

Phases 1–5 implement **Create**, **Bind Domain**, **Develop**, **Park**, and **Reactivate**: signed demo-owner selection, server validation, GPT-5.6 manifest generation, immutable Version 1, a same-origin HTTPS domain challenge, atomic verified Version 2, repeatable GPT-5.6 Development Records beginning with Version 3, atomic parking without deleting history, and atomic return to `ACTIVE` from the preserved parked checkpoint. Transfer and Continue remain intentionally unimplemented.

## Architecture and data
Next.js App Router server actions validate forms and signed demo cookies before writes. `AIService` and `DevelopmentService` isolate the OpenAI Responses API. `Repository` separates lifecycle orchestration from persistence. Tests use `MemoryRepository`; deployed environments use the server-only `SupabaseRepository`.

The production Postgres schema is defined by ordered migrations in `supabase/migrations/`. Atomic `SECURITY DEFINER` RPCs create initial state, complete verified domain binding, append development state, park an Agent, and reactivate it without rewriting prior versions.

## GPT-5.6
With `OPENAI_API_KEY`, Create and Develop call the official OpenAI JavaScript SDK Responses API using `OPENAI_MODEL` (default `gpt-5.6`) and validate strict structured output with Zod before persistence. Without a key the app fails clearly unless `ENABLE_LOCAL_AI_FALLBACK=true`; the UI labels this deterministic fallback and never calls it GPT-5.6.

Owner-supplied development context is treated as untrusted material, not automatically verified truth. The model is instructed not to invent sources, claim external verification, retain secrets, or alter canonical identity and prior history. Park and Reactivate are deterministic and do not call a model.

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
6. `006_park.sql`
7. `007_reactivate.sql`

Migration 003 aligns the Create RPC, enables RLS on all six lifecycle tables, restricts table and function access to `service_role`, and preserves Owner A and Owner B. Migration 004 adds atomic verified domain binding. Migration 005 appends the next sequential `DEVELOPMENT` version and one `DEVELOP` event. Migration 006 appends a `PARKED` version and one `PARK` event while changing availability to `PARKED`. Migration 007 appends a `REACTIVATED` version and one `REACTIVATE` event while restoring availability to `ACTIVE`. Every migration preserves all prior records.

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
2. Open Atlas and inspect its immutable Version History.
3. Confirm the completed `CREATE`, `BIND_DOMAIN`, and `DEVELOP` stages.
4. Park Atlas and confirm the next sequential version, status `PARKED`, and one `PARK` event.
5. Confirm Develop disappears while parked.
6. Reactivate Atlas and confirm the next sequential version, status `ACTIVE`, and one `REACTIVATE` event.
7. Confirm the same Agent ID, owner, Manifest, verified domain, Development Record, Park Record, and all prior versions remain intact.
8. Confirm Develop is available again after Reactivate.
9. Open the public card and confirm only safe identity, verified domain, public development summary, availability, and continuity badge are visible.
10. Switch to Owner B and confirm Atlas remains inaccessible privately.

Do not reset the production demonstration.

## Security and limitations
Cookies are signed and HTTP-only; every mutation resolves and authorizes its owner server-side. Supabase tables use RLS, public roles have no lifecycle-table access, and lifecycle RPCs are restricted to `service_role`. Develop inputs are bounded and treated as untrusted text. Park and Reactivate validate owner, current status, verified domain, prerequisite event trail, and bounded private reason before one atomic write.

This remains a hackathon demonstration. Production use requires real user authentication, owner-aware authorization policies, rate limiting, audit controls, monitoring, and the remaining lifecycle stages.

## Public and private state
Private Agent pages expose the complete current state and immutable Version History to the authorized owner. Public cards expose only stable public identity, current version, verified domain, current availability, continuity badges, and the latest safe `publicDevelopmentSummary`. Raw task text, context/evidence, success criteria, parking reason, reactivation reason, private rules, owner identity, credentials, verification tokens, and full structured state remain private.

## OpenAI Build Week
The repository delivers the working Create, Bind Domain, Develop, Park, and Reactivate stages. The lifecycle, state model, security boundaries, migrations, tests, public/private projections, and deployment flow are maintained through the Aisentica Continuity build process.
