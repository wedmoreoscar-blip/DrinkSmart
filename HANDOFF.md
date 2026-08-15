# DrinkSmart session handoff

Date: 2026-08-15 23:31 BST
Mode: normal
Repository: `/home/oscar/DrinkSmart`
Branch: `main`
Accepted commit: `2cd506a` (`docs: accept wave 5 hardening batch`)

## Completed

Wave 5 post-deployment hardening is integrated and all warm worktrees, including
`visual_check_worktree`, are level with `main`.

- The model sees only eligible catalogue items; locked and explicitly excluded IDs are removed from
  every model/tool-visible surface.
- OpenRouter routing is pinned to DeepSeek V4 Flash, DeepSeek's provider only, with provider
  fallback disabled and reasoning disabled.
- Server-side deterministic admission rejects malformed/unknown plans and totals outside ±10% of
  the remaining target; client fallback remains deterministic.
- Online Timeline re-plan receives live preferences and always clears loading state.
- Consumed drinks remain in BAC, Timeline, history, tray and wind-down calculations but are removed
  from Plan cards.
- Every Plan card that can render has working lock/unlock and delete controls.
- Abandoned active sessions expire six hours after a stable calculated plan end, including delays and
  reloads.

## Verification

- `npm test -- --run`: 36 files, 205 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run lint`: unchanged known baseline, 11 errors and 12 warnings.
- `git diff --check`: passed.
- Live Supabase, OpenRouter, browser, native and visual checks were not run.

## Current blocker / next investigation

The deployed `generate-plan` POST is currently returning HTTP 502 at the DeepSeek/OpenRouter side.
This is not explained by the local test suite. Diagnose the deployed edge-function response path,
provider configuration and logs before changing application behavior. Do not silently switch model
or provider, and do not claim live success without a real request.

User-owned unstaged changes: `package.json` and `package-lock.json`. Do not stage, revert, or delete
them.

## Read first

1. `AGENTS.md`
2. `docs/decisions.md`
3. `tasks/next_session_kickoff.md`
4. `docs/specs/W5-10-ai-planner-hardening.md`
5. `docs/specs/W5-11-session-expiry-plan-card-invariant.md`
6. `supabase/functions/generate-plan/index.ts`
7. `src/lib/generatePlan.ts`

## PROMPT

```text
Continue debugging the live generate-plan HTTP 502. The deployed POST is reaching the
DeepSeek/OpenRouter side and returning 502. First inspect the current edge-function request body,
OpenRouter provider/model/reasoning configuration, response parsing and error propagation. Compare
against the official OpenRouter routing contract and the deployed function logs if available. Keep
DeepSeek V4 Flash through DeepSeek's own provider with no reasoning and no provider fallback unless
the user explicitly changes that decision. Do not deploy, rotate secrets, apply migrations, or alter
the deterministic BAC/planning math without explicit user request. Separate source diagnosis from
live infrastructure evidence, and state BLOCKED when logs or a live request are unavailable.
```
