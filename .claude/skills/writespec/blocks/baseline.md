
## What you run, and what you do not

Run exactly these two, from the root of your worktree:

- `npm run typecheck` — the one check that catches your own errors before handback.
- `npx vitest run` — cheap, and confirms you broke nothing that already worked.

**Do not run `npm run lint` or `npm run build`.** They belong to the checker, who runs the full
baseline on the integration branch after review. They are the two most expensive commands in this
repository and the least informative to you: lint is known-failing at a fixed count you cannot
improve, and build tells you nothing typecheck did not. Several implementers run in parallel on a
2-core machine, so an unnecessary build starves every other agent and yourself.

Do not run `npm install` or `npm ci`. Your worktree is already provisioned.
Do not run `git commit`, `git push`, or any `supabase` command. Leave your work uncommitted; the
orchestrator commits the handback.

If a command is still running when you have everything you need, stop it and report. A result you
are waiting on is not worth more than the report.

Browser, Supabase, edge-function, notification and native/Capacitor checks are BLOCKED: that
infrastructure is not available to you. Do not attempt them, and never claim them.
