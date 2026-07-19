# Architecture

Next.js App Router renders the application and performs state-changing operations through server actions. Every mutation resolves the signed demo identity, validates input with Zod, and invokes lifecycle orchestration on the server.

`AIService` abstracts GPT-5.6 manifest generation. `DevelopmentService` abstracts GPT-5.6 structured professional development. `Repository` separates lifecycle orchestration from persistence. Tests inject `MemoryRepository`; deployed environments use the server-only `SupabaseRepository` with `STORAGE_BACKEND=supabase`.

## Supabase migration order

Apply migrations in filename order:

1. `001_phase1.sql` creates the six lifecycle tables, constraints, indexes, and demonstration owners.
2. `002_atomic_create.sql` introduces the original transactional Create RPC.
3. `003_production_schema_alignment.sql` replaces that RPC with the production `returns jsonb` contract, enables RLS on all six tables, removes `anon` and `authenticated` access, grants server-side CRUD to `service_role`, restricts RPC execution to `service_role`, and preserves Owner A and Owner B idempotently.
4. `004_bind_domain.sql` adds constrained and uniquely indexed binding states plus ownership-checking RPCs for pending challenge creation and atomic verified binding.
5. `005_develop.sql` adds the ownership-checking atomic Develop RPC.
6. `006_park.sql` adds the ownership-checking atomic Park RPC.

The aligned `create_agent_with_initial_state(text, text, jsonb)` function validates the owner and atomically creates Agent + `INITIAL_MANIFEST` Version 1 + `CREATE` event. PostgreSQL commits all three records or none. Lifecycle RPCs return one JSON object containing `agent`, `owner`, `version`, and `event`, matching `SupabaseRepository` mapping.

Vercel maps `NEXT_PUBLIC_SUPABASE_URL` to the Supabase URL and the server-only `SUPABASE_SERVICE_ROLE_KEY` to the Supabase secret key. The secret value must never be exposed to browser code or committed.

## Phase 2 domain verification

`DomainVerificationService` keeps HTTPS challenge verification separate from persistence. Production uses same-origin HTTPS; tests inject a deterministic verifier. The public proof resolver returns only a pending challenge whose normalized domain equals the request Host. Arbitrary external verification is deferred to a future DNS TXT or external well-known proof adapter.

## Phase 3 development flow

`DevelopmentService` separates GPT-5.6 structured work from persistence and provides a deterministic adapter for tests. `developAgentLifecycle` validates untrusted owner input, authorizes the current owner, requires ACTIVE status plus a verified domain, validates the generated Development Record again, and invokes one atomic repository operation.

Migration `005_develop.sql` locks the Agent, loads the current version, copies the complete current `state_json`, appends the new Development Record to `developmentHistory`, inserts the next sequential `DEVELOPMENT` version and one `DEVELOP` event, and updates the Agent in one transaction. Repeated Develop operations append rather than replace state.

## Phase 4 Park flow

`parkAgentLifecycle` validates a bounded private parking reason, authorizes the current owner, requires `ACTIVE` status, a verified canonical domain, State Version 3 or later, and at least one `DEVELOP` event. It does not call GPT.

Migration `006_park.sql` locks the Agent row, copies the complete current state, appends a private Park Record to `parkHistory`, creates the next sequential `PARKED` version and one `PARK` event, and updates only `status`, `current_version`, and `updated_at`. Prior versions, Manifest, Development Records, owner, Agent ID, and canonical domain remain unchanged. A parked Agent cannot Develop or Park again until a future Reactivate operation succeeds.

Private detail queries return all versions in ascending order. Public projection returns only stable public identity, verified domain, current version, current availability, and the latest safe development summary. It never returns raw owner submissions, private parking reason, or full transferable state.
