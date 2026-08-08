# W2-C — fixed-hero Timeline and scrolling spine

## Context and authority

Restyle Timeline from `/home/oscar/DrinkSmart/design_handoff_drinksmart/screens/1d-timeline.html`.
The HTML owns literal values and the PNG owns appearance. Keep the current deterministic timeline,
notification hooks, locking, reordering, quick-add, and state ownership intact. Engine support for
break entries, durable “Had it,” +15-minute replanning, and wind-down remains a later task; do not
fake or add that engine behavior here.

## Allowed files

- `/home/oscar/DrinkSmart/src/components/tabs/TimelineTab.tsx`
- `/home/oscar/DrinkSmart/src/components/tabs/SortableTimelineItem.tsx`

## Requirements

1. Replace the stack of summary/stat/maintenance cards with design 1d's mobile-first structure: a
   fixed hero that never scrolls and one independently scrolling spine below it. Derive the hero
   from the next upcoming timeline entry and live `currentTime`: `NEXT` label and `now HH:MM`,
   30px drink name, 22px unit/time detail, and a tabular 76px minute countdown. Render the fixed
   `Had it` (flex, 64px accent outline) and `+15` (104x64 neutral outline) affordances in their exact
   positions, but do not invent local-only or non-persisted engine semantics; report those action
   handlers as blocked by the explicitly out-of-scope engine work if the current context exposes no
   correct operation.
2. Build the spine as one relative scroll region with 18px 20px 8px padding and a 1px vertical
   fading rule at x=97px (30px fade at both ends). Every ordinary row uses the fixed columns
   `[62px time][34px marker][flex content]`; typography and markers follow 1d exactly. Insert the
   accent `now` rule at the correct chronological boundary. The next entry is the 96px raised/ringed
   row with 15px halo marker; past entries are .45 opacity; future entries use the hollow
   13px/1.5px marker.
3. Preserve sortable keyboard/pointer behavior for future unlocked drinks and preserve
   `toggleLockedDrink`. Locked rows use the accent-outline marker, filled accent lock, and the
   existing `kept` Badge vocabulary with copy that says it stays if re-planned. Keep the 44px
   trailing lock hit area within the row. Treat a zero-alcohol/Water-shaped entry as the dashed
   hollow break row if one is ever supplied, but do not change AppContext or manufacture break
   entries; engine generation of breaks remains blocked.
4. End the spine with the 1d plan-end row (23px dash, target time, restrained sober-around detail
   only if it can be derived without changing BAC math) and two 56px outlined footer actions,
   `Add a drink` and `Re-plan the rest`. Use TimelineTab's existing optional `onNext` callback to
   return to Plan for those flows rather than adding a cross-file interface. Preserve reminders and
   quick-add behavior even if their controls must be placed in the scrolling region; additions and
   locked drinks always read as adjustment, never breakage, and the phrase “you've gone off plan”
   must not appear.
5. Remove the existing blue/green gradients, green completion marker, emoji status copy, pulsing
   progress orb, and celebratory `Target reached` treatment. Use only the established dark neutral,
   accent, and amber roles; completion desaturates. Keep the empty state functional and legible at
   the global scale. Do not change notification services, AppContext formulas or types, PlanTab,
   Dashboard, primitives, dependencies, or any file outside the two listed above.

## Verification baseline

- `npm run typecheck` (`tsc -b --noEmit`) must PASS with 0 errors. Never use bare `tsc --noEmit`.
- `npm run lint` is a known FAIL at exactly 9 errors and 12 warnings; it must not get worse.
- `npm run build` must PASS.
- Browser/layout, real-time session interaction, notification, Supabase, and native verification
  are BLOCKED. The future engine behaviors called out above remain BLOCKED, not PASS.


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
