# Active Plan — frontend redesign, steps 2 through 8

Source of truth: `design_handoff_drinksmart/README.md` (the spec) and `screens/*.png` (appearance).
Read `docs/decisions.md` first; the three redesign LOCKED entries constrain every step below.

**Step 1 (tokens) is complete** — `b46de81` applied `tokens/index.css` and `tokens/tailwind.config.ts`;
`d1d2be8` forced dark and made the light theme unreachable. Everything below assumes those tokens.

## Global rules for every step

- Reach for the token, not the hex. Every value in the mocks exists in `src/index.css` or
  `tailwind.config.ts`. A raw hex in a component is a bug unless the spec names it as a one-off
  (`#1c1e2c` raised rows, `#75798c` dim text, and the accent ramp are the known one-offs).
- `--fs-body` (19px) is the floor for anything the user must read. `--fs-micro` (13px) is optional
  detail only, never the answer.
- Nothing tappable is under 56px; the one primary action per screen is 64px.
- One accent, no palette. No red, no green. Completion desaturates. Nothing congratulates the user.
- Restyle the existing `src/components/ui/*` shadcn primitives. Do not fork them, do not add a
  component library, do not add a production dependency without approval.
- Port the prototype markup into React. `{{ someName }}` bindings are named for the state they hold —
  replace each with real state, never with a literal.
- Do not refactor `DrinksTab.tsx` beyond the meter it owns (see step 2).

## Steps

### 2. Primitives — `src/components/ui/*` (design id 1k)
Restyle button, card, badge, tabs, slider, and add the vessel meter. Also replaces the battery meter
at `DrinksTab.tsx:878–990` with form 1h.
- Acceptance: primary button 64px, 1px accent outline on transparent, radius 14, 500/22 `#b5abfc`,
  **never a solid fill**; secondary 56px, 1px `#383a46`, 400/19; card `#232532` (raised `#1c1e2c`),
  radius 14, no shadow, selection is a 2px accent ring; badge 11px/0.06em uppercase, radius 6;
  meter 1px `#383a46` container, radius 12, accent fill at 85% opacity animating over 900ms.
- Files: `src/components/ui/{button,card,badge,tabs,slider}.tsx`, one new meter component,
  the meter block in `src/components/tabs/DrinksTab.tsx`.

### 3. Chrome — bottom tab bar, no header
Remove the centred title and top tabs from `Dashboard.tsx`; add a bottom bar: Profile · Plan · Timeline.
- Acceptance: `min-height: 58px`, 1px `#292b31` top rule, 22px icon + 13px label, 5px gap, column
  layout; active `#b5abfc` 500-weight with a filled icon, inactive `#75798c` 400-weight outline icon;
  flush to the bottom with `padding-bottom: env(safe-area-inset-bottom)` (already on `body`).
- Watch: tabs must keep not unmounting when inactive — several hooks rely on staying mounted.

### 4. Plan / buzz picker (1c) — `src/components/tabs/PlanTab.tsx`
The largest single step. Includes the code half of the level-7 decision.
- Acceptance: the 1–10 slider is gone; four band cards (Light 1–2 / Social 3–4 / Loose 5–6 / Heavy 7),
  10px gap, `min-height 72px`, selected state is `box-shadow: 0 0 0 2px #9184d9` with no fill;
  levels 8–10 **deleted from `src/data/buzzLevels.ts`**; the danger warning deleted; a fading rule
  reading *"the scale ends here"* beneath the last card; `softer`/`stronger` **hidden** when Heavy is
  selected, with the reflow absorbed by the `margin-top:auto` spacer so the primary action does not
  move; duration steppers 56×56, 30-minute increments, 1 h–8 h; target card with the vessel meter and
  a note that turns `#d29a51` when the plan runs over target; `Build the night` as the 64px action.
- Watch: `getBACForLevel` throws on an unknown level. Deleting 8–10 must not leave a persisted
  `drinksmart.session.v1` or a `profiles` row pointing at a level that no longer exists — handle the
  out-of-range case by clamping to 7, and do not bump the localStorage version for it.

### 5. Timeline (1d) — `TimelineTab.tsx` + `SortableTimelineItem.tsx`
- Acceptance: fixed hero that never scrolls (NEXT label, drink name, 76px countdown, `Had it` 64px +
  `+15` 104×64); scrolling spine with a 1px fading vertical rule at x = 97px; rows
  `[62px time][34px marker][flex content]`; all seven row types from the spec table, including the
  now-marker and the `kept` chip; footer `Add a drink` / `Re-plan the rest`.
- Copy rule: additions and locked drinks read as *adjustment*, never breakage. Never "you've gone off plan".
- Ship 1d. 1e (proportional time axis) is an option only if the night is guaranteed to fit unscrolled.

### 6. Notification (1g) — `notificationService.ts`, `useWebDrinkReminders`
- Acceptance: one notification per drink at the scheduled time; the same two actions (`Had it`,
  `+15 min`) in the same two places every time; both must work without opening the app; break
  notifications are the quieter variant with no actions.
- Verification is `BLOCKED` on real iOS/Android hardware. `npm run dev` exercises the web toast
  fallback only. State that boundary; do not report native behaviour as verified.

### 7. Engine work — `src/contexts/AppContext.tsx`
Three things the engine cannot currently express. Logic, not styling. Highest-risk step.
- **Foundation accepted:** W3-A1 planner/session regression hardening is integrated at `9948345`;
  46 deterministic tests now protect generation budgets, unit normalization, request caching, and
  expired planning windows. W3-A2 deterministic rescheduling is the next serial ticket.
- **Breaks and water entries.** Every timeline entry currently carries ethanol; a 0% ABV row cannot be
  represented and would take 0% of target and 0 time, clustering at t=0. Needs its own entry type
  driven by duration, with an optional volume and no BAC contribution.
- **Wind-down state.** A terminal session phase with a sober-by estimate at 0.015 %/h elimination, a
  time-under-0.08% figure, a peak BAC, and drunk-vs-planned totals.
- **Rescheduling versus regeneration.** Deterministic rescheduling changes only the times/order of
  the existing drink set after a 15-minute push or timing adjustment. Model-driven regeneration is
  a separate flow: the deterministic engine computes consumed + kept ethanol and the remaining
  budget, the existing DeepSeek planner selects a new replaceable drink set, server/client code
  recomputes its arithmetic, and the engine applies it before rescheduling. Drinks remain lockable
  as `kept`; prune stale `lockedDrinkIds` while here. Never call both operations `replan` in code.
- Acceptance: `adjustedTargetMl` behaviour is unchanged; the Widmark formula is unchanged; existing
  ethanol-bearing plans produce byte-identical timelines to before the change.
- **This step requires deterministic tests, not a typecheck.** Vitest `^3.2.7` was explicitly
  approved on 2026-08-09. DeepSeek owns the planner, persistence, and engine implementation/tests;
  Luna is reserved for later visual wiring and browser acceptance.

### 8. Wind-down screen (1f) — new
Depends on step 7's terminal state.
- Acceptance: `SOBER AROUND` + time at 76px; three stat rows, 60px min-height, group radii
  `14 14 4 4` / `4` / `4 4 14 14`; the disclaimer wording kept verbatim; one care card; `Get home`
  (64px) and `End session` (56px text-only). No score, no streak, no praise.

## Delegation and verification

Per `AGENTS.md`, delegate through Traycer: `writespec` before dispatch, `speccheck` on return. Each
step is one spec. Every spec states its baseline explicitly:

- `npm run typecheck` — **must stay PASS**.
- `npm run lint` — **known FAIL**: 9 errors, 12 warnings as of 2026-08-07. Must not get worse.
- `npm run build` — must stay PASS.
- Browser, Supabase, and native verification are `BLOCKED` until that infrastructure is exercised.

## Exclusions

Not designed, not in scope: Profile/onboarding (`StatsForm`, `PreferencesPicker`), the drink picker and
menu scanner, establishment browsing, auth. A `DrinksTab.tsx` refactor beyond its meter. Re-enabling a
light theme. Pushing to `origin`.
