# Authoritative lifecycle specification

Aisentica's canonical lifecycle is **Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue**. Identity, canonical domain, and immutable state history persist across every stage.

## Phase 1 — Create
A validated manifest becomes immutable Agent Version 1 and a `CREATE` event.

## Phase 2 — Bind Domain
The authenticated owner binds an Agent to the normalized current hostname through a same-origin HTTPS challenge. Success preserves Version 1, establishes `canonicalDomain`, creates `DOMAIN_BINDING` Version 2, and records `BIND_DOMAIN`.

## Phase 3 — Develop
An ACTIVE, domain-bound Agent's owner submits a bounded work episode. GPT-5.6 treats the submission as untrusted owner-supplied material and returns a strict Development Record containing safe reusable professional state. The operation appends the record, creates the next sequential `DEVELOPMENT` version, and records exactly one `DEVELOP` event.

## Phase 4 — Park
The authenticated owner may park an ACTIVE, developed Agent. Park changes availability to `PARKED`, appends a private Park Record, creates the next sequential `PARKED` version, and records exactly one `PARK` event without deleting or rewriting state.

## Phase 5 — Reactivate
The owner may reactivate a `PARKED` Agent. Reactivate restores `ACTIVE` availability, appends a private Reactivation Record, creates the next sequential `REACTIVATED` version, and records exactly one `REACTIVATE` event while preserving the parked checkpoint.

## Phase 6 — Transfer
The current ACTIVE owner creates a single-use transfer offer for a different existing owner. A 256-bit raw token is shown only in the private transfer link; the database stores only its SHA-256 hash. The offer expires after 15 minutes, is bound to the exact current version, and becomes stale if the Agent changes before acceptance.

Only the intended owner can accept. Acceptance atomically changes `owner_id`, changes availability to `TRANSFERRED`, appends a private Transfer Record, creates the next sequential `TRANSFERRED` version, records exactly one `TRANSFER` event, and marks the token accepted. The Agent ID, canonical domain, Manifest, developed state, Park and Reactivate records, and all prior versions remain unchanged.

## Phase 7 — Continue
The successor owner must continue from the `TRANSFERRED` checkpoint before any further development or parking. Continue appends a private Continuation Record, creates the next sequential `CONTINUED` version, records exactly one `CONTINUE` event, and restores `ACTIVE` availability. It does not create a copy or reset state.

## Public and private projection
Public identity may expose stable identity, verified domain, current version, current availability, safe development summary, and generic continuity badges. It never exposes owner identity, raw owner inputs, parking or reactivation reasons, token or token hash, handoff summary, transfer owner IDs, continuation objective, credentials, or complete private state.

The seven-stage lifecycle is implemented. Future work may harden the demonstration with real authentication, notification delivery, audited revocation, rate limits, and production owner-aware policies, but may not copy an Agent or rewrite its history.
