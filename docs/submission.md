# OpenAI Build Week submission draft

## Project name

Aisentica Continuity

## Tagline

Domain-anchored identity and immutable lifecycle continuity for transferable AI Agents.

## Recommended track

Developer Tools

## One-sentence description

Aisentica Continuity proves that an AI Agent can be developed, parked, reactivated, transferred to a successor owner, and continued as the same identifiable Agent rather than copied or reset.

## Project description

AI agents are usually treated as account-bound tools or exportable snapshots. When ownership changes, the common solution is to copy configuration and memory into a new account. That preserves some data, but it does not prove continuity of one Agent identity.

Aisentica Continuity is a live developer-tool MVP that makes continuity explicit and verifiable. Every Agent receives a persistent ID, a verified canonical domain, an immutable sequence of state versions, and a lifecycle event trail. The complete lifecycle is:

`Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue`

The transfer stage does not clone the Agent. The current owner creates a short-lived, single-use transfer offer for one intended successor. Acceptance atomically changes ownership and appends the next immutable version. The successor then continues from that exact transferred checkpoint. The Agent ID, canonical domain, Manifest, developed professional state, and all previous versions remain unchanged.

The live Atlas demonstration has completed all seven stages. Atlas began under Owner A and now exists under Owner B as Version 7 with the same ID and verified domain.

## What it does

- creates a strict GPT-5.6-generated Agent Manifest;
- binds one canonical HTTPS domain through a same-origin proof;
- uses GPT-5.6 to convert a work episode into safe reusable professional state;
- parks and reactivates the Agent without deleting history;
- creates version-locked, single-use transfer offers;
- atomically transfers ownership to the intended successor;
- requires the successor to Continue from the transferred checkpoint;
- exposes a privacy-safe public identity card;
- preserves complete private state and immutable Version History for the authorized owner.

## How GPT-5.6 is used

GPT-5.6 is integrated through the official OpenAI JavaScript SDK Responses API.

During Create, GPT-5.6 produces a strict Agent Manifest from validated input. During Develop, it produces a strict Development Record containing reusable methods, validated knowledge boundaries, corrections, evidence assessment, open questions, limitations, confidence, and a safe public summary.

Both outputs are parsed with Zod before persistence and fail closed when invalid. Owner-supplied evidence is explicitly treated as untrusted material rather than automatically verified truth.

The remaining lifecycle transitions are deterministic so the model cannot invent authorization or ownership changes.

## How Codex was used

Codex was the primary implementation partner in the main build thread. It accelerated the Next.js scaffold, TypeScript domain model, repository abstraction, server actions, OpenAI structured-output integration, Supabase migrations, lifecycle forms, unit tests, CI repair, and security review.

The central product decisions were reviewed deliberately during the collaboration: continuity must preserve one Agent ID; state versions must be append-only; domain identity must be unique; transfer tokens must never be stored raw; transfer must be intended-owner and version restricted; successor continuation must resume the exact checkpoint; and public identity must remain separate from private owner state.

Production integration and verification were completed through the GitHub, Supabase, and Vercel toolchain, with all changes preserved in repository history.

## Technical architecture

- Next.js 15 App Router
- React 19
- TypeScript
- OpenAI JavaScript SDK and GPT-5.6
- Zod strict structured-output validation
- Supabase Postgres
- atomic `SECURITY DEFINER` lifecycle RPCs
- Vercel production hosting
- Vitest, ESLint, TypeScript, Next.js production build
- GitHub Actions CI

Main flow:

`UI → server action → lifecycle orchestration → repository interface → atomic Supabase RPC`

## Security design

- signed HTTP-only demo identity cookies;
- server-side owner authorization for every mutation;
- server-only OpenAI and Supabase secrets;
- lifecycle RPCs unavailable to public roles;
- canonical-domain normalization and fixed same-origin proof path;
- 256-bit transfer tokens with only SHA-256 hashes stored;
- 15-minute expiry, single use, intended-owner restriction, and exact-version locking;
- row locks during transfer acceptance;
- no owner IDs, token material, private reasons, handoff summaries, or continuation objectives in the public projection;
- production reset disabled.

## Biggest challenges

The hardest part was proving continuity rather than merely moving data. Transfer had to change ownership while preserving all previous versions byte-for-byte in meaning and preventing stale or replayed offers.

A second challenge appeared during the independent production browser test. A protected Vercel alias was accessible to the browser through an authorization cookie, but the server-side same-origin domain-proof fetch did not carry that cookie. The E2E run exposed the problem before submission. The fix forwards the current request cookie only to the exact normalized proof host, preserving both protection and the domain-security boundary.

## Accomplishments

- complete seven-stage lifecycle implemented in production;
- one Agent transferred between owners without copying or reset;
- immutable sequential state versions and events;
- privacy-safe public identity projection;
- real GPT-5.6 state generation with strict validation;
- atomic transfer and continuation RPCs;
- independent Playwright production run through all seven UI stages;
- zero browser errors in the successful full-path run;
- temporary test data removed after verification;
- live Atlas remained unchanged.

## What we learned

Agent continuity is not equivalent to memory export. It requires a stable identity, provenance, a versioned state trajectory, authorization boundaries, and explicit rules for what remains public or private.

We also learned that end-to-end browser verification catches infrastructure interactions that unit tests cannot, especially when deployment protection, server-side verification, and cookies meet at the same-origin boundary.

## What is next

A commercial version would add real user authentication, owner-aware RLS, notification delivery, transfer revocation, rate limiting, operational monitoring, backup and retention policies, and DNS TXT or external well-known domain adapters.

The continuity invariant will remain unchanged: transfer moves the same Agent trajectory rather than creating a copy.

## Live links

- Demo: https://aisentica-continuity.vercel.app
- Public Atlas card: https://aisentica-continuity.vercel.app/public/agents/AC-7XUEZ42
- Demo identity selector: https://aisentica-continuity.vercel.app/demo
- Repository: https://github.com/angelabogdanova/aisentica-continuity

## Judge testing instructions

1. Open the public Atlas card and inspect Version 7, `ACTIVE`, verified domain, and continuity badges.
2. Open Demo access and select Owner B.
3. Open Atlas from the dashboard.
4. Inspect all seven immutable versions and all seven lifecycle events.
5. Confirm one ID and one canonical domain persist across Owner A and Owner B stages.
6. Confirm the public card does not reveal private owner or transfer data.
7. Do not mutate or reset production.

Full instructions: [`judge-flow.md`](judge-flow.md)

## Repository access

Current repository visibility: private.

Before submission, invite both judging accounts as repository collaborators:

- testing@devpost.com
- build-week-event@openai.com

Alternative: make the repository public and add an appropriate open-source license.

## Demo video

Public YouTube URL: `[ADD AFTER UPLOAD]`

Required duration: under three minutes.

Script: [`video-script.md`](video-script.md)

## Codex Session ID

Primary `/feedback` Codex Session ID: `[PASTE INTO DEVPOST FORM — DO NOT INVENT]`

Use the primary thread where the majority of the core functionality was built.

## Final submission checklist

- [ ] Select Developer Tools track.
- [ ] Paste the project description.
- [ ] Add public YouTube video under three minutes.
- [ ] Confirm the video includes spoken explanation of Codex and GPT-5.6.
- [ ] Add repository URL.
- [ ] Share private repository with both judging email addresses or make it public with a license.
- [ ] Run `/feedback` in the primary Codex build thread.
- [ ] Paste the exact Session ID into Devpost.
- [ ] Confirm README, setup instructions, supported platforms, and no-rebuild test path.
- [ ] Recheck the production demo and public Atlas card.
- [ ] Submit before July 21, 2026 at 5:00 PM Pacific Time.
