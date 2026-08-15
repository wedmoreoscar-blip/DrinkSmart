# W5-10 — AI planner catalogue, routing, admission, and online re-plan

## Goal

Make remote plan generation a constrained selector over the catalogue the user has actually made
available, route it only to non-thinking DeepSeek V4 Flash on DeepSeek's own servers, admit only
structurally valid and deterministically on-target results, and make Timeline `Re-plan the rest`
work with the same locally available preference state as Plan generation.

The deterministic engine remains authoritative. The model selects catalogue entries; it never
supplies trusted ethanol arithmetic.

## Allowed files

- `/home/oscar/.traycer/worktrees/deepseek_agent_0/src/lib/generatePlan.ts`
- `/home/oscar/.traycer/worktrees/deepseek_agent_0/src/lib/greedyPlanFallback.ts`
- `/home/oscar/.traycer/worktrees/deepseek_agent_0/src/lib/planGenerationContracts.ts`
- `/home/oscar/.traycer/worktrees/deepseek_agent_0/src/components/tabs/PlanTab.tsx`
- `/home/oscar/.traycer/worktrees/deepseek_agent_0/src/components/tabs/TimelineTab.tsx`
- `/home/oscar/.traycer/worktrees/deepseek_agent_0/src/components/tabs/timeline-replan.ts`
- `/home/oscar/.traycer/worktrees/deepseek_agent_0/supabase/functions/generate-plan/index.ts`

## Existing contracts to preserve

- `computeRegenerationBudget` already subtracts consumed and locked ethanol. Do not subtract locked
  ethanol a second time downstream.
- A lock means only “survive regeneration.” It does not stop movement, swap, or any other action.
- `GeneratePlanInput.catalog` remains the complete client catalogue used for resolution and the
  deterministic local fallback; server-side visibility filtering must not remove manual picker
  choices.
- `generatedDrinkToEntry`, the deterministic target formula, and `adjustedTargetMl` are unchanged.
- Edge-function failure, timeout, or rejected output must continue through `generatePlan`'s local
  greedy fallback and surface `usedFallback: true`.

## Requirements

### W5-10-C1 — the model sees only eligible catalogue entries

1. Treat `locked_drinks[].catalog_id` and `exclude[]` as server/local-fallback control data.
2. In the Edge Function, create the union of those identifiers and remove matching entries before
   constructing `buildCatalogBlock`, `catalogById`, or any other model/tool-visible catalogue.
3. Remove locked-drink and exclude summaries from `buildUserMessage` and remove prompt prose that
   tells the model those hidden identifiers. Neither the system message, user message, tool result,
   nor catalogue block may reveal a locked or excluded identifier.
4. The full catalogue remains available to the user's manual picker. The deterministic greedy
   fallback continues to apply the identical hidden-ID union locally.
5. Plan `Regenerate` continues to exclude the previous generated IDs and all locked IDs. Timeline
   `Re-plan the rest` continues to protect locked/consumed drinks and never regenerates them.
6. If filtering leaves no eligible catalogue entries while the remaining target is positive, the
   remote request must fail cleanly so the existing deterministic fallback path handles the case.

### W5-10-C2 — pin the OpenRouter request

Every OpenRouter tool-loop request must retain model
`deepseek/deepseek-v4-flash-0731` and add these raw JSON controls:

```json
{
  "provider": {
    "only": ["deepseek"],
    "allow_fallbacks": false,
    "require_parameters": true
  },
  "reasoning": {
    "effort": "none",
    "exclude": true
  }
}
```

Do not add a secondary model or provider. An unavailable DeepSeek endpoint must produce the normal
Edge Function failure that the client converts to the local fallback.

### W5-10-C3 — reject untrustworthy model output

Before acknowledging or returning `submit_plan`, validate the complete submitted plan against the
filtered `catalogById`:

- `drinks` is an array;
- every `catalog_id` is a non-empty string present in the filtered catalogue;
- every `quantity` is finite and strictly greater than zero;
- every `unit` is one of `ml`, `oz`, `shots`, `pints`, `glass`;
- when `ml` is present, it is finite and strictly greater than zero;
- all values used in ethanol calculation produce finite, non-negative ethanol.

Do not silently drop an unknown or malformed row. Reject the whole remote answer with a non-2xx
response so the client takes the local fallback.

Recompute the total with `planDrinkEthanol` and the filtered server catalogue. For a positive target,
reject the whole answer when:

```ts
Math.abs(actualTotalEthanolMl - targetEthanolMl) / targetEthanolMl > 0.10
```

Exactly ±10% is accepted. The model's own calculator/tool calls and submitted arithmetic are never
trusted. A large but otherwise well-shaped quantity is not independently invalid: deterministic
target deviation is the size guard.

### W5-10-C4 — online Timeline re-plan uses live application preferences

1. `replanRemaining` accepts `preferences: PreferenceData` in `ReplanInput`; remove its direct
   Supabase auth/profile query and the silent `fetchPreferences` failure path.
2. `TimelineTab` obtains preferences from the existing `useUserMetrics` hook and passes them to
   `replanRemaining`, matching `PlanTab`'s source of truth.
3. Keep the existing deterministic remaining-budget calculation and merge behavior: consumed and
   locked source drinks survive, unlocked/current/future replaceable drinks are replaced in place,
   and then the engine reschedules.
4. `handleReplan` uses `try`/`catch`/`finally` so the pressed/loading state always clears. An
   incomplete profile or unexpected failure produces a visible destructive toast instead of a
   silent no-op. The normal Edge failure remains a successful local fallback and keeps the existing
   “Built offline” toast.
5. Do not navigate away from Timeline and do not change visual geometry or copy beyond the required
   failure feedback.

## Acceptance criteria

- A locked catalogue ID appears in neither model messages nor model-visible catalogue/tool maps.
- An explicitly excluded ID has the same treatment.
- The manual picker can still add another serving of a locked drink from the complete client
  catalogue.
- Unknown IDs, malformed quantities, and totals beyond ±10% are rejected as a whole; no partial
  model plan is returned.
- Every OpenRouter round is restricted to provider `deepseek`, no provider fallback, and reasoning
  effort `none`.
- Timeline remote re-plan no longer depends on a fresh Supabase profile read and cannot remain
  indefinitely indented/loading after an exception.
- The deterministic engine formulas and local-fallback arithmetic are unchanged.

## Explicit exclusions

- No deployment, Supabase secret mutation, migration, or live OpenRouter request.
- No visual redesign, browser automation, screenshot work, or changes to picker/manual-selection
  availability.
- No new dependency, test file, production abstraction outside the allowed files, or unrelated
  refactor.

## Verification baseline

- `npm run typecheck`: PASS on the commissioning tree.
- `npx vitest run`: PASS — 33 files, 196 tests.
- Checker-owned lint baseline: known FAIL — exactly 23 problems (11 errors, 12 warnings). It must not
  worsen.
- Checker-owned production build baseline: PASS — 2,222 modules; Vite 28.49s, wall 31.20s, with the
  existing Browserslist and large-chunk warnings.
- Browser, live Supabase, live OpenRouter/DeepSeek, notification, and native checks are BLOCKED and
  must not be attempted or claimed.

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
