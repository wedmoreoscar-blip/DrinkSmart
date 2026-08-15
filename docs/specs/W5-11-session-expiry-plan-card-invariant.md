# W5-11 — Plan-card action invariant and abandoned-session expiry

## Goal

Make an iconless drink card impossible in the Plan tab while retaining consumed records for BAC and
wind-down maths, and automatically clear an active session that the user abandons for six hours
past its effective plan end.

## Allowed files

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/src/contexts/AppContext.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/src/components/tabs/DrinksTab.tsx`

## Existing contracts to preserve

- `recordTimelineConsumption` changes consumption/BAC presentation but not the agreed clock.
- Consumed snapshots are immutable inputs to BAC, re-plan accounting, session history, and the
  wind-down summary. Do not delete or rewrite them when changing Plan presentation.
- `resetActiveSessionState(prev, now)` is the existing authoritative active-state reset. Reuse it;
  do not create a partial competing reset.
- `effectivePlanEndTime` is derived by the deterministic rescheduler and already follows `+15` and
  other timing displacements.
- Only explicit `End session` saves an account session-history snapshot through the current UI flow.

## Requirements

### W5-11-C1 — every rendered Plan drink card is actionable

1. Keep the complete valid `planEntries` collection for committed ethanol, the tray ceiling, target
   accounting, BAC, and timeline behavior.
2. Derive the Plan-tab card/group collection by removing entries whose source IDs occur in
   `state.consumedTimelineEntries`.
3. Build the visible category groups, custom-drink picked list, expanded card rows, and their visible
   serving counts from that unconsumed collection. A category may remain available as a picker
   category when all of its earlier drinks are consumed, but it must not render those past drink
   cards.
4. Remove the conditional action suppression inside `panelRow`. Every drink card that reaches
   `panelRow` unconditionally renders a working lock/unlock control and a working delete control.
5. Do not make consumed records deletable or lockable. They are absent from Plan cards and remain
   visible as past records only on Timeline.
6. Consumed ethanol still contributes to `committedMl` and every overall-session bound. Hiding a
   past Plan card must not lower the tray meter, create capacity, or change any BAC/wind-down result.

### W5-11-C2 — expire abandoned sessions six hours after effective end

1. Define one named six-hour grace interval in `AppContext.tsx`.
2. When a real active session has an `effectivePlanEndTime`, schedule expiry at:

```ts
effectivePlanEndTime.getTime() + 6 * 60 * 60 * 1000
```

3. If the deadline is already past—such as immediately after a persisted abandoned session is
   hydrated and its timeline recomputed—expire it without waiting for another user action.
4. If `+15` or any deterministic timing change moves `effectivePlanEndTime`, cancel the old timer
   and schedule against the new deadline. Clean up timers on dependency change and unmount.
5. On expiry, call `clearSession()` before resetting React state through
   `resetActiveSessionState(prev, now)`, matching explicit `endSession`'s debounce-race protection.
6. The reset clears drinks, locks, timeline, breaks, consumption, delay, adjustment, and active
   timing artifacts, then rebases the next planning window from expiry time while retaining the
   existing selected duration/profile choices.
7. Do not auto-save an account history snapshot. An abandoned or partially consumed plan is not
   silently promoted to completed history.
8. Do not expire immediately merely because every drink was marked `Had it`. The wind-down screen
   and its maths remain available until explicit `End session` or the six-hour deadline.

## Acceptance criteria

- There is no render path for a Plan drink card without both lock/unlock and delete controls.
- Marking a drink consumed removes its card from Plan, leaves its past Timeline entry/snapshot, and
  leaves its ethanol in overall session accounting.
- Marking every drink consumed cannot produce uneditable iconless Plan cards.
- Reloading an abandoned session beyond the deadline clears it after derived timeline hydration.
- A delayed effective plan end delays expiry by the same amount.
- Explicit End Session behavior and account history remain unchanged.
- No BAC, total-body-water, ethanol, pacing, or wind-down formula changes.

## Explicit exclusions

- No session-store schema/version change, Supabase migration, history-table change, deployment, or
  remote operation.
- No Timeline visual redesign, browser automation, screenshots, or user-owned visual verification.
- No new dependency, test edit, or unrelated `DrinksTab.tsx` refactor.

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

## Communication route — transport only

Your assigning agent is the DeepSeek A2A hub `940a15e0-682c-4a16-807d-82f4a6bfc090`, acting for
Codex TUI on ticket `W5-11`. Send every substantive question, blocker, status update and final
handback with `traycer agent send --to 940a15e0-682c-4a16-807d-82f4a6bfc090`. Include the ticket ID,
your full Traycer agent ID, a unique monotonic message ID, the kind
(`QUESTION | BLOCKER | STATUS | HANDBACK`), whether a reply is needed, and the complete message body.

The hub records messages but does not answer or make decisions; the Codex orchestrator will send
any necessary response back through it. Continue safe independent work while waiting. Do not
weaken or reinterpret the specification because this route exists.
