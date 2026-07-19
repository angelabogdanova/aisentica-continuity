# Judge flow

1. Select Owner A and open Atlas.
2. Inspect the same Agent ID, verified canonical domain, and immutable Version History.
3. Confirm `CREATE`, `BIND_DOMAIN`, and `DEVELOP` in the event trail.
4. Park Atlas and confirm the next sequential version, status `PARKED`, and exactly one `PARK` event.
5. Confirm Develop is unavailable while parked and the public card exposes no private parking reason.
6. Reactivate Atlas using the example reason.
7. Confirm the next sequential version is `REACTIVATED`, status returns to `ACTIVE`, and exactly one `REACTIVATE` event appears.
8. Confirm Versions 1 through the parked checkpoint are unchanged and the verified domain, Manifest, Development Record, and Park Record remain intact.
9. Confirm Develop is available again after Reactivate.
10. Open the public card and confirm it shows safe public identity, verified domain, public development summary, ACTIVE status, and reactivated continuity badge—not private lifecycle reasons or owner identity.
11. Select Owner B and confirm Atlas remains inaccessible privately.

Do not reset production. Transfer and Continue are not implemented.
