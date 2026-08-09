# Change Safety

## Working tree

- Treat existing modified and untracked files as user-owned unless provenance is known.
- Never stage blindly, stash, revert, delete, or absorb unrelated work.
- Inspect the complete diff and Git status before reporting completion or committing.
- Stage explicit reviewed paths only. Never push without an explicit user request.
- Never print or commit `.env` values, API keys, Supabase secrets, generated output, build output, or
  local client state.

## Isolated delegated writes

Delegated implementations run through Traycer in Traycer-managed worktrees, never against the
workspace folder itself. The main checkout stays user-owned. Every delegation is commissioned by a
spec written with the `writespec` skill; the spec names the only files the implementer may modify.

## Review and integration

- Verify every delegated diff with the `speccheck` skill before accepting it: enumerate the spec's
  clauses, map clauses to hunks and hunks to clauses, and write acceptance tests from the spec, not
  the code.
- **The checker owns the repair loop after handback.** Fix localized failures and their regression
  tests inline when the production correction is roughly twenty changed lines or less and stays
  inside the commissioned allowlist. The original model assignment, task category, warm context,
  or implementer availability never justifies another round trip.
- Re-contact an implementer only for a whole missing clause, a substantially wrong approach, a
  required scope/authority expansion, or a capability/infrastructure gap. Before sending anything,
  state which exception applies and the concrete evidence. Re-engaging a warm agent remains new
  delegated work and requires the user's confirmation.
- Retain focused regression tests when they protect real behavior.
- Integrate only spec-checked work into a clean, non-overlapping target. Stop if the target moved
  incompatibly or user changes overlap.
- Re-run relevant verification from the integrated checkout before reporting integration.
- Keep the delegated worktree until integration verification succeeds.

## External and destructive operations

Remote migrations, edge-function deployment, secret changes, production data changes, native release
publishing, and pushes require explicit user authorization. Use `tools/agent-lock` for shared dependency
installs, dev servers, Supabase-local mutations, benchmarks, or other resource-heavy jobs.
