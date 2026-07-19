# Judge flow

## Recommended inspection path

The production Atlas trajectory is already complete and should be inspected without mutation.

1. Open the public card: https://aisentica-continuity.vercel.app/public/agents/AC-7XUEZ42
2. Confirm:
   - Agent ID `AC-7XUEZ42`;
   - State Version 7;
   - status `ACTIVE`;
   - verified canonical domain `aisentica-continuity.vercel.app`;
   - developed-state, reactivation, transfer, and continuation badges;
   - owner shown only as `Not disclosed`.
3. Open Demo access: https://aisentica-continuity.vercel.app/demo
4. Select **Owner B**. Atlas belongs to Owner B after the completed transfer.
5. Open Atlas from the dashboard.
6. Inspect the immutable Version History:
   - Version 1 — `INITIAL_MANIFEST`;
   - Version 2 — `DOMAIN_BINDING`;
   - Version 3 — `DEVELOPMENT`;
   - Version 4 — `PARKED`;
   - Version 5 — `REACTIVATED`;
   - Version 6 — `TRANSFERRED`;
   - Version 7 — `CONTINUED`.
7. Inspect the event trail and confirm exactly one event for each lifecycle stage:
   - `CREATE`;
   - `BIND_DOMAIN`;
   - `DEVELOP`;
   - `PARK`;
   - `REACTIVATE`;
   - `TRANSFER`;
   - `CONTINUE`.
8. Confirm Versions 1–5 remain preserved after Transfer and Version 6 remains preserved after Continue.
9. Confirm the same Agent ID, canonical domain, Manifest, Development Record, parked checkpoint, and complete prior history remain present under Owner B.
10. Return to the public card and confirm it does not expose:
    - Owner A or Owner B identity;
    - private parking or reactivation reasons;
    - raw transfer token or token hash;
    - handoff summary;
    - continuation objective;
    - complete private structured state.

## Independent full-path evidence

A clean GitHub-hosted Chromium runner used Playwright to click the complete production lifecycle through the real UI on July 19, 2026. It created a separate test Agent, completed all seven stages, verified the public projection, and reported zero browser errors. The test Agent was removed afterwards and Atlas remained unchanged.

See [`e2e-verification.md`](e2e-verification.md).

## Important

Do not reset or mutate the production demonstration during judging. Production reset is disabled. The private Owner B view is provided for inspection of the completed trajectory, not for changing Atlas.
