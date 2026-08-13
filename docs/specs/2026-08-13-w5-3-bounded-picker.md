# W5-3 — Selected-drink panels and bounded add/swap picker

## Assignment

Implement in `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_2`.
The orchestrator already synchronized this worktree to `main`; dependencies are provisioned.

## Allowed files

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_2/src/components/tabs/DrinksTab.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_2/src/components/picker/CategoryScreen.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_2/src/components/picker/DrinkRow.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_2/src/components/picker/PickerTray.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_2/src/components/picker/CustomDrinkSheet.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_2/src/components/picker/wave5-picker.ts`

The final path may be created for pure selection/ethanol helpers. No other file may be modified.

## Verification baseline

- `npm test`: PASS — 14 test files, 131 tests.
- `npm run typecheck`: PASS, zero errors
- `npm run lint`: known FAIL — 11 errors and 10 warnings. Preserve that exact ceiling; introduce no new findings.
- `npm run build`: PASS (Vite production build; existing large-chunk and stale Browserslist warnings only).
- `git diff --check`: clean

## Requirements

1. Extend `DrinksTabProps` with `planBuilt?: boolean`, `swapDrinkId?: string | null`, and
   `onSwapComplete?: () => void`. In normal Plan mode after `planBuilt`, every non-empty category
   row automatically reveals an attached selected-drinks panel; `hide`/`show` is a separate
   unoutlined 56px target from the unchanged picker chevron. Hiding or having `nothing picked`
   removes the panel completely. Use one joined rounded object and divided 64px drink rows with
   name, `portion · pure alcohol · price`, 56px lock, and 56px no-confirmation delete. Shared lock
   state comes from AppContext and is editable here.
2. Enforce the night-wide hard ceiling for every normal Plan addition: committed plus pending pure
   ethanol must be at most target × 1.2. Never change the static target meter or alcohol formulas.
   Do not offer/commit an over-ceiling catalog or custom selection. Keep the tray's true numeric
   reading and the existing pending hollow-fill treatment. The idle 64px tray action is `Done`,
   never `Start`; it alone calls `onNext`.
3. In swap mode, find the existing source drink by `swapDrinkId`, title the picker `Swap <name>`, and
   filter by both bounds: candidate per-serving ethanol ≤ source ethanol × 1.2, with no lower bound,
   and the replaced night total plus candidate ≤ target × 1.2. Omit ineligible drinks and empty
   categories entirely; do not grey or disable them. State the pure-ethanol cap once in 19px copy
   and count omitted stronger drinks once in a 13px footnote. Hide custom creation and quantity/
   portion controls in swap mode because one eligible serving replaces one serving.
4. The swap tray subtracts the source from committed fill on entry, paints the selected candidate
   only as pending, and reads `<committed> + <pending> ml` / `of <target> ml · <name> taken out`.
   The 64px action says `Swap`. Commit by replacing the source drink while preserving its id (and
   therefore lock identity), call `onSwapComplete`, and remain on Plan. No warning, dialogue,
   confirmation or automatic Timeline navigation.
5. Apply tray over-target presentation without changing vessel geometry: at 15–20% over target and
   only when a higher buzz band exists, render one 17px neutral guidance line that advises raising
   to that next band. Do not use the rejected factual sentence from frame `5d`; Heavy and lower
   shade ranges show no line. Preserve venue, filters, sort, scanner and establishment behavior.

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
looks wrong. Modify only the files named above. If you believe another file
must change, stop and report it instead.

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
