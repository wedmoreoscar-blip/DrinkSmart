# Visual changes — planned and in flight

**Living document.** This is the "during" half of the visual history: what is about to change, what
is being changed right now, and what has just landed. Move anything completed into
`01-current-state.md` and strike it here, so the two files never claim the same thing.

Authority: `docs/decisions.md` outranks this file. This records *plan*, not *decision*.

---

## Shape of the work

**Whole-app and global, not screen-by-screen.** The design's touch scale replaces the shadcn
defaults outright — no dual scale, no per-screen migration. The consequence is accepted
deliberately: restyling `src/components/ui/*` reflows every screen at once, including screens with
no redesign step of their own.

**Primitives are the one serialization point.** Every screen consumes them, so they land before
screen work. Screen work then parallelises freely.

**Waves own disjoint file sets.** Within a wave, no two specs may name the same file. File-level
ownership is what prevents interference between simultaneous implementers, and it is what makes
agent-to-agent chat unnecessary. Reserve a2a for cases where two implementers must agree on an
interface — correct partitioning should avoid that.

---

## Wave 1 — Foundation

Status: **specs being written.** Nothing dispatched.

| Spec | Files | Clauses | Agent | Status |
| --- | --- | --- | --- | --- |
| W1-A primitives | `ui/{button,card,badge,slider}.tsx` | 4 | DeepSeek | spec drafting |
| W1-B vessel meter | new meter component + `DrinksTab.tsx:878–966` | 3 | Luna | spec drafting |
| W1-C form controls | `ui/{input,select,textarea,dialog,popover}.tsx` | ~5 | — | **deferred** |

**W1-C is deferred on purpose.** Claude Design never drew the form vocabulary, so building it now
means inventing values — rank 6 on the precedence ladder, which is exactly what the ladder demotes.
It is blocked on §A of `03-design-requests.md`. Interim cost, accepted: forms show 64px buttons
above 40px inputs until the drawings arrive.

`tabs.tsx` is deliberately **excluded** from Wave 1. The prototype shows tabs only as the bottom
bar, so that file belongs to Wave 2's chrome work; splitting it across two waves would have two
specs editing one file for the same purpose.

## Wave 2 — Designed screens

Blocked until Wave 1 integrates.

| Spec | Files | Agent |
| --- | --- | --- |
| W2-A bottom tab bar | `Dashboard.tsx`, `ui/tabs.tsx` | DeepSeek |
| W2-B Plan / buzz picker (1c) | `PlanTab.tsx`, `data/buzzLevels.ts` | DeepSeek |
| W2-C Timeline (1d) | `TimelineTab.tsx`, `SortableTimelineItem.tsx` | Luna |

W2-B carries a live hazard: `getBACForLevel` throws on an unknown level, and deleting levels 8–10
must not strand a persisted `drinksmart.session.v1` or a `profiles` row pointing at a deleted level.
Clamp to 7; do not bump the localStorage version for it.

## Wave 3 — Notification and wind-down

`notificationService.ts`, `useWebDrinkReminders`, plus design 1f. Wind-down needs engine work the
current model cannot express, and hits the test-runner question — vitest requires explicit approval
as a new dev dependency. Raise before starting.

## Wave 4 — Undesigned screens

Blocked on `03-design-requests.md` §B–G. These screens have no drawing at all, and Wave 1 will
visibly break them the moment it lands.

---

## Model routing for these waves

`screens/*.html` is rank 2 on the precedence ladder **and it is plain text**. A spec that quotes the
prototype's literal values carries no visual input, so DeepSeek can implement designed screens
without seeing an image.

Luna is reserved for work where *appearance judgement* decides something the markup does not —
timeline spine geometry, meter tick positioning, ambiguous reflow. This matters beyond cost:
codex quota was at 80% for the week on 2026-08-08.

## Delegation setup for these waves

- **`--permission-mode full_access`** for Wave 1 and 2 implementers. This is a deliberate
  per-wave override of the `auto_accept_edits` default in `docs/workflows/agent_selection.md`; do
  not change that default.
- **The orchestrator pre-installs `node_modules` in each worktree before dispatch**, sequentially.
  `tools/agent-lock` uses `flock -n` and fails fast with exit 75 rather than queueing, so parallel
  implementers running their own installs would see one succeed and the rest hard-fail. Specs
  therefore forbid dependency changes outright, which also keeps `package-lock.json` out of every
  delegated diff.
- Every spec states the verification baseline explicitly: after install, typecheck **PASS**, lint a
  known **FAIL at 9 errors / 12 warnings** that must not get worse, build **PASS**, browser
  **BLOCKED**.
