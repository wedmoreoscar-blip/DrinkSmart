# Active Plan — frontend redesign, steps 2 through 8

Source of truth: `design_handoffs/design_handoff_drinksmart/README.md` (the spec) and `screens/*.png` (appearance).
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

### 6. Notification (1g) — `notificationService.ts`, `useWebDrinkReminders` — **COMPLETE**
- Acceptance: one notification per drink at the scheduled time; the same two actions (`Had it`,
  `+15 min`) in the same two places every time; both must work without opening the app; break
  notifications are the quieter variant with no actions.
- Verification is `BLOCKED` on real iOS/Android hardware. `npm run dev` exercises the web toast
  fallback only. State that boundary; do not report native behaviour as verified.
- **Accepted and integrated at `789323f`.** Native and web reminders share stable entry IDs and copy;
  alcohol reminders expose `Had it` then `+15 min`, while break reminders remain action-free.
  Checker-derived tests cover copy, future-only scheduling, stable IDs, duplicate timestamps, web
  timing, native action dispatch, and listener lifecycle.
- **Acceptance repairs:** the checker replaced the scheduled notification timestamp with the real
  action time for `Had it`; removed the web fallback's 1.5-second early trigger; made the single
  native listener pair fan out only to live callbacks with safe partial-setup cleanup; and moved the
  60px split-action styling off global Sonner defaults so unrelated toast types remain unchanged.
  Real foreground/background/killed-process delivery and platform styling remain **BLOCKED** on
  physical iOS/Android device infrastructure.

### 7. Engine work — `src/contexts/AppContext.tsx` — **COMPLETE**
Three things the engine cannot currently express. Logic, not styling. Highest-risk step.
- **W3-A1 accepted** and integrated at `9948345`: 46 deterministic tests protect generation
  budgets, unit normalization, request caching, and expired planning windows.
- **W3-A2 accepted** and integrated at `a612fad`. `src/lib/sessionEngine.ts` now owns the pure
  timeline calculation, duration-bearing breaks, consumption logging, anchor-aware rescheduling,
  regeneration accounting, session phase, and the wind-down summary; `AppContext` calls it and
  keeps no second implementation. `sessionStore` persists only the minimal break/action/consumption
  inputs under the unchanged `drinksmart.session.v1` key. 93 tests pass.
- **Acceptance repair:** the delivered `rescheduleTimeline` omitted Req 3's absolute-anchor clause
  entirely — it took no kept ids, so any kept future entry was displaced by the preceding interval.
  Fixed inline by the checker, with six tests derived from the spec. The submitted suite had
  reported that clause as covered by a test containing no anchor; it is renamed to what it
  exercises. Treat delivered tests as claims, not evidence — see `docs/workflows/delegation.md`.
- Steps 5, 6, and 8 now consume this engine and are integrated.
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

### 8. Wind-down screen (1f) — **COMPLETE**
Depends on step 7's terminal state.
- Acceptance: `SOBER AROUND` + time at 76px; three stat rows, 60px min-height, group radii
  `14 14 4 4` / `4` / `4 4 14 14`; the disclaimer wording kept verbatim; one care card; `Get home`
  (64px) and `End session` (56px text-only). No score, no streak, no praise.
- **Accepted and integrated at `789323f`.** `TimelineTab` gates exclusively on
  `deriveSessionPhase`; `WindDownScreen` consumes `deriveWindDownSummary`, renders honest em-dash
  states, exact terminal copy and controls, and forwards `End session` through the existing
  `onNext`. Checker-derived tests cover phase wiring, live formatting, restrained copy, and null
  states. Final pixel and screenshot acceptance belongs to the separate Luna visual check.

## Delegation and verification

Per `AGENTS.md`, delegate through Traycer: `writespec` before dispatch, `speccheck` on return. Each
step is one spec. Every spec states its baseline explicitly:

- `npm run typecheck` — **must stay PASS**.
- `npm run lint` — **known FAIL**: exactly `20 problems (10 errors, 10 warnings)` as of 2026-08-13
  (derived on `b6c3768`; was 10/11 on 92dd1d1, was 9 errors from 12). Must not get worse. **Derive
  this number by running the command when writing a spec; do not quote it from here.**
- `npm run build` — must stay PASS.
- Browser, Supabase, and native verification are `BLOCKED` until that infrastructure is exercised.

## Exclusions

Profile/onboarding (`StatsForm`, `PreferencesPicker`), the drink picker and menu scanner,
establishment browsing, and account upgrade are now designed as Wave 4 and are no longer excluded.
Still excluded: undrawn drink-detail editing and notification-permission screens; unrelated
`DrinksTab.tsx` refactoring beyond the exact Wave 4 surface work; re-enabling a light theme; and
pushing to `origin`.

## Agent infrastructure — Codex TUI receiver adapter (2026-08-10)

Status: **complete (static implementation)**. Canonical contract:
`docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md`.

- [x] Add `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md` as the canonical messaging contract.
- [x] Add the thin `codex-tui-relay` skill with mirrored portable behavior and Codex UI metadata.
- [x] Add discovery and cross-references in `AGENTS.md`, setup docs, delegation and agent selection.
- [x] Record the locked Codex-TUI-orchestrator and persistent-receiver decision.
- [x] Extend `tools/check-agent-setup` to validate the document/skill/discovery chain.
- [x] Validate the skill package, run the static setup check and inspect the complete scoped diff.

Acceptance:

- A future Traycer Codex TUI discovers `$codex-tui-relay` from `AGENTS.md` and can locate or create
  the epic's single persistent OpenCode GUI / DeepSeek V4 Flash / max receiver.
- Codex TUI is authorized only as orchestrator while the skill is active; Codex implementers remain
  GUI-only.
- Commissions retain `--expect-reply`; every usable question, status, blocker and handback is sent
  explicitly to the receiver, whose transcript carries processed markers across Codex sessions.
- The receiver uses the DrinkSmart repository context and `full_access`, remains passive by
  instruction, and is idle whenever Codex TUI is not orchestrating.
- Existing delegation, `writespec`, `speccheck`, worktree and verification authority is unchanged.
- No application source, dependency, package manifest or lockfile is changed by this work.

Runtime receiver creation and the no-code end-to-end smoke test are intentionally deferred until the
first real `$codex-tui-relay` activation; this documentation implementation did not provision a live
Traycer agent.

## Queued — parallelise the visual check's recon stage (approved 2026-08-13)

Approved by Oscar during the Wave 4 visual check, to be written **as soon as that pass closes** and
before the next wave's check. Deliberately not written mid-flight: changing the contract under a
running agent produces a recon that half-follows two versions of the rules.

**The defect in `docs/workflows/visual_check.md`:** recon is serial and single-agent while repair is
parallel and multi-agent. That is inverted. Discovery is the stage that scales cleanly; repair is the
stage carrying the hazards. The doc parallelises the hazardous half and serialises the safe one.

**Why the constraint does not transfer.** Fixers must own disjoint *files* because a shared worktree
has no isolation and last-write-wins silently. Recon writes no product code — its only writes are
per-screen `notes.md`, already disjoint by screen. The safety rationale simply does not apply, and
the doc never noticed because one agent was enough when a wave was eight frames.

**The change:** allow n recon agents on disjoint screen sets above a threshold of roughly eight drawn
frames. **Luna-0 remains sole author of the headcount and the file-ownership split** — that synthesis
genuinely needs whole-wave context, which is the real reason recon was single-agent, and it survives
the change intact.

**Second change, same edit:** split "Measure, do not only look" into two standards. Recon measures
enough to **prove a defect is real**; the fixer measures enough to **know it is gone**. Today every
number is measured three times — recon, fixer, then the orchestrator's §9 pass. A recon finding still
may not be "looks off to me": it must still carry a number that contradicts a stated one.

Evidence to fold in when writing: Wave 3 ran 8 frames / 3 agents / ~87 min recon-to-milestone; Wave 4
ran 15 frames / 1 recon agent. Ask Luna-0 in its handback where recon actually lost time — driving
into hard states, measuring, or writing — since it is the only one that knows.
