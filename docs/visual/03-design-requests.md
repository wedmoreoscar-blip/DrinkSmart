# Design requests — what has been asked of Claude Design

The third file of the visual history, referenced by `01-current-state.md` and
`02-planned-changes.md` since Wave 1 but not created until 2026-08-09. `01` records what is built,
`02` what is changing, and this one records **which requested drawings are available or still
outstanding.**

The lettered sections below are the stable identifiers those files already cite (`§A`, `§B–G`).
Keep the letters fixed even as items resolve; renumbering would silently break references
elsewhere.

This register is load-bearing, not bookkeeping. Per `docs/workflows/visual_check.md` a drawing is a
**precondition** for visual checking: with nothing authoritative to compare against there is no
check, only an agent's taste — which is the thing a design system exists to remove. Anything marked
Outstanding is out of scope for a visual pass, and the remedy is to obtain the drawing, never to
improvise one. Inventing values is rank 6 on the precedence ladder for exactly this reason.

---

## Available — drawn, and therefore checkable

In `design_handoffs/design_handoff_drinksmart_wave5/screens/`, with numeric acceptance criteria in that directory's
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
| 1l | `1l-form-primitives.png` | Form primitives: input, select, textarea, checkbox, switch, dialog, popover |
| 1m | `1m-sheet-radio-time-toast.png` | Sheet, radio, time picker, toast |
| 1n | `1n-buzz-picker-four-band.png` | Buzz picker, four-band form |
| 1o | `1o-buzz-picker-heavy.png` | Buzz picker, Heavy selected |
| 4a | `4a-profile.png` | §B Profile |
| 4b | `4b-onboarding-stats.png` | §C Onboarding stats |
| 4c | `4c-onboarding-taste.png` | §C Onboarding taste preferences |
| 4d | `4d-picker-categories.png` | §D Drink-picker categories |
| 4e | `4e-picker-category.png` | §D Drink-picker category and selection state |
| 4f | `4f-picker-custom-sheet.png` | §D Custom-drink sheet |
| 4g | `4g-scanner-capture.png` | §E Menu-scanner capture |
| 4h | `4h-scanner-waiting.png` | §E Menu-scanner waiting state |
| 4i | `4i-scanner-review.png` | §E Menu-scanner review and gaps |
| 4j | `4j-scanner-failed.png` | §E Menu-scanner failure state |
| 4k | `4k-establishments.png` | §F Establishment browsing |
| 4l | `4l-establishments-empty.png` | §F Partial empty state |
| 4m | `4m-auth-email.png` | §G Anonymous-account upgrade |
| 4n | `4n-auth-waiting.png` | §G Upgrade waiting state |
| 4o | `4o-keypad-field-group.png` | Numeric keypad field-group primitive for `4f`/`4i` |

---

## Resolved requests

### §A — Form vocabulary

**RESOLVED by `1l` and `1m`; W1-C is unblocked.** The drawings and matching HTML specify input,
numeric/unit fields, select, textarea, checkbox, switch, dialog, popover, sheet, radio, word-stops,
time picker, toast, empty states, hints, errors, and their 56/64px touch scale. The current product
still mixes redesigned buttons with stock-height fields until W1-C is implemented; that is now an
implementation backlog item, not a missing-design block.

### §B–G — Wave 4 screens

**RESOLVED 2026-08-11; Wave 4 is unblocked.** The active export supplies fourteen 402×874 frames,
matching literal HTML, trailing-script copy/formatting rules, and README numeric criteria. `4o`
draws the only new primitive the screens require.

| | Surface | Delivered frames |
| --- | --- | --- |
| §B | Profile | `4a` |
| §C | Onboarding | `4b`, `4c` |
| §D | Drink picker | `4d`, `4e`, `4f` |
| §E | Menu scanner | `4g`, `4h`, `4i`, `4j` |
| §F | Establishment browsing | `4k`, `4l` |
| §G | Auth / account upgrade | `4m`, `4n` |

There are currently no outstanding requested drawings in §A–G. The drink-detail edit screen and
notification-permission prompt remain undrawn because they have not been requested for this wave.

---

## Keeping this current

Move an item to Available when its drawing lands in `design_handoffs/design_handoff_drinksmart_wave5/screens/`, and say
in the same edit which numeric acceptance criteria came with it. Leave the letter behind as
resolved rather than reusing it.

A drawing with no stated numbers is checkable by eye only, which catches layout breakage and
misses "that is 13px, not 14px" — so a drawing without criteria is a partial delivery, not a
closed request.

---

## SS-H -- Wave 5 plan editing (OUTSTANDING, requested 2026-08-13)

Three elements settled in `docs/decisions.md` have no drawing, so they are **blocked for visual
checking** until Claude Design supplies frames. Per this file's own rule the remedy is to obtain the
drawing, never to improvise one -- inventing values is rank 6 on the precedence ladder.

| Id | Needed | Why the existing frames do not cover it |
| --- | --- | --- |
| 5a | Plan tab after `Build the night`: each category row showing its selected drinks as a drop-down, with the small unoutlined `hide`/`show` control | `4d` draws category rows in their resting state only. The drop-down, its rows, and an unoutlined text control are all new; the token set has no precedent for the last one |
| 5b | A Timeline entry carrying `lock`, `swap` **and `reorder`** | `1d` draws a single trailing lock on a 362x64 row of `[62px time][34px marker][flex content]`. Where further controls go, and what gives at 64px, is a spatial decision a drawing should settle. **Widened 2026-08-13** — see the amendment below |
| 5c | The `add a drink` picker entered via swap, constrained to +20% pure ethanol | `4d`/`4e` draw the unconstrained picker. Nothing states how a filtered catalogue reads, or how an unavailable drink is shown -- greyed, absent, or labelled |
| 5d | The tray meter's four over-target shade states, and the band-advice line | The meter is drawn only at or under target. Its over-target behaviour -- shade changes while the fill never rises past full -- has no frame, and the red band is the one place `no red` is overridden |
| 5e | The Timeline footer with `Add a drink` removed | `1d` line 95-96 and README line 733 draw the footer as a matched pair of flex-1 56px buttons. `Add a drink` is being destroyed (see `docs/decisions.md`), leaving `Re-plan the rest` alone in a row composed for two. The single-button footer has no frame |
| 5f | `4c` with a **Strength** rail beneath Sweetness | `4c` draws one word-stop rail. Strength has always existed as a preference and has never been collectable at onboarding. The card is near-full at 874, and the `Low & no` chip currently drives strength by proxy -- both are composition questions a drawing must settle |

**Amendment, 2026-08-13 — `5b` widened, `5e` and `5f` added.** Three further findings landed after
the original request was drafted, and **all were appended to the prompt and sent**.

- **`5b` is now a three-control problem.** Timeline reordering is already built (`DndContext` +
  `SortableContext`, `handleDragEnd` → `reorderTimelineEntries`) but has **no drawn affordance** at
  all: the drag listeners sit on the row's text block, so the gesture is press-the-name-and-drag,
  and no frame or README line depicts a handle. Lock, swap and reorder must be settled in **one**
  frame — drawn apart they settle nothing, since the whole question is what fits at 64px.
- **`5e` follows from destroying `Add a drink`**, which is now LOCKED on the unbounded-alcohol test.
- **`5f` closes a gap rather than adding a feature.** Strength is a *taste* preference like
  sweetness — it leans selection toward higher-ABV items and is **not** a quantity control; the
  fewer-but-stronger outcome is the deterministic engine's, from a fixed budget. The frame has to
  keep it from reading as a second intensity dial next to `1n`.

**The literal prompt is in `04-wave5-design-prompt.md`**, mirrored as the Traycer `spec` artifact
`wave-5-design-request`. Keep the two copies identical; the amendments are **append-only at the
bottom of the prompt** by Oscar's instruction, so extend it the same way.

**SENT to Claude Design 2026-08-13 ~20:30 BST, all appends included.** Wave 5 expects `5a`-`5f`.

The behaviour is fully settled; only the appearance is missing. A drawing that contradicts the
locked behaviour above is a regression to raise, not a spec to follow.
