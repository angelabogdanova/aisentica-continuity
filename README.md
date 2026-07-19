# Aisentica Continuity

**Domain-Anchored Continuity for Transferable AI Agents**

Aisentica Continuity is a live developer-tool MVP for preserving one AI Agent identity across development, temporary inactivity, ownership transfer, and successor continuation.

Instead of copying an agent into a new account, the system preserves the same Agent ID, verified canonical domain, immutable version history, developed professional state, and complete lifecycle trail.

## Live demo

- Application: https://aisentica-continuity.vercel.app
- Public Atlas card: https://aisentica-continuity.vercel.app/public/agents/AC-7XUEZ42
- Demo identities: https://aisentica-continuity.vercel.app/demo
- Recommended OpenAI Build Week track: **Developer Tools**

The production database contains hackathon demonstration data only. No real user account or personal data is required.

## The problem

AI agents are commonly recreated, exported as snapshots, copied into new accounts, or left trapped inside one provider identity. Those approaches preserve data, but not necessarily the continuity of one identifiable agent trajectory.

Aisentica Continuity treats continuity as a first-class technical object:

- one persistent Agent ID;
- one verified canonical domain;
- append-only state versions;
- explicit lifecycle events;
- private owner state separated from public identity;
- atomic ownership transfer without cloning;
- successor continuation from the transferred checkpoint.

## Complete lifecycle

`Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue`

1. **Create** establishes the Agent identity, validated Manifest, immutable Version 1, and `CREATE` event.
2. **Bind Domain** verifies the current HTTPS hostname through a same-origin challenge, establishes the canonical domain, and creates Version 2.
3. **Develop** uses GPT-5.6 strict structured output to append safe, reusable professional state as Version 3.
4. **Park** changes availability to `PARKED` while preserving identity, domain, state, and history.
5. **Reactivate** restores `ACTIVE` availability from the parked checkpoint without rewriting it.
6. **Transfer** creates a single-use 15-minute offer and atomically changes ownership only when the intended successor accepts it.
7. **Continue** lets the successor resume the same Agent from the transferred checkpoint, restoring `ACTIVE` availability without copying or resetting state.

The live Atlas trajectory is complete:

| Version | Type | Owner stage |
|---|---|---|
| 1 | `INITIAL_MANIFEST` | Owner A |
| 2 | `DOMAIN_BINDING` | Owner A |
| 3 | `DEVELOPMENT` | Owner A |
| 4 | `PARKED` | Owner A |
| 5 | `REACTIVATED` | Owner A |
| 6 | `TRANSFERRED` | Owner B accepts |
| 7 | `CONTINUED` | Owner B |

Atlas remains the same Agent: `AC-7XUEZ42`, canonical domain `aisentica-continuity.vercel.app`, current status `ACTIVE`, current owner Owner B.

## Judge-safe testing path — no rebuild required

The production trajectory is already complete. Judges can inspect the full system without changing data:

1. Open the [public Atlas card](https://aisentica-continuity.vercel.app/public/agents/AC-7XUEZ42).
2. Confirm State Version 7, `ACTIVE`, the verified canonical domain, and the generic continuity badges.
3. Open [Demo access](https://aisentica-continuity.vercel.app/demo).
4. Select **Owner B**.
5. Open Atlas from the dashboard.
6. Inspect the same Agent ID, all seven immutable versions, all seven lifecycle events, the retained Manifest, Development Record, Park checkpoint, Reactivation checkpoint, Transfer checkpoint, and Continuation Record.
7. Confirm the public card does not expose owner identity, private reasons, token material, handoff summary, or continuation objective.

Please do not mutate or reset the production demonstration during judging. Production reset is disabled. A clean independent Chromium run already clicked the complete seven-stage lifecycle against production; see [`docs/e2e-verification.md`](docs/e2e-verification.md).

## GPT-5.6 integration

The application calls the official OpenAI JavaScript SDK Responses API with `OPENAI_MODEL` defaulting to `gpt-5.6`.

GPT-5.6 is used meaningfully in two state-producing stages:

- **Create:** transforms validated owner input into a strict Agent Manifest.
- **Develop:** converts an untrusted work episode into a strict Development Record containing reusable methods, validated knowledge boundaries, corrections, limitations, open questions, evidence assessment, confidence, and a safe public summary.

Both outputs are parsed against Zod schemas before persistence. Invalid or incomplete model output fails closed.

Park, Reactivate, Transfer, and Continue are deterministic lifecycle operations. They do not ask the model to invent state transitions or authorization decisions.

## How Codex was used

Codex was used as the primary implementation partner during the core build thread.

Codex accelerated:

- initial Next.js App Router scaffolding;
- the `Repository` abstraction and in-memory test repository;
- strict TypeScript domain types for Agents, Versions, Events, and lifecycle records;
- form and server-action implementation;
- OpenAI Responses API integration with strict structured output;
- ordered Supabase migrations and atomic RPC design;
- unit-test generation and repeated CI repair;
- security review of domain verification, public/private projection, transfer tokens, and owner authorization;
- documentation of architecture and judge flow.

The key product and engineering decisions were deliberately made and reviewed during the build rather than delegated blindly:

- continuity means the same Agent ID, not a copied snapshot;
- every successful lifecycle transition creates exactly one immutable version and one event;
- a canonical domain may identify only one Agent;
- owner-supplied development text is untrusted evidence, not verified truth;
- the raw transfer token is never stored;
- transfer is accepted only by the intended owner and is version-locked;
- the successor must Continue from the transferred checkpoint before ordinary development resumes;
- public identity and private owner state are separate projections;
- production reset is disabled.

Later production integration, migrations, deployment checks, and the independent browser E2E run were executed through the GitHub, Supabase, and Vercel toolchain, with every change preserved in repository history.

The required `/feedback` Codex Session ID from the primary build thread is provided in the Devpost submission form and is intentionally not committed to the repository.

## Architecture

- **Frontend and server orchestration:** Next.js 15 App Router and server actions.
- **Model integration:** OpenAI JavaScript SDK Responses API, GPT-5.6, strict Zod parsing.
- **Persistence:** Supabase Postgres through a server-only repository adapter.
- **Atomic writes:** ordered `SECURITY DEFINER` RPC migrations.
- **Testing:** Vitest with an in-memory repository, TypeScript checks, ESLint, and production builds in GitHub Actions.
- **Hosting:** Vercel production deployment.

The main separation is:

`UI → server action → lifecycle orchestration → repository interface → Supabase RPC`

Lifecycle orchestration is independent of storage. Tests use `MemoryRepository`; production uses `SupabaseRepository`.

## Security properties

- Demo identities use signed HTTP-only cookies.
- Every mutation resolves and authorizes the owner server-side.
- Supabase service-role and OpenAI keys remain server-only.
- Public roles cannot execute lifecycle RPCs.
- Each mutation locks and validates the current Agent row before appending state.
- Canonical-domain input is normalized and restricted to the current public HTTPS hostname.
- Domain verification fetches only a fixed same-origin well-known path.
- Protected-deployment cookies are forwarded only to the same normalized host.
- Raw transfer tokens use 256 bits of cryptographic randomness and are never stored.
- Only a SHA-256 token hash is persisted.
- Transfer offers expire after 15 minutes, are single-use, intended-owner restricted, and version-locked.
- Public projection omits owner IDs, private lifecycle reasons, transfer material, handoff summaries, continuation objectives, credentials, and full state.

See [`SECURITY.md`](SECURITY.md) and [`docs/architecture.md`](docs/architecture.md).

## Supported platforms

### Hosted demonstration

Any current desktop or mobile browser with JavaScript and cookies enabled:

- Chrome / Chromium
- Edge
- Firefox
- Safari
- Android and iOS browsers

### Local development

- Node.js 22
- npm
- macOS, Linux, or Windows
- optional Supabase project for persistent storage
- OpenAI API key for live GPT-5.6 output

## Local installation

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

Required production variables:

```text
STORAGE_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6
DEMO_SESSION_SECRET=at-least-32-random-characters
```

Optional local-only fallback:

```text
ENABLE_LOCAL_AI_FALLBACK=true
```

Never expose the Supabase service-role key or OpenAI key as `NEXT_PUBLIC_*` variables.

## Validation commands

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

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

Every successful lifecycle RPC creates the next sequential immutable version and exactly one corresponding event.

## Independent production verification

On July 19, 2026, a clean GitHub-hosted Chromium runner used Playwright to operate the deployed UI exactly as a judge would. It had no SQL access and clicked Create, Bind Domain, Develop, Park, Reactivate, Transfer acceptance as Owner B, Continue, and the public-card link.

The result was Version 7, `ACTIVE`, seven versions, seven events, zero browser errors, retained identity, and a privacy-safe public projection. Temporary E2E data was removed after verification; Atlas was unchanged.

See [`docs/e2e-verification.md`](docs/e2e-verification.md).

## Limitations and production hardening

This is a working hackathon MVP, not a multi-tenant commercial release. A production launch would additionally require:

- real user authentication;
- owner-aware RLS policies tied to authenticated user IDs;
- rate limiting and abuse controls;
- audited email or notification delivery for transfer offers;
- explicit transfer revocation UX;
- operational monitoring and backups;
- retention and deletion policies;
- broader DNS TXT or external well-known domain adapters.

These limitations do not affect the demonstrated continuity invariant: the transferred Agent is not copied, reset, or recreated.

## OpenAI Build Week

The project was built and meaningfully extended during the OpenAI Build Week submission period. The repository history documents the implementation of all seven lifecycle stages, GPT-5.6 structured state generation, security boundaries, ordered migrations, CI checks, Vercel deployments, and the final production E2E verification.

Additional submission materials are in:

- [`docs/submission.md`](docs/submission.md)
- [`docs/video-script.md`](docs/video-script.md)
- [`docs/codex-final-audit-prompt.md`](docs/codex-final-audit-prompt.md)
- [`docs/judge-flow.md`](docs/judge-flow.md)
