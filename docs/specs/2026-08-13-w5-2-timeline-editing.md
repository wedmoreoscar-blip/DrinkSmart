# W5-2 — Timeline full action suite and in-place re-plan

## Assignment

Implement in `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1`.
The orchestrator already synchronized this worktree to `main`; dependencies are provisioned.

## Allowed files

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/src/components/tabs/TimelineTab.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/src/components/tabs/SortableTimelineItem.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/src/components/tabs/timeline-replan.ts`

The third path may be created if extracting the generation request keeps the component readable.
No other file may be modified.

## Verification baseline

- `npm test`: PASS — 14 test files, 131 tests.
- `npm run typecheck`: PASS, zero errors
- `npm run lint`: known FAIL — 11 errors and 10 warnings. Preserve that exact ceiling; introduce no new findings.
- `npm run build`: PASS (Vite production build; existing large-chunk and stale Browserslist warnings only).
- `git diff --check`: clean

## Requirements

1. Destroy both unbounded Timeline add paths: remove the Quick add card and its helpers/imports, and
   remove the `Add a drink` footer action. The footer becomes one full-width 56px secondary
   `Re-plan the rest` action with the 13px hint `Press and hold a grip to move that drink.` It stays
   on Timeline and must not call `onNext`.
2. Give every non-past entry—current-up, future, locked and water alike—the complete action suite:
   reorder grip, 56px swap, and 56px lock/unlock, in fixed order with swap inside and lock outermost.
   Extend `TimelineTabProps` with `onSwapRequest?: (drinkId: string) => void` and call it from swap.
   A lock only protects against AI regeneration: it never disables swap or reorder. Past entries
   expose none of these controls. Current-up can be locked, swapped and moved.
3. Move drag listeners off the drink-name/text scrolling surface onto an explicit press-and-hold
   grip. Use a 56px time column with a 44×36px radius-8 grip under the clock, two 14×1.5px bars,
   74px minimum row height (98px current card), and one-line metadata. Use a delayed/tolerant pointer
   activation suitable for press-and-hold. The grip is absent only on past rows. Dragging any
   non-past entry, including current or locked, must call `reorderTimelineEntries`; a lock is not a
   time anchor.
4. While dragging, render the `5e` move mode: replace the hero with a 56px MOVING/name/subtitle
   banner and 56px Done control; show the vacated `left from here` well, a 2px accent drop line, and
   the raised/held row styling; dim only truly unavailable past rows; leave the tab bar reachable.
   On drop, exit move mode and let the existing deterministic reorder operation retime the list.
   Do not add confirmation, toast or dialogue.
5. Implement `Re-plan the rest` through the existing planner and context operation
   `applyRegeneratedRemainingDrinks`, following PlanTab's request construction and fallback handling.
   Consumed/past drinks and locked drinks survive; every unlocked unconsumed drink—including the
   current-up drink—is replaceable. Use pure engine/planner helpers rather than duplicating alcohol
   arithmetic. Preserve reminder UI and notification scheduling.

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
