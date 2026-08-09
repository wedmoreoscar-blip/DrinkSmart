# Design requests — what has been asked of Claude Design

The third file of the visual history, referenced by `01-current-state.md` and
`02-planned-changes.md` since Wave 1 but not created until 2026-08-09. `01` records what is built,
`02` what is changing, and this one records **what we have no drawings for.**

The lettered sections below are the stable identifiers those files already cite (`§A`, `§B–G`).
Keep the letters fixed even as items resolve; renumbering would silently break references
elsewhere.

This register is load-bearing, not bookkeeping. Per `docs/workflows/visual_check.md` a drawing is a
**precondition** for visual checking: with nothing authoritative to compare against there is no
check, only an agent's taste — which is the thing a design system exists to remove. Anything in
Outstanding is out of scope for a visual pass, and the remedy is to obtain the drawing, never to
improvise one. Inventing values is rank 6 on the precedence ladder for exactly this reason.

---

## Available — drawn, and therefore checkable

In `design_handoff_drinksmart/screens/`, with numeric acceptance criteria in that directory's
`README.md` and in `tasks/todo.md`.

| Id | Drawing | Covers |
| --- | --- | --- |
| 1b | `1b-tokens.png` | Token layer: colour, type scale, spacing |
| 1c | `1c-buzz-picker.png` | Plan tab, buzz picker |
| 1d | `1d-timeline.png` | Timeline tab |
| 1e | `1e-timeline-time-axis.png` | Timeline, proportional time axis (optional variant) |
| 1f | `1f-wind-down.png` | Wind-down screen |
| 1g | `1g-notification.png` | Notification appearance |
| 1h | `1h-1j-meter.png` | Vessel meter |
| 1i | `1i-meter-segmented.png` | Meter, segmented variant |
| 1j | `1j-meter-mid-session.png` | Meter, mid-session state |
| 1k | `1k-primitives.png` | Core primitives: button, card, badge, tabs, slider |
| 1l | `1l-form-primitives.png` | Form primitives — partial; see §A |
| 1m | `1m-sheet-radio-time-toast.png` | Sheet, radio, time picker, toast |
| 1n | `1n-buzz-picker-four-band.png` | Buzz picker, four-band form |
| 1o | `1o-buzz-picker-heavy.png` | Buzz picker, Heavy selected |

---

## Outstanding

### §A — Form vocabulary

**Blocks W1-C.** The five drawn primitives now meet the touch scale; `input`, `select`, `dialog`,
`popover` and the rest of the ~46 undrawn primitives remain at `h-10` (40px) and below. Every
screen therefore mixes 56px buttons with 40px inputs.

That mismatch is an accepted interim cost of applying the scale globally, not a defect to patch
locally. Building the form vocabulary now would mean inventing values. It closes when these
drawings arrive and W1-C runs.

Needed: input, select, textarea, checkbox, radio, dialog, popover, dropdown, and the touch scale
they sit on.

### §B–G — Undesigned screens

**Blocks Wave 4.** No drawing at all. The primitives restyle reflows all of them the moment it
lands, which changes how they look without making them checkable — reflowed is not designed.

| | Surface | Notes |
| --- | --- | --- |
| §B | Profile | The post-Phase-1 three-tab Profile content |
| §C | Onboarding | `StatsForm`, `PreferencesPicker`, the gating modal |
| §D | Drink picker | `DrinksTab` beyond the meter it already owns |
| §E | Menu scanner | Capture and parse flow |
| §F | Establishment browsing | Selection and per-establishment drinks |
| §G | Auth / account upgrade | Including the two-step anonymous upgrade |

---

## Keeping this current

Move an item to Available when its drawing lands in `design_handoff_drinksmart/screens/`, and say
in the same edit which numeric acceptance criteria came with it. Leave the letter behind as
resolved rather than reusing it.

A drawing with no stated numbers is checkable by eye only, which catches layout breakage and
misses "that is 13px, not 14px" — so a drawing without criteria is a partial delivery, not a
closed request.
