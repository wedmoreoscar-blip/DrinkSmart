# W3 Step 8 — terminal wind-down screen

Implement the terminal session screen defined by design `1f`, consuming the completed deterministic
session engine. Work in the already-synchronized worktree
`/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2a-bottom-tab-bar`.

## Files you may modify

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2a-bottom-tab-bar/src/components/tabs/TimelineTab.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2a-bottom-tab-bar/src/components/tabs/WindDownScreen.tsx` (new)

No other file may be modified. In particular, do not edit `AppContext.tsx`, `sessionEngine.ts`,
`sessionStore.ts`, `Dashboard.tsx`, notification code, any test, shared UI primitive, token/CSS file,
package manifest, lockfile, or Supabase file.

## Existing interfaces and visual authority

- `src/lib/sessionEngine.ts` exports `deriveSessionPhase` at approximately line 648 and
  `deriveWindDownSummary` at approximately line 693. Use them directly; do not reproduce their BAC,
  elimination, phase, or ethanol calculations.
- `src/contexts/AppContext.tsx` exposes the required `state`: `userMetrics`, `drinkTimeline`,
  `consumedTimelineEntries`, and `effectivePlanEndTime`.
- `TimelineTab.tsx` already owns a once-per-second `currentTime` update and receives `onNext`, which
  returns to Plan. Reuse both rather than introducing a second timer or changing Dashboard routing.
- The literal visual/copy authority is
  `/home/oscar/DrinkSmart/design_handoff_drinksmart/screens/1f-wind-down.html`, backed by the existing
  Tailwind tokens in `src/index.css`. Port it to React/Tailwind; do not paste prototype HTML.

## Requirements

1. **Enter wind-down from the authoritative phase.** In `TimelineTab`, derive the phase from the
   current timeline, consumed snapshots, effective plan end, and existing `currentTime`. When and
   only when it is `"winding-down"`, render `WindDownScreen` instead of the active timeline. Planning
   and active behavior remain unchanged. Do not infer terminal state from array indexes or duplicate
   the engine rules.

2. **Render the live terminal summary, including honest unavailable states.** Derive the summary
   with `deriveWindDownSummary`. Render `WINDING DOWN`, dynamic context in the form `Last drink
   HH:MM, N minutes ago. Nothing else planned.` when a last drink exists, then `SOBER AROUND` and its
   24-hour time as the 76px hero. Use tabular numerals. If an engine value is null, render an em dash
   for that value and omit the unsupported last-drink clause rather than inventing an estimate.

3. **Match the three-row stat group exactly.** Rows are `Under 0.08%`, `Peak tonight`, and `Drunk of
   planned`, each at least 60px high with `0 18px` padding, 1px gaps, `#1c1e2c`, and group radii
   `14px 14px 4px 4px` / `4px` / `4px 4px 14px 14px`. Values are 500/22, tabular; format BAC to two
   decimals plus `%`, ethanol totals as rounded `<consumed> / <planned> ml`, and times as 24-hour
   `HH:MM`. Keep this disclaimer verbatim: `Estimates from your stats and what you logged. Not a
   legal or medical measurement.`

4. **Match the remaining 1f composition.** Use the 402px reference's fluid column layout and 20px
   gutters: top padding 64px; 15px uppercase labels; context 19px; 32px before the sober group; 26px
   before stats and care card. Render one outlined care card with `Water, 500 ml` and `Before bed.
   Set a reminder for 07:30 if you have somewhere to be.` Bottom-align `Get home` as a 64px outlined
   control and `End session` as a 56px text-only control with 10px between them and 22px bottom
   padding. `End session` calls the existing `onNext`; do not invent session-reset, transport,
   location, navigation, or external-service behavior for `Get home` because no such contract exists.

5. **Preserve the product tone and boundaries.** Render no score, streak, praise, celebration,
   red/green state, new animation, or medical/legal claim beyond the required disclaimer. Use
   existing tokens/primitives and accessible semantic buttons. Do not change the deterministic
   engine, persistence, tab bar, active Timeline layout, or any unrelated screen.

## Verification baseline

- `npm test` currently passes: **5 files, 93 tests**. It must still pass with exactly those existing
  tests; do not add or edit tests.
- `npm run typecheck` must pass.
- `npm run lint` is a known failure at **9 errors and 11 warnings**. It must not increase either
  count and must introduce no finding in an allowed file.
- `npm run build` must pass.
- Run/import checks and the existing suite in this worktree only. Browser layout/screenshot
  acceptance belongs to the later checker/visual-check stages. Real Supabase, native notification,
  and mobile-device behavior are **BLOCKED** and are not evidence for this UI ticket.

## Git ownership

The orchestrator has synchronized this worktree and handles commits, merges, review, and
integration. Do not merge, rebase, reset, stash, commit, change branches, or synchronize another
worktree.

## Communication route — transport only

Your assigning agent is the DeepSeek A2A hub `bf79ff8f-2300-4ec6-844e-394d2293af89`, acting for
Codex TUI on ticket `W3-STEP8`. Send every substantive question, blocker, status update and final
handback with `traycer agent send --to bf79ff8f-2300-4ec6-844e-394d2293af89`. Include the ticket ID,
your full Traycer agent ID, a unique monotonic message ID, the kind
(`QUESTION | BLOCKER | STATUS | HANDBACK`), whether a reply is needed, and the complete message body.

The hub records messages but does not answer or make decisions; the Codex orchestrator will send any
necessary response back through it. Continue safe independent work while waiting. Do not weaken or
reinterpret the specification because this route exists.

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
