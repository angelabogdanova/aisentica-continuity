# Judge flow

1. Select Owner A and open Atlas.
2. Inspect the same Agent ID, verified canonical domain, and immutable Version History.
3. Confirm `CREATE`, `BIND_DOMAIN`, `DEVELOP`, `PARK`, and `REACTIVATE` in the event trail.
4. In **Transfer Atlas**, use the example private handoff summary and create the offer for Owner B.
5. Confirm the private transfer page identifies the same Agent and exact source version, shows a 15-minute expiry, and requires Owner B.
6. Select Owner B through the transfer page and accept the single-use offer.
7. Confirm the same Atlas ID moves to Owner B as the next sequential `TRANSFERRED` version, status becomes `TRANSFERRED`, and exactly one `TRANSFER` event appears.
8. Confirm Owner A no longer sees Atlas privately and Owner B does.
9. Confirm Versions 1 through the Reactivate checkpoint remain unchanged, including Manifest, verified domain, Development Record, Park Record, and Reactivation Record.
10. In **Continue Atlas**, use the continuation example and submit.
11. Confirm the next sequential version is `CONTINUED`, status returns to `ACTIVE`, exactly one `CONTINUE` event appears, and all seven lifecycle tiles are completed.
12. Confirm the successor owner can Develop again after Continue.
13. Open the public card and confirm it shows safe public identity, verified domain, public development summary, ACTIVE status, and generic transfer/continuation badges—not owner identity, token material, handoff summary, or continuation objective.
14. Confirm the accepted token cannot be reused.

Do not reset production. Production reset is disabled.
