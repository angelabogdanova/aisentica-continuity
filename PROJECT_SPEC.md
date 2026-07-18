# Authoritative lifecycle specification

Aisentica's canonical lifecycle is **Create → Bind Domain → Develop → Park → Reactivate → Transfer → Continue**. Identity, canonical domain, and versioned state history must persist across all stages.

## Implemented

### Phase 1 — Create
A validated manifest becomes immutable Agent Version 1 and a CREATE event.

### Phase 2 — Bind Domain
The authenticated owner may bind an unbound Agent to the normalized hostname of the current application request. A random challenge is exposed temporarily through the minimal same-origin `/.well-known/aisentica-continuity/[agentId]` proof route. The server verifies that proof over HTTPS before one atomic operation marks the binding verified, sets `canonicalDomain`, creates `DOMAIN_BINDING` Version 2 while preserving the original manifest, and records a `BIND_DOMAIN` event. Failed proof never advances the Agent.

Arbitrary external domains are intentionally deferred. A production extension can support DNS TXT or externally hosted well-known proofs without changing continuity semantics.

## Not implemented

Develop adds versioned state; Park/Reactivate changes availability without deleting state; Transfer issues and accepts a controlled ownership handoff; Continue resumes under the new owner. No future stage may copy an Agent or rewrite history.
