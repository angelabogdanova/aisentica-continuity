# Authoritative lifecycle specification

Aisentica's canonical lifecycle is **Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue**. Identity, canonical domain, and immutable state history persist across every implemented stage.

## Implemented

### Phase 1 — Create
A validated manifest becomes immutable Agent Version 1 and a CREATE event.

### Phase 2 — Bind Domain
The authenticated owner binds an Agent to the normalized current application hostname through a same-origin HTTPS challenge. Success preserves Version 1, establishes `canonicalDomain`, creates `DOMAIN_BINDING` Version 2, and records `BIND_DOMAIN`.

### Phase 3 — Develop
An ACTIVE, domain-bound Agent's owner submits a bounded work episode. GPT-5.6 treats the submission as untrusted owner-supplied material, performs the work, and returns a strict Development Record containing safe reusable professional state. The operation preserves all prior state, appends the record to `developmentHistory`, creates the next sequential `DEVELOPMENT` version, and records exactly one `DEVELOP` event. Develop can repeat without rewriting prior versions.

Public identity exposes only the latest safe `publicDevelopmentSummary`; raw task, context/evidence, success criteria, private manifest rules, owner identity, and complete state remain private.

## Not implemented

Park/Reactivate changes availability without deleting state; Transfer performs controlled ownership handoff; Continue resumes under the new owner. No future stage may copy an Agent or rewrite history.
