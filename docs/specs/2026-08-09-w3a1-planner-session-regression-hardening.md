# W3-A1 — planner and session regression hardening

## Context and authority

This is the first serial foundation ticket for Wave 3. It fixes confirmed planner-contract and
session-window defects before the deterministic session engine is extended. The implementation is
non-visual and is assigned to DeepSeek V4 Flash through opencode, not Luna. Do not dispatch W3-A2
until this ticket is integrated and accepted.

The intended warm worktree is:

`/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker`

The assigning orchestrator must merge current `main` into that worktree before dispatch. The
implementer must not merge, rebase, reset, commit, or change branches; the orchestrator owns
integration.

Read these sources before editing:

- `/home/oscar/DrinkSmart/AGENTS.md`
- `/home/oscar/DrinkSmart/docs/decisions.md`, especially the deterministic-engine and planner
  arithmetic entries
- `/home/oscar/DrinkSmart/docs/workflows/verification.md`
- `/home/oscar/DrinkSmart/src/components/tabs/PlanTab.tsx`, especially `lockedContribution`, the
  preload effect, `handleGenerate`, and `handleRegenerate`
- `/home/oscar/DrinkSmart/src/lib/generatePlan.ts`, especially `GeneratePlanInput`,
  `topUpIfUnderfilled`, and `generatedDrinkToEntry`
- `/home/oscar/DrinkSmart/src/lib/greedyPlanFallback.ts`
- `/home/oscar/DrinkSmart/src/lib/sessionStore.ts`
- `/home/oscar/DrinkSmart/supabase/functions/generate-plan/index.ts`, especially the documented
  meaning of `target_ethanol_ml` and `planDrinkEthanol`; this file is read-only for this ticket

The user explicitly approved Vitest as a new development dependency on 2026-08-09. Pin `vitest`
to the Vite-5-compatible `^3.2.7` line; do not upgrade Vite, React, TypeScript, or any other
dependency. This ticket explicitly requires new deterministic tests. That task-specific requirement
supersedes the generic no-new-tests sentence in the fixed closing block appended below; no
pre-existing test exists to modify.

## Scope

Only these files may change:

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/package.json`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/package-lock.json`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/tools/test-project`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/components/tabs/PlanTab.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/lib/generatePlan.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/lib/greedyPlanFallback.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/lib/planGenerationContracts.ts` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/lib/planGenerationContracts.test.ts` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/lib/generatePlan.test.ts` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/lib/greedyPlanFallback.test.ts` (new)

Do not edit `AppContext.tsx`, `sessionStore.ts`, Timeline components, notification code, Supabase
functions, design files, styling, or any other file. If a confirmed defect cannot be fixed within
this allowlist, report it rather than expanding scope.

## Requirements

### 1. Install the deterministic test runner without changing the existing verification profiles

- Add `vitest: ^3.2.7` to `devDependencies`, update `package-lock.json`, and add
  `"test": "vitest run"` to `package.json`. Run the install through
  `tools/agent-lock dependency-install -- npm install --save-dev vitest@^3.2.7`. Add no DOM,
  browser, coverage, React-testing, or production dependency.
- Update `tools/test-project` so `quick` and `full` run `npm test` as a separately labelled check.
  Preserve the existing typecheck, lint, and build commands and their meanings.
- Tests must use explicit fixtures and numeric expectations. They must not duplicate the production
  implementation to calculate their expected values.

### 2. Make the generated-drink budget contract unambiguous and fix offline double subtraction

- Preserve the public request field name `target_ethanol_ml`, because the deployed edge function
  already accepts it. Document and enforce one meaning everywhere: it is the remaining pure-ethanol
  budget for newly generated, replaceable drinks. Any consumed or kept/locked ethanol has already
  been subtracted by the caller.
- `locked_drinks` is context describing drinks the model/fallback must not re-include in that
  remaining budget. Neither `greedyPlanFallback` nor any downstream top-up may subtract their
  ethanol from `target_ethanol_ml` again.
- Extract pure request-accounting helpers into `planGenerationContracts.ts` and have `PlanTab` use
  them rather than performing a second locked-contribution/budget calculation. Reuse
  `convertToMl`, catalog ABV data, and existing drink constants; do not introduce another serving
  size or ethanol formula.
- Add a regression test in which the total target is 60 ml, a kept drink contributes 15 ml, and
  the request budget is 45 ml. The fallback must plan against 45 ml exactly and must produce the
  same generated result whether the informational `locked_drinks` array is present or absent.
- Add boundary cases for zero remaining budget, kept ethanol exceeding the target, invalid drink
  quantities/ABVs, and no kept drinks. Remaining budget is clamped at zero; no value may become
  negative, `NaN`, or infinite.
- When the remaining budget is zero, `PlanTab` must not call the edge function or fallback and must
  not show the misleading “Built offline” notice. Applying the plan preserves only the protected
  drinks already in state.

### 3. Normalize model output without changing alcohol units

- Keep `GeneratedDrink.ml` defined as millilitres regardless of `GeneratedDrink.unit`.
  `generatedDrinkToEntry` must preserve the server-recomputed ethanol amount when converting every
  allowed unit into the client `DrinkEntry` representation.
- For `ml` and `oz` results, the client quantity represents total volume, while
  `GeneratedDrink.quantity` is a serving count and `GeneratedDrink.ml` is the per-serving volume
  override. Calculate `totalMl = (generated.ml ?? catalog.typical_ml) * generated.quantity`; store
  `totalMl` for `ml` or `totalMl / OZ_ML` for `oz`. It must never ignore quantity or store a
  millilitre number and label it ounces. Use `OZ_ML`; do not add another conversion constant.
- Add table-driven tests for `ml`, `oz`, `shots`, `pints`, and `glass`, including quantity greater
  than one and an explicit `ml` override. Recomputing ethanol from the converted entry must match
  the catalog/server value within an explicit floating-point tolerance.
- Preserve catalog-only selection, server arithmetic ownership, timeout/fallback behavior, the
  public `GeneratePlanInput`/`GeneratedPlan` shapes, and the existing model call. Do not change the
  edge prompt or trust model-provided totals.

### 4. Invalidate stale preloads and recover expired planning windows deterministically

- A cached preload is valid only for the complete request that produced it. Its identity must
  include target budget, duration, preferences, catalog, excludes, and the full kept/locked entry
  context—not only the locked ethanol total. Swapping two equal-ethanol locked drinks must invalidate
  the cached request.
- Expose a deterministic request fingerprint/helper from `planGenerationContracts.ts`. Couple each
  cached result to that fingerprint, and use it in the preload dependency and acceptance path so
  an older async response cannot overwrite a newer request. `Build the night` may use a cached
  result only when its fingerprint equals the current request. A cancelled or superseded preload
  must not become the applied plan.
- Expose a pure `resolvePlanningWindow(start, target, durationMinutes, now)` helper. If the start or
  target is absent, invalid, or the target is at/before `now`, return `start = now` and
  `target = now + durationMinutes`. If the target is still in the future, preserve the existing
  start and target. Never infer `now` inside the helper.
- `handleGenerate`, including its cached-plan branch, and `handleRegenerate` must resolve the
  planning window with one captured `now` before applying a plan. This repairs indefinitely
  persisted prior-night dates without overwriting a live or future session. `Use last night`
  continues to start at its captured current time.
- Add tests for missing dates, an expired prior-night window, exact target equality, a live
  mid-session window, a future window, midnight crossing, and two equal-ethanol locked sets with
  different catalog ids. Use epoch/date comparisons, not locale-formatted strings or fake timers.
- This ticket does not add or restyle a time picker. It repairs state semantics only; any later
  start-time control is a visual-consumer task.

## Verification baseline

- `npm test` — must PASS with the new deterministic regression suite.
- `npm run typecheck` (`tsc -b --noEmit`) — must PASS with 0 errors. Never use bare
  `tsc --noEmit`; it compiles zero project-reference files here.
- `npm run lint` — known FAIL at exactly 9 errors / 12 warnings before this ticket. It must not gain
  any error or warning. The existing `PlanTab` missing-dependency warning must be eliminated, so the
  accepted count should improve by one warning unless an unchanged baseline file moves.
- `npm run build` — must PASS.
- `git diff --check` — must PASS.
- No prior automated test suite exists, so there is no pre-ticket unit baseline to claim. The new
  Vitest suite is functional planner evidence; typecheck and build are not.
- Browser UI, real Supabase, deployed edge functions, model-provider behavior, native
  notifications, and iOS/Android hardware remain `BLOCKED`, not PASS.

Change only what is required. Do not refactor, rename, reformat, add error
handling, or improve anything you were not asked to change, even if it
looks wrong. Modify only the files named above. If you believe another
file must change, stop and report it instead.

Before reporting back:
- Re-read the spec clause by clause. For each clause, point at the specific
  change that satisfies it. If any clause has no corresponding change,
  you are not finished.
- Run the code. It must execute without syntax or import errors.
- Run the existing test suite. It must pass exactly as it did before.
- Do NOT write new tests. Do NOT modify existing tests. Verification of
  new behaviour is not your job.
- Report what you changed, which clause each change maps to, and anything
  you were unsure about.
