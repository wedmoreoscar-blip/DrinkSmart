# Change Safety

## Working tree

- Treat existing modified and untracked files as user-owned unless provenance is known.
- Never stage blindly, stash, revert, delete, or absorb unrelated work.
- Inspect the complete diff and Git status before reporting completion or committing.
- Stage explicit reviewed paths only. Never push without an explicit user request.
- Never print or commit `.env` values, API keys, Supabase secrets, generated output, build output, or
  local client state.

## Isolated delegated writes

Use `.worktrees/<client>-<task>` on `agent/<client>/<task>` for delegated implementation. Each task has
one authenticated write lease. A writer stops all writing processes and releases before a reviewer
claims. A failed reviewer releases before the original writer gets the single repair attempt.

State under `.worktrees/.state/` is local coordination data, not a project ledger. Do not edit it by
hand to bypass a rejected transition.

## Review and integration

- Review the actual diff against the approved plan and independently run relevant checks.
- Retain focused regression tests when they protect real behavior.
- Record `READY_TO_INTEGRATE` only for the reviewer-cleared commit.
- Integrate into a clean, non-overlapping target. Stop if the target moved incompatibly or user changes
  overlap.
- Re-run relevant verification from the integrated checkout before recording `INTEGRATED`.
- Keep the worktree until integration verification succeeds. Cleanup refuses dirty or active work.

## External and destructive operations

Remote migrations, edge-function deployment, secret changes, production data changes, native release
publishing, and pushes require explicit user authorization. Use `tools/agent-lock` for shared dependency
installs, dev servers, Supabase-local mutations, benchmarks, or other resource-heavy jobs.
