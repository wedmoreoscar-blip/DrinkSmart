# W3 Step 6 — actionable drink and break reminders

Implement the notification behavior defined by design `1g` without changing the deterministic
session engine. Work in the already-synchronized worktree
`/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker`.

## Files you may modify

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/lib/notificationService.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/hooks/useNotifications.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/hooks/useWebDrinkReminders.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker/src/components/ui/sonner.tsx`

No other file may be modified. In particular, do not edit `AppContext.tsx`, `sessionEngine.ts`,
`sessionStore.ts`, `TimelineTab.tsx`, any test, package manifest, lockfile, Capacitor native project,
or Supabase file.

## Existing interfaces to consume

- `src/lib/sessionEngine.ts` exports the `TimelineEntry` union at approximately line 94. Alcohol
  entries have stable `entryId`, name/time/unit fields and `kind: "alcohol"`; break entries have
  stable `entryId`, `drinkName`, `time`, `durationMinutes`, optional `volumeMl`, and `kind: "break"`.
- `src/contexts/AppContext.tsx` exposes `markTimelineEntryHadIt(entryId, consumedAt?)` and
  `delayTimelineEntry(entryId, minutes?)` through `useAppContext`. These are the only owners of
  consumption/delay state and deterministic rescheduling; call them rather than reproducing math
  or writing storage directly.
- `src/components/tabs/TimelineTab.tsx` already invokes `useNotifications()` and
  `useWebDrinkReminders(state.drinkTimeline, enabled)` and passes the complete timeline to
  `scheduleFromTimeline`. Preserve those call sites and compatible return values.
- `@capacitor/local-notifications` 8.0 provides `registerActionTypes`, per-notification
  `actionTypeId`/`extra`, and `localNotificationActionPerformed` with `actionId` plus the original
  notification payload.

## Requirements

1. **Schedule exactly one stable reminder per timeline entry.** Replace the drink-only adapter with
   a `TimelineEntry`-aware notification model keyed by its stable `entryId`, and schedule each
   future alcohol entry once at its exact `time`. Alcohol copy must identify the actual drink and
   read `Due HH:MM. First/Second/... of N.` using a 24-hour clock. Schedule each future break once
   at its start time with quiet copy `Water, <volume> ml` when volume exists (otherwise its
   `drinkName`) and `Break until HH:MM.` calculated from `durationMinutes`. Break reminders have no
   drink action type. Continue cancelling the app's prior pending reminders before replacing the
   schedule, and retain stable positive numeric Capacitor IDs.

2. **Register the two native actions once and preserve their order.** Define one alcohol action
   type whose actions are exactly `Had it` first and `+15 min` second, both with
   `foreground: false`; register it before scheduling actionable reminders. Every alcohol
   notification carries this action type plus `extra.entryId`. Break notifications carry neither.
   Keep action IDs as exported/internal constants rather than comparing display labels.

3. **Route native actions to authoritative session operations.** Extend
   `registerNotificationListeners` to accept typed callbacks and dispatch only the two known action
   IDs with a valid string `extra.entryId`. In `useNotifications`, obtain
   `markTimelineEntryHadIt` and `delayTimelineEntry` from `useAppContext`, wire `Had it` with the
   action time/current time and `+15 min` with exactly 15 minutes, and keep listener cleanup safe
   across mount/unmount. Do not implement BAC, pacing, rescheduling, or storage logic in notification
   code. Tapping either notification action must not require the user to first navigate into the
   app; real killed/background process behavior remains a native-device verification boundary.

4. **Make the web fallback match the same semantic contract.** `useWebDrinkReminders` must notify
   at the scheduled time, deduplicate by stable `entryId` rather than timestamp, and expose the same
   two alcohol actions in the same order: `Had it` invokes `markTimelineEntryHadIt`, and `+15 min`
   invokes `delayTimelineEntry(entryId, 15)`. A break produces the quieter `Water...` / `Break
   until...` toast with no actions. Update the Sonner action/cancel styling only as needed to make
   both controls 60px minimum height, split consistently, with the first accent-emphasized and the
   second foreground-colored; do not redesign unrelated toast types.

5. **Preserve behavior under timeline changes.** Enabling/disabling reminders, an empty timeline,
   rescheduling, duplicate timestamps, React re-renders, and listener reference counting must not
   cause duplicate reminders or stale callbacks. Do not schedule past entries. Keep permission
   handling, the existing notification preference keys, non-native short-circuiting, and error
   handling behavior intact.

## Verification baseline

- `npm test` currently passes: **5 files, 93 tests**. It must still pass with exactly those existing
  tests; do not add or edit tests.
- `npm run typecheck` must pass.
- `npm run lint` is a known failure at **9 errors and 11 warnings**. It must not increase either
  count and must introduce no finding in an allowed file.
- `npm run build` must pass.
- Run/import checks and the existing suite in this worktree only. Browser toast appearance and
  behavior are checker-owned browser verification. Real iOS/Android notification delivery,
  ordering, background/killed-process actions, and native styling are **BLOCKED** without physical
  device infrastructure; do not describe web, typecheck, build, mocks, or source inspection as
  native verification.

## Git ownership

The orchestrator has synchronized this worktree and handles commits, merges, review, and
integration. Do not merge, rebase, reset, stash, commit, change branches, or synchronize another
worktree.

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
