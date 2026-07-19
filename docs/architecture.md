# Architecture

Next.js App Router renders the application and performs state-changing operations through server actions. Every mutation resolves the signed demo identity, validates bounded input with Zod, and invokes lifecycle orchestration on the server.

`AIService` abstracts GPT-5.6 manifest generation. `DevelopmentService` abstracts GPT-5.6 structured professional development. `Repository` separates lifecycle orchestration from persistence. Tests inject `MemoryRepository`; deployed environments use the server-only `SupabaseRepository` with `STORAGE_BACKEND=supabase`.

## Supabase migration order
1. `001_phase1.sql` creates the six lifecycle tables and demo owners.
2. `002_atomic_create.sql` introduces transactional Create.
3. `003_production_schema_alignment.sql` aligns RPC contracts, enables RLS, and restricts server writes to `service_role`.
4. `004_bind_domain.sql` adds verified domain binding.
5. `005_develop.sql` adds atomic Develop.
6. `006_park.sql` adds atomic Park.
7. `007_reactivate.sql` adds atomic Reactivate.
8. `008_transfer.sql` hardens transfer tokens and adds atomic ownership transfer.
9. `009_continue.sql` adds atomic successor continuation.

Mutation RPCs return one JSON object containing `agent`, `owner`, `version`, and `event`, matching `SupabaseRepository`. Public, `anon`, and `authenticated` roles cannot execute them.

## Domain and development
`DomainVerificationService` keeps HTTPS proof separate from persistence. `DevelopmentService` keeps GPT-5.6 structured work separate from persistence. Both are deterministic under tests. Each successful operation appends one immutable version and event.

## Park and Reactivate
Park copies the complete current state, appends a private Park Record, creates a `PARKED` version and event, and changes availability to `PARKED`. Reactivate copies that checkpoint, appends a private Reactivation Record, creates a `REACTIVATED` version and event, and restores `ACTIVE` availability.

## Transfer
`initiateTransferLifecycle` authorizes the current ACTIVE owner, requires the completed Reactivate trail, validates the intended different owner and private handoff summary, generates 256 bits of cryptographic randomness, hashes the raw token with SHA-256, and stores only the hash.

Migration `008_transfer.sql` adds `from_version` and `handoff_summary` to the existing transfer-token table, makes token hashes unique, and permits temporary Agent status `TRANSFERRED`. Transfer offers expire within 30 minutes; the application uses 15 minutes. Creating a new offer invalidates any previous unaccepted offer for the Agent.

Acceptance locks the offer and Agent rows, checks intended owner, expiry, single-use status, original owner, ACTIVE status, and the exact version captured at offer creation. It then appends a private Transfer Record, creates the next `TRANSFERRED` version and one `TRANSFER` event, changes `owner_id`, sets status `TRANSFERRED`, and marks the token accepted atomically. A later state change makes an offer stale.

The raw token appears only in the private acceptance URL and is never stored. `SupabaseRepository.transferOffer` reads by hash on the server and maps a projection that omits the hash.

## Continue
`continueAgentLifecycle` authorizes the successor owner, requires Agent status and current version type `TRANSFERRED`, and validates the private continuation objective.

Migration `009_continue.sql` locks the Agent, verifies the matching `TRANSFER` event, copies the entire transferred checkpoint, appends a private Continuation Record, creates the next `CONTINUED` version and one `CONTINUE` event, and restores `ACTIVE` availability. The inherited version number is recorded explicitly.

## Demo authorization and reset safety
The transfer acceptance page can return through `/demo` while preserving only a validated internal `/transfer/` path. Production reset is disabled both in the server action and UI; reset remains available only with in-memory storage.

## Projection boundaries
Private detail queries return all versions in ascending order. Public projection returns stable identity, verified domain, current version and availability, latest safe development summary, and generic transfer/continuation badges. It never returns token material, owner identifiers, handoff summary, continuation objective, raw owner submissions, private lifecycle reasons, or complete transferable state.
