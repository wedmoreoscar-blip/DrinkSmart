# W3-A — deterministic session engine

## Context and authority

This is the serial foundation for Wave 3. Implement it before notification work or the wind-down
screen. The assigned worktree is:

`/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives`

It is clean and tree-identical to `/home/oscar/DrinkSmart` at `79d3045`. Do not merge, rebase,
reset, commit, or change branches. The assigning orchestrator owns integration.

Read these sources before editing:

- `/home/oscar/DrinkSmart/AGENTS.md`
- `/home/oscar/DrinkSmart/docs/decisions.md`, especially the deterministic-engine and whole-app
  redesign entries
- `/home/oscar/DrinkSmart/tasks/todo.md`, steps 6–8 and especially step 7
- `/home/oscar/DrinkSmart/design_handoff_drinksmart/README.md`, sections 1d, 1f, 1g, and
  "State & engine work required"
- `/home/oscar/DrinkSmart/src/contexts/AppContext.tsx`
- `/home/oscar/DrinkSmart/src/lib/sessionStore.ts`
- `/home/oscar/DrinkSmart/src/lib/generatePlan.ts`, especially `computeTargetEthanolMl`
- `/home/oscar/DrinkSmart/src/lib/timelineHelpers.ts`

The user explicitly approved Vitest as a new development dependency on 2026-08-09. Pin
`vitest` to the Vite-5-compatible `^3.2.7` line; do not upgrade Vite, React, TypeScript, or any
other dependency. This task explicitly requires new deterministic tests. That task-specific
requirement supersedes the generic no-new-tests sentence in the fixed closing block appended below;
do not modify any pre-existing test because none exists.

## Scope

Only these files may change:

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/package.json`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/package-lock.json`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/tools/test-project`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/contexts/AppContext.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/lib/sessionStore.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/lib/sessionEngine.ts` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/lib/sessionEngine.test.ts` (new)

Do not edit `PlanTab.tsx`, `TimelineTab.tsx`, `SortableTimelineItem.tsx`, notification code,
`generatePlan.ts`, `greedyPlanFallback.ts`, design files, Supabase files, styling, or any other file.
This spec creates deterministic state and commands for later consumers; it does not wire the
currently disabled Timeline buttons or build the wind-down UI.

## Requirements

### 1. Install the test runner and mechanically extract the existing engine

- Add `vitest: ^3.2.7` to `devDependencies`, update `package-lock.json`, and add
  `"test": "vitest run"` to `package.json`. Perform the install through
  `tools/agent-lock dependency-install -- npm install --save-dev vitest@^3.2.7`; add no browser,
  DOM, coverage, or React-testing dependency.
- Update `tools/test-project` so both `quick` and `full` run `npm test` as a separately labelled
  check. Keep the existing typecheck, lint, and build behavior intact.
- Create `src/lib/sessionEngine.ts` and mechanically extract the pure timeline calculation now
  embedded in `AppContext.calculateDrinkTimeline`. `AppContext` must call the extracted function;
  it must not retain a second implementation.
- The extracted API must accept every input explicitly, return calculations/timeline/adjusted-target
  state without mutating its inputs, and contain no `Date.now()`, timers, storage, React, browser,
  Supabase, or model calls. Export the engine input/output and timeline-entry types so later Wave 3
  consumers do not duplicate them.
- Before adding new behavior, characterize one fixed alcohol-only fixture in
  `sessionEngine.test.ts` with literal expected entries, timestamps, ethanol values, percentages,
  `adjustedTargetMl`, and `isTargetAdjusted`. The fixture must protect the existing algorithm, not
  compute its expectation by calling a second copy of the implementation. Compare the complete
  pre-Wave-3 field projection; the new discriminant and stable id are additive and asserted
  separately.

### 2. Represent duration-bearing water and break entries without changing alcohol math

- Extend the engine input with a discriminant that defaults missing/legacy values to an alcoholic
  drink and can explicitly represent a break. A break has its own timeline-entry variant with a
  stable `entryId`, positive `durationMinutes`, optional `volumeMl`, display name, and
  `pureAlcoholMl: 0` / `percentageOfTarget: 0`.
- Alcohol entries also gain a stable `entryId`; derive it deterministically from the persisted
  drink id and unit number so it survives recalculation and reload. Preserve the existing shared
  fields so current Timeline consumers continue to compile unchanged.
- A valid break appears in input order, starts at the current timeline cursor, advances that cursor
  by exactly its duration, and consumes no ethanol or BAC budget. Reserve explicit break minutes
  from the fixed session duration before distributing time across alcoholic entries. With no
  breaks, every pre-Wave-3 output field must remain byte-for-byte equivalent to the characterized
  legacy output; only the new discriminant and stable id may be additive.
- Ignore invalid breaks whose duration is non-finite or not positive. Never produce negative,
  overlapping, `NaN`, or decreasing timestamps. If explicit breaks plus anchored events cannot fit
  before the requested target time, return the earliest feasible effective end time rather than
  compressing a break or moving an anchor backwards.
- Breaks do not enter alcoholic `drinkCalculations`, do not change `adjustedTargetMl`, and do not
  make `isTargetAdjusted` true.

### 3. Add deterministic session actions and preserve locked/consumed anchors

- Extend `AppState` and its context API with serializable consumed-entry snapshots plus these exact
  fields: `consumedTimelineEntries`, `delayedEntryMinutes`, and derived
  `effectivePlanEndTime`. `delayedEntryMinutes` is keyed by stable entry id and stores accumulated
  positive minutes; `effectivePlanEndTime` is recomputed, not persisted. Add these exact operations
  for later UI/notification consumers:
  `markTimelineEntryHadIt(entryId, consumedAt?)`,
  `delayTimelineEntry(entryId, minutes?)`,
  `addUnplannedDrink(drink)`, and
  `replanRemainingTimeline(now?)`.
  Default `consumedAt`/`now` at the React boundary only; pass explicit dates into pure engine code.
- `markTimelineEntryHadIt` is idempotent. It snapshots the entry id, source drink id, actual
  consumption time, and pure-ethanol ml; it also keeps that source drink across replanning.
  Repeating the action must not double-count consumed ethanol.
- `delayTimelineEntry` defaults to exactly 15 minutes and rejects non-finite/non-positive delays.
  The selected future entry moves by exactly that amount. Past/consumed entries never move;
  future entries whose source drink id is in `lockedDrinkIds` retain their absolute timestamps;
  later unlocked entries are redistributed monotonically around those anchors. Extend the effective
  plan end when necessary instead of creating a collision. Do not overwrite the user-requested
  `drinkingTargetTime`; publish the extension through `effectivePlanEndTime`.
- `addUnplannedDrink` appends the supplied entry once, marks its source id as kept, and uses the same
  pure reflow path. `replanRemainingTimeline` also uses that path. In this spec, “replan” means
  deterministic timing of the existing drink list; catalog selection remains owned by
  `PlanTab`/`generatePlan` and must not be copied into the engine.
- Whenever `updateDrinks` removes a source drink, prune stale `lockedDrinkIds`, consumed snapshots,
  and delay state that refer to it. Locking, action application, and reflow must not mutate prior
  state arrays or objects.

### 4. Derive the wind-down phase and BAC summary from logged consumption

- Export a pure `deriveSessionPhase` returning exactly `"planning"`, `"active"`, or
  `"winding-down"`. It is planning without a usable timeline/start; active while alcoholic entries
  remain unconsumed and the effective plan end is in the future; winding-down once every alcoholic
  entry is consumed **or** the effective plan end has passed. Use the requested
  `drinkingTargetTime` only when no derived `effectivePlanEndTime` exists. Break entries do not block
  wind-down.
- Export a pure wind-down summary containing:
  `lastDrinkAt`, `soberAt`, `under008At`, `peakBAC`, `consumedEthanolMl`, and
  `plannedEthanolMl`. Dates are `Date | null`; BAC is expressed in the same percent units used by
  `targetBAC`; ethanol totals are ml.
- Use the existing total-body-water inputs and ethanol density `0.789`. At each logged consumption,
  calculate the BAC immediately after that event from cumulative consumed ethanol and subtract
  elimination elapsed since the first logged drink. Elimination is exactly `0.015` BAC percentage
  points per hour. `peakBAC` is the maximum non-negative event BAC. From the BAC at the last logged
  drink, derive the future crossing times for `0.08` and `0.00`, including midnight crossing.
- `consumedEthanolMl` comes only from idempotent consumed snapshots;
  `plannedEthanolMl` is the sum of alcoholic timeline entries, excluding breaks. Missing/invalid
  body-water inputs produce null BAC/time estimates but still return the two ethanol totals.
- Every time-sensitive pure function receives `now` or event times as arguments; fake timers and
  locale/time-zone-dependent string assertions are forbidden.

### 5. Persist new inputs compatibly and prove the invariants

- Keep the storage key exactly `drinksmart.session.v1`; do not bump or replace it. Extend
  `PersistedSession`/`LoadedSession` only with the minimal break/action/consumption state required by
  the engine. Store dates as ISO strings and hydrate them as `Date` objects.
- A pre-Wave-3 payload with every new field absent must hydrate successfully with empty/default
  action state. Malformed entries, invalid dates, and references to missing source drink ids are
  filtered rather than allowed to poison the engine. Do not clear an otherwise valid legacy night.
- Add focused Vitest cases for: the literal alcohol-only characterization; a 20-minute 330 ml water
  break with zero BAC contribution; multiple breaks; idempotent `Had it`; stale-lock pruning;
  exact +15 movement and anchor-preserving reflow; forced effective-end extension; winding-down by
  all-consumed and by elapsed plan end; deterministic peak/under-0.08/sober calculations crossing
  midnight; and legacy `drinksmart.session.v1` hydration.
- Tests must assert numerical values/timestamps with explicit tolerances where floating point is
  involved. Do not assert only counts, truthiness, snapshots of class names, or the output of a
  second implementation.
- Preserve the Widmark/Watson/FFM formulas, `adjustedTargetMl` behavior, alcohol density, existing
  generated-plan/fallback behavior, and alcohol-only entry order/timestamps. No model arithmetic,
  styling, notification delivery, native action registration, or UI work belongs in this spec.

## Verification baseline

- `npm test` — must PASS with the new deterministic suite.
- `npm run typecheck` (`tsc -b --noEmit`) — must PASS with 0 errors. Never use bare
  `tsc --noEmit`; it compiles zero project-reference files here.
- `npm run lint` — known FAIL at exactly 9 errors / 12 warnings before this task. It must not gain
  any error or warning. New engine/test files must be clean.
- `npm run build` — must PASS.
- `git diff --check` — must PASS.
- No prior automated test suite exists, so there is no pre-task unit baseline to claim. The new
  Vitest suite is functional engine evidence; typecheck and build are not.
- Browser UI, real Supabase, edge functions, native notifications, and iOS/Android hardware are
  outside this spec and remain `BLOCKED`, not PASS.

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
