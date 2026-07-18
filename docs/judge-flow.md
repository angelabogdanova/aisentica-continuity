# Judge flow

1. Visit `/` and read the lifecycle.
2. Open `/demo` and select Owner A.
3. Open Atlas, created in Phase 1 at State Version 1 with a CREATE event.
4. Confirm the private page displays the current normalized application hostname, then select **Bind current domain**.
5. Observe the same-origin HTTPS challenge complete and Atlas advance to State Version 2 with a `BIND_DOMAIN` event and verified canonical domain.
6. Open Atlas's public card and confirm the verified domain is visible while the owner, token, private rules, and event metadata remain absent.
7. Select Owner B and confirm Atlas's private page remains inaccessible.

Do not reset the production demonstration. Develop, Park, Reactivate, Transfer, and Continue remain unimplemented.
