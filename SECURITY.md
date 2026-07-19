# Security
OpenAI and Supabase service-role keys are server-only environment variables and are never serialized to clients. Demo identity is a signed, HTTP-only cookie; every mutation resolves and authorizes its owner server-side. Public cards intentionally omit owner identity, private-owner rules, event metadata, and configuration. This is demonstration authentication, not production access control: replace it with production auth, RLS, rate limiting, logging, and transactional Supabase writes before launch.

## Same-origin domain proof
Phase 2 accepts only a validated public hostname from the current request Host and fetches only its fixed HTTPS well-known path. Protocols, paths, ports, credentials, localhost, and IP literals are rejected. While verification is pending, the public proof contains only the protocol name, Agent ID, normalized domain, and random token; it contains no owner, session, manifest, or secret configuration. Arbitrary external domain verification is deferred to a future DNS TXT or external well-known adapter.

## Development state
Development form text is untrusted owner-supplied data and is never treated as verified fact or system instruction. It is bounded and validated server-side, sent only through the server-only OpenAI integration, and never rendered as HTML. The transferable record excludes credentials, personal identifiers, private preferences, and unsafe retention content. Public projection contains only the explicitly safe public development summary.
