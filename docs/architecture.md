# Architecture

Next.js App Router renders the application and performs state-changing operations through server actions. Every mutation resolves the signed demo identity, validates input with Zod, and invokes lifecycle orchestration on the server.

`AIService` abstracts the GPT-5.6 Responses API and permits deterministic tests and explicitly labelled local fallback behavior. `Repository` separates lifecycle orchestration from persistence. Tests inject `MemoryRepository`; deployed environments use the server-only `SupabaseRepository` with `STORAGE_BACKEND=supabase`.

## Supabase migration order

Apply migrations in filename order:

1. `001_phase1.sql` creates the six lifecycle tables, constraints, indexes, and demonstration owners.
2. `002_atomic_create.sql` introduces the original transactional Create RPC.
3. `003_production_schema_alignment.sql` replaces that RPC with the production `returns jsonb` contract, enables RLS on all six tables, removes `anon` and `authenticated` access, grants server-side CRUD to `service_role`, restricts RPC execution to `service_role`, and preserves Owner A and Owner B idempotently.

The aligned `create_agent_with_initial_state(text, text, jsonb)` function validates the owner and atomically creates Agent + `INITIAL_MANIFEST` Version 1 + `CREATE` event. PostgreSQL commits all three records or none. The returned JSON object contains `agent`, `owner`, `version`, and `event`, matching `SupabaseRepository` mapping.

Vercel must map `NEXT_PUBLIC_SUPABASE_URL` to the Supabase `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` to the Supabase `SUPABASE_SECRET_KEY`. The secret value must never be exposed to browser code or committed.
