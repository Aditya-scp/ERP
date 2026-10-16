Workflow: /verify
Run the full verification suite for the work just completed and report honestly.
1. Run pnpm lint, pnpm typecheck and pnpm test.
2. Run pnpm test:rls (pgTAP tests) against the local Supabase stack.
3. Run pnpm test:e2e for the module just built.
4. Open the app in the browser, log in with seed accounts for each affected role, and walk the main flow of the module. Take screenshots.
5. Report three lists: passed, failed, not verified. Do not hide or soften failures. If anything failed, propose the root cause before fixing.