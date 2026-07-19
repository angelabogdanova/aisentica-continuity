# Independent production UI verification

## Result

A clean GitHub-hosted Chromium runner completed the entire Aisentica Continuity lifecycle through the deployed browser interface on July 19, 2026.

The runner did not call Supabase SQL or lifecycle RPCs directly. It used Playwright to click the same forms and server actions available to a judge.

Final result:

```json
{
  "success": true,
  "agentId": "AC-2B6TGEU",
  "agentName": "Atlas E2E 20260719092826",
  "finalVersion": 7,
  "finalStatus": "ACTIVE",
  "stages": [
    "CREATE",
    "BIND_DOMAIN",
    "DEVELOP",
    "PARK",
    "REACTIVATE",
    "TRANSFER",
    "CONTINUE"
  ],
  "browserErrors": [],
  "completedAt": "2026-07-19T09:29:41.961Z"
}
```

## Browser actions

The independent runner:

1. opened the protected deployed application;
2. selected Owner A;
3. created a new Agent through the production Create form and live GPT-5.6 integration;
4. completed the real same-origin HTTPS domain proof;
5. submitted the Develop example through GPT-5.6;
6. parked the Agent;
7. reactivated the Agent;
8. created a transfer offer for Owner B;
9. switched to Owner B through the transfer page;
10. accepted the transfer;
11. continued the same Agent;
12. opened the public Agent card;
13. verified Version 7, ACTIVE status, transfer and continuation badges, and undisclosed owner identity;
14. checked that public content did not expose owner names or private handoff data.

## Database verification

After the browser completed, an independent database read confirmed:

- final owner: Owner B;
- final status: `ACTIVE`;
- current version: 7;
- version count: 7;
- event count: 7;
- version sequence:
  - `INITIAL_MANIFEST`;
  - `DOMAIN_BINDING`;
  - `DEVELOPMENT`;
  - `PARKED`;
  - `REACTIVATED`;
  - `TRANSFERRED`;
  - `CONTINUED`;
- event sequence:
  - `CREATE`;
  - `BIND_DOMAIN`;
  - `DEVELOP`;
  - `PARK`;
  - `REACTIVATE`;
  - `TRANSFER`;
  - `CONTINUE`;
- accepted offer bound to source Version 5;
- one accepted transfer offer;
- stored transfer digest length: 64 hexadecimal characters.

## Issue discovered by E2E testing

The first complete protected-deployment attempt exposed an infrastructure interaction not visible in unit tests.

The browser had valid Vercel deployment authorization, but the server-side same-origin domain-proof request did not forward the current protected-deployment cookie. The proof endpoint therefore rejected a legitimate verification attempt.

The production fix:

- forwards the current request cookie only to the exact normalized same-origin proof host;
- never forwards it to an arbitrary or cross-origin destination;
- preserves hostname normalization and fixed proof-path restrictions;
- preserves unique canonical-domain enforcement;
- includes focused tests;
- passed lint, strict TypeScript, unit tests, and production build.

The successful full-path run was performed after this fix reached production.

## Cleanup

The temporary E2E Agent and two incomplete technical test Agents were deleted after verification. The secondary test domain was released.

Cleanup verification confirmed:

- zero E2E Agents remained;
- the secondary domain was no longer bound;
- the canonical Atlas record remained unchanged:
  - ID `AC-7XUEZ42`;
  - Owner B;
  - `ACTIVE`;
  - Version 7;
  - canonical domain `aisentica-continuity.vercel.app`.

The disposable Playwright branch and workflow were removed and the temporary PR was closed without merge. The test harness did not enter `main`.
