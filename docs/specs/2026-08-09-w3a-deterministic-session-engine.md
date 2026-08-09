# W3-A2 — deterministic session rescheduling engine

## Context and authority

This is the second serial foundation ticket for Wave 3. It starts only after
`docs/specs/2026-08-09-w3a1-planner-session-regression-hardening.md` is integrated and accepted.
W3-A1 establishes Vitest and the single generated-plan budget contract. W3-A2 adds deterministic
session state, rescheduling, regeneration accounting, breaks, and wind-down calculations.

The implementation is non-visual and is assigned to DeepSeek V4 Flash through opencode, not Luna.
The intended warm worktree is:

`/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives`

The assigning orchestrator must merge the accepted W3-A1 integration commit into that worktree
before dispatch. The implementer must not merge, rebase, reset, commit, or change branches; the
orchestrator owns integration.

Read these sources before editing:

- `/home/oscar/DrinkSmart/AGENTS.md`
- `/home/oscar/DrinkSmart/docs/decisions.md`, especially the deterministic-engine and whole-app
  redesign entries
- `/home/oscar/DrinkSmart/tasks/todo.md`, steps 6–8 and especially step 7
- `/home/oscar/DrinkSmart/design_handoff_drinksmart/README.md`, sections 1d, 1f, 1g, and
  "State & engine work required"
- `/home/oscar/DrinkSmart/src/contexts/AppContext.tsx`
- `/home/oscar/DrinkSmart/src/lib/sessionStore.ts`
- `/home/oscar/DrinkSmart/src/lib/generatePlan.ts`, especially the W3-A1 meaning of
  `target_ethanol_ml`
- `/home/oscar/DrinkSmart/src/lib/planGenerationContracts.ts`, added by W3-A1
- `/home/oscar/DrinkSmart/src/lib/timelineHelpers.ts`

Vitest `^3.2.7` and `npm test` already exist after W3-A1. This ticket explicitly requires new
deterministic tests. That task-specific requirement supersedes the generic no-new-tests sentence in
the fixed closing block appended below. Do not modify W3-A1 tests except where a public type gains a
strictly additive field and the existing expectation must compile.

## Vocabulary and ownership boundary

- **Reschedule** means deterministic timing/order work over the drink set already in application
  state. It never calls a model and never selects a catalog item.
- **Regenerate drinks** means asking the existing in-app DeepSeek planner, through
  `generatePlan`, to select a new set of replaceable future drinks. The deterministic engine first
  computes the remaining pure-ethanol budget and protected consumed/kept contributions; the model
  selects only from the supplied catalog; the server recomputes its arithmetic; the deterministic
  engine then applies the returned drinks and reschedules them.
- Do not use `replan` as a function name for either operation. UI copy may continue to say
  “Re-plan the rest,” but its implementation must choose the explicit reschedule or regenerate
  operation. There must be no `replanRemainingTimeline` API.

## Scope

Only these files may change:

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/contexts/AppContext.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/lib/sessionStore.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/lib/sessionEngine.ts` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/lib/sessionEngine.test.ts` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/lib/sessionStore.test.ts` (new)

Do not edit `PlanTab.tsx`, `TimelineTab.tsx`, `SortableTimelineItem.tsx`, notification code,
`generatePlan.ts`, `greedyPlanFallback.ts`, W3-A1 tests, design files, Supabase files, styling, or any
other file. This ticket creates deterministic state and commands for later consumers; it does not
wire the currently disabled Timeline buttons or build the wind-down UI.

## Requirements

### 1. Mechanically extract and characterize the existing alcohol-only timeline engine

- Create `src/lib/sessionEngine.ts` and mechanically extract the pure timeline calculation now
  embedded in `AppContext.calculateDrinkTimeline`. `AppContext` must call the extracted function;
  it must not retain a second implementation.
- The extracted API accepts every input explicitly, returns calculations/timeline/adjusted-target
  state without mutating inputs, and contains no `Date.now()`, timers, storage, React, browser,
  Supabase, or model calls. Export its input/output and timeline-entry types for later consumers.
- Before adding new behavior, characterize one fixed alcohol-only fixture in
  `sessionEngine.test.ts` with literal expected entries, timestamps, ethanol values, percentages,
  `adjustedTargetMl`, and `isTargetAdjusted`. The fixture protects the existing algorithm; it must
  not calculate expected values by calling another implementation.
- With no breaks or action state, every pre-Wave-3 output field, alcohol-only order, and timestamp
  must remain equivalent to the characterized result. New discriminants and stable ids are additive.

### 2. Represent duration-bearing breaks without changing BAC or alcohol arithmetic

- Extend engine input with a discriminant that defaults missing/legacy values to an alcoholic
  drink and explicitly represents a break. A break has a stable `entryId`, positive
  `durationMinutes`, optional `volumeMl`, display name, and `pureAlcoholMl: 0` /
  `percentageOfTarget: 0`.
- Alcohol entries also gain a stable `entryId`, derived deterministically from persisted source
  drink id and unit number so it survives recalculation and reload. Preserve current shared fields
  so existing consumers continue to compile.
- A valid break appears in input order, starts at the timeline cursor, advances it by exactly its
  duration, and consumes no ethanol or BAC budget. Reserve explicit break minutes from the fixed
  session duration before distributing time across alcoholic entries.
- Ignore breaks whose duration is non-finite or not positive. Never produce negative, overlapping,
  `NaN`, or decreasing timestamps. If breaks and protected anchors cannot fit before the requested
  target, return the earliest feasible effective end rather than compressing a break or moving an
  anchor backwards.
- Breaks do not enter alcoholic `drinkCalculations`, change `adjustedTargetMl`, make
  `isTargetAdjusted` true, or count as unconsumed alcohol when deriving session phase.

### 3. Log consumption and reschedule existing entries around protected anchors

- Extend `AppState` and its context API with serializable `consumedTimelineEntries`,
  `delayedEntryMinutes`, and derived `effectivePlanEndTime`. Delay state is keyed by stable entry id
  and stores accumulated positive minutes; `effectivePlanEndTime` is recomputed, not persisted.
- Add these exact operations:
  `markTimelineEntryHadIt(entryId, consumedAt?)`,
  `delayTimelineEntry(entryId, minutes?)`,
  `addUnplannedDrink(drink)`, and
  `rescheduleRemainingTimeline(now?)`.
  Default `consumedAt`/`now` at the React boundary only; pure code receives explicit dates.
- `markTimelineEntryHadIt` is idempotent. It snapshots entry id, source drink id, actual
  consumption time, and pure-ethanol ml, and protects that source drink from model regeneration.
  Repeating it cannot double-count ethanol.
- Scheduled time alone never means “had.” An elapsed but unlogged alcoholic entry remains
  unconsumed. Add a regression test proving that it contributes zero to consumed ethanol and is not
  classified consumed merely because `now` is later than its scheduled timestamp.
- `delayTimelineEntry` defaults to exactly 15 minutes and rejects non-finite/non-positive values.
  The selected future entry moves exactly that amount. Consumed entries never move. A kept,
  unconsumed entry whose timestamp is strictly after `now` remains an absolute anchor; any
  unconsumed entry scheduled at/before `now` is remaining work and must be reflowed to no earlier
  than `now`, even when its drink selection is kept. Later unlocked entries redistribute
  monotonically around valid anchors. Extend `effectivePlanEndTime` rather than collide; do not
  overwrite the user-requested `drinkingTargetTime`.
- `addUnplannedDrink` appends once, protects its source id, and invokes the same pure rescheduling
  path. `rescheduleRemainingTimeline` changes timing only: it must never call `generatePlan`, select
  catalog items, replace drinks, or alter ethanol quantities.
- Whenever `updateDrinks` removes a source drink, prune stale locks, consumed snapshots, and delay
  state referring to it. No action or rescheduling function may mutate prior arrays or objects.

### 4. Expose a separate deterministic contract for model-driven drink regeneration

- Export a pure `deriveRegenerationContext` that receives the total target, current timeline,
  consumed snapshots, kept source ids, and explicit `now`. It returns at least:
  `targetEthanolMl`, `consumedEthanolMl`, `keptRemainingEthanolMl`,
  `replaceableRemainingEthanolMl`, `plannedEthanolMl`, `remainingEthanolMl`,
  `overTargetEthanolMl`, normalized target fractions for consumed/kept/replaceable/planned alcohol,
  and the protected remaining entries needed to build `locked_drinks`.
  “Remaining” means unconsumed, regardless of whether its old scheduled timestamp has passed.
- Accounting is exact and single-pass:
  `remainingEthanolMl = max(0, targetEthanolMl - consumedEthanolMl - keptRemainingEthanolMl)`.
  Consumed ethanol and kept remaining ethanol are disjoint; neither may be subtracted twice. Breaks
  contribute zero. For a positive target, each normalized fraction is its corresponding ml divided
  by the target without capping at one; for an invalid/non-positive target, fractions are zero.
  These fields—not model totals—are the authoritative inputs for a later layered vessel/progress
  visual and make over-target state measurable.
- Add an `applyRegeneratedRemainingDrinks(generatedDrinks, now?)` context operation. It performs no
  model call. It preserves source drinks protected by consumed snapshots or kept ids, removes only
  replaceable unconsumed source drinks, inserts the already validated generated entries once,
  deduplicates repeated generated source ids by keeping the first occurrence, prunes stale action
  state, and invokes deterministic rescheduling. Reapplying the same generated input is idempotent.
- A source drink with any consumed unit is protected as a whole under the current source-level lock
  model. Do not silently split aggregate `DrinkEntry` quantities in this ticket.
- Test the complete flow as two explicit stages: derive a 45 ml remaining budget from a 60 ml
  target with 10 ml consumed and 5 ml kept; then apply a supplied generated set while preserving
  consumed/kept sources and replacing unlocked future sources. Also test zero/over-target budgets,
  breaks, duplicate generated ids, empty model results, and repeat application.
- The existing app DeepSeek planner remains solely responsible for catalog selection. No engine
  function may import or invoke Supabase, `generatePlan`, or model code, and no model result may be
  trusted for BAC or total arithmetic.

### 5. Derive wind-down state, persist action inputs compatibly, and prove invariants

- Export a pure `deriveSessionPhase` returning exactly `"planning"`, `"active"`, or
  `"winding-down"`. It is planning without a usable timeline/start; active while unconsumed
  alcoholic entries remain and effective plan end is in the future; winding-down once every
  alcoholic entry is consumed or effective plan end has passed. Breaks do not block wind-down.
- Export a pure wind-down summary containing `lastDrinkAt`, `soberAt`, `under008At`, `peakBAC`,
  `consumedEthanolMl`, and `plannedEthanolMl`. Dates are `Date | null`; BAC uses the same percentage
  units as `targetBAC`; ethanol totals are ml.
- Use existing total-body-water inputs and density `0.789`. At each logged consumption, calculate
  BAC from cumulative consumed ethanol and subtract exactly `0.015` BAC percentage points per hour
  elapsed since the first logged drink. Derive future `0.08` and `0.00` crossings from BAC at the
  last logged drink, including midnight crossing. If BAC at the last drink is already at/below a
  threshold, return `lastDrinkAt` for that crossing; never return a crossing before the last logged
  event. Invalid body-water inputs return null BAC/time estimates but still return ethanol totals.
- Keep storage key `drinksmart.session.v1`. Persist only minimal break/action/consumption inputs;
  store dates as ISO strings and hydrate `Date` objects. A legacy payload with all new fields absent
  hydrates with empty defaults. Filter malformed entries, invalid dates, and missing-source
  references without clearing an otherwise valid legacy session. Do not persist derived timelines,
  BAC summaries, phases, or `effectivePlanEndTime`.
- Extract pure serialization/parsing helpers used by the localStorage wrapper and test those helpers
  directly under Vitest's Node environment. Do not add jsdom or replace the real storage key.
- Add focused Vitest cases for: the literal alcohol-only characterization; one and multiple breaks;
  idempotent `Had it`; elapsed-but-unconsumed semantics; stale-state pruning; exact +15 movement;
  anchor-preserving rescheduling; forced end extension; regeneration accounting and application;
  winding-down by all-consumed and elapsed end; peak/under-0.08/sober calculations crossing
  midnight; malformed action state; and legacy hydration.
- Every time-sensitive pure function receives explicit times. Use numeric/timestamp assertions and
  explicit floating-point tolerances; no fake timers, locale strings, class snapshots, or second
  implementation may determine expected values.
- Preserve Widmark/Watson/FFM formulas, `adjustedTargetMl`, alcohol density, generated-plan behavior,
  and alcohol-only ordering/timestamps. UI wiring, notification delivery, native action
  registration, model calls, and styling are outside this ticket.

## Verification baseline

- `npm test` — must PASS with W3-A1 and W3-A2 deterministic suites.
- `npm run typecheck` (`tsc -b --noEmit`) — must PASS with 0 errors. Never use bare
  `tsc --noEmit`; it compiles zero project-reference files here.
- `npm run lint` — use the accepted post-W3-A1 count as the baseline; W3-A2 must add no error or
  warning. New engine/test files must be clean.
- `npm run build` — must PASS.
- `git diff --check` — must PASS.
- The Vitest suite is functional deterministic-engine evidence; typecheck and build are not.
- Browser UI, Timeline button wiring, real Supabase, edge functions, model-provider behavior,
  notification delivery, and iOS/Android hardware are outside this ticket and remain `BLOCKED`,
  not PASS.

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
