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

> **This applies to implementation, not to the final visual check.** That phase
> (`docs/workflows/visual_check.md`) deliberately runs several Luna agents in *one shared
> worktree* and expects them to talk to each other. The reasoning above still holds where it
> matters — file ownership is disjoint there too, and is the only safety net, since a shared tree
> has no merge to catch a collision. What changes is the purpose of a2a: not agreeing an
> interface, but keeping the app visually coherent, which no partitioning can guarantee because
> coherence is a property of the whole.

---

## Wave 1 — Foundation

Status: **W1-A and W1-B integrated 2026-08-08. W1-C is designed and unblocked, not implemented.**

| Spec | Files | Agent | Status |
| --- | --- | --- | --- |
| W1-A primitives | `ui/{button,card,badge,slider}.tsx` | DeepSeek | **DONE** — `ad0f172`, merged `afa6c5e` |
| W1-B vessel meter | `ui/vessel-meter.tsx` + `DrinksTab.tsx` | Luna | **DONE** — `bb3a27a`, merged `eff7f94` |
| W1-C form controls | `ui/{input,select,textarea,dialog,popover}.tsx` | DeepSeek | **UNBLOCKED 2026-08-08** — build from `1l`, and `1m` for sheet/radio/time/toast |

**Both specs passed `speccheck` with fixes applied inline.** What the checks caught, since the
pattern will recur:

- **Removing a variant key is a breaking API change, not a visual one.** W1-A deleted Button's
  `default` size and Badge's `default`/`secondary`/`destructive`/`outline` variants, breaking four
  call sites. The spec had said "call sites will break visually — do not fix them", so the
  implementer correctly left them. **Future specs that remove keys must name the call sites.**
- **Quoting design copy as an example of tone reads as literal copy.** W1-B hardcoded "Drop the
  extra shot to land on target.", which would tell a user over by a pint to drop a shot. The real
  copy was in the 1k prototype's trailing `<script>` block — **the script blocks carry copy and
  formatting rules, not just markup.** Read them.
- **A prototype's buttons are full-width, so they carry no horizontal padding.** Ported literally,
  inline buttons had text flush to the border. Padding needs stating explicitly.

**W1-C is now ready to commission from `1l` and `1m`.** Those drawings close §A with exact control,
state, touch, and surface geometry. Interim cost until implementation: forms still show redesigned
64px buttons beside stock-height inputs.

`tabs.tsx` is deliberately **excluded** from Wave 1. The prototype shows tabs only as the bottom
bar, so that file belongs to Wave 2's chrome work; splitting it across two waves would have two
specs editing one file for the same purpose.

## Wave 2 — Designed screens

Status: **integrated and visually accepted 2026-08-11.**

| Spec | Files | Agent |
| --- | --- | --- |
| W2-A bottom tab bar | `Dashboard.tsx`, `ui/tabs.tsx` | DeepSeek — **DONE** |
| W2-B Plan / buzz picker (**1n/1o**, not 1c) | `PlanTab.tsx`, `data/buzzLevels.ts` | DeepSeek — **DONE** |
| W2-C Timeline (1d) | `TimelineTab.tsx`, `SortableTimelineItem.tsx` | Luna — **DONE** |

W2-B carries a live hazard: `getBACForLevel` throws on an unknown level, and deleting levels 8–10
must not strand a persisted `drinksmart.session.v1` or a `profiles` row pointing at a deleted level.
Clamp to 7; do not bump the localStorage version for it.

## Wave 3 — Notification and wind-down

Status: **integrated and visually accepted 2026-08-11.** `notificationService.ts`,
`useWebDrinkReminders`, the deterministic session-engine support, and design 1f are complete.
Browser fallback visuals pass; native notification delivery and platform appearance remain
**BLOCKED** on physical iOS/Android hardware.

## Wave 4 — Remaining application surfaces

Status: **UNBLOCKED 2026-08-11; implementation not started.** The active Claude Design handoff
delivers Profile (`4a`), onboarding (`4b`–`4c`), the drink picker (`4d`–`4f`), menu scanning
(`4g`–`4j`), establishments (`4k`–`4l`), account upgrade (`4m`–`4n`), and the shared numeric
keypad field-group primitive (`4o`). Each frame has a PNG, matching literal HTML, and numeric/copy
criteria in the active README. Wave 4 can now be broken into implementation specs.

---

## Model routing for these waves

`screens/*.html` is rank 2 on the precedence ladder **and it is plain text**. A spec that quotes the
prototype's literal values carries no visual input, so DeepSeek can implement designed screens
without seeing an image.

Luna is reserved for work where *appearance judgement* decides something the markup does not —
timeline spine geometry, meter tick positioning, ambiguous reflow. This matters beyond cost:
codex quota was at 80% for the week on 2026-08-08.

## Delegation setup for these waves

- **`--permission-mode full_access`** for implementers. As of 2026-08-09 this is the documented
  default in `docs/workflows/agent_selection.md`, no longer a per-wave override.
- **The orchestrator pre-installs `node_modules` in each worktree before dispatch**, sequentially.
  `tools/agent-lock` uses `flock -n` and fails fast with exit 75 rather than queueing, so parallel
  implementers running their own installs would see one succeed and the rest hard-fail. Specs
  therefore forbid dependency changes outright, which also keeps `package-lock.json` out of every
  delegated diff.
- Every spec states the verification baseline explicitly: after install, typecheck **PASS**, lint a
  known **FAIL at 9 errors / 11 warnings** that must not get worse, build **PASS**, browser
  **BLOCKED**.

## Wave 3 final visual status

**COMPLETE 2026-08-11.** Three Luna fixers repaired the five recon findings in one shared worktree;
the orchestrator then independently re-captured, opened, compared, and measured every selected
drawn state. The accepted `*-ok.png` milestones and conclusions are committed under
`docs/visual/screenshots/`. Native notification verification remains the only infrastructure block.
