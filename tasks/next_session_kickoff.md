# Session Handoff / Kickoff — Wave 3 deterministic engine

Written 2026-08-09 06:27 BST. This is a normal-mode handoff. The canonical continuation was updated.

## Current state

Work in `/home/oscar/DrinkSmart` on `main`. The checkout was clean before this handoff and is
intentionally unpushed.

- Wave 2 is complete and browser-accepted at `79d3045`.
- W3-A1 planner/session regression hardening is implemented, `speccheck`-accepted, integrated at
  `9948345`, and recorded at `e4be57a`.
- **W3-A2 deterministic session rescheduling is accepted and integrated at `a612fad`.** Dispatched
  to DeepSeek `e4c274d1` on 2026-08-09 with Oscar's approval and `full_access`. `speccheck` found
  Req 3's absolute-anchor clause entirely absent and repaired it inline; six spec-derived tests
  were added. 93 tests pass. Step 7 of `tasks/todo.md` is complete.
- **The delegation workflow changed materially during this session** (`68a5437`, `5d3cfeb`,
  `53b23c6`, `df6743b`). `docs/workflows/delegation.md` is now the canonical fifteen-step path:
  warm worktrees are kept and re-synced rather than deleted, review happens on a scratch
  `integration` branch, repairs are inline, exactly one full baseline runs after the repairs, and
  `main` advances only by fast-forward. Verification is the checker's, never the implementer's —
  `tools/writespec-guard` now denies a spec that asks an implementer to write its own tests.
- Wave 3 steps 5 (Timeline), 6 (Notifications), and 8 (Wind-down) are unblocked and may run in
  parallel; their file scopes are disjoint. All four worktrees are clean, 0 behind `main`, and have
  dependencies installed.
- Wave 4 remains blocked because Profile/onboarding, drink picker, auth, menu scanner, and
  establishment browsing still have no Claude Design drawings.

## What W3-A1 established

Vitest `^3.2.7` and `npm test` now exist. Forty-six deterministic tests cover:

- one remaining-budget contract for newly generated drinks;
- no double subtraction of kept/locked alcohol in the offline fallback;
- exact generated-unit conversion against server/catalog arithmetic;
- preservation of generated serving counts as timeline portions;
- complete request fingerprints and stale-preload rejection;
- expired planning-window recovery; and
- fallback and boundary behavior.

During acceptance, `speccheck` found two production defects hidden by the submitted fixtures:
the 25 ml catalog shot versus 30 ml client-unit mismatch, and collapsed multi-serving timeline
portions. Both were fixed inline and retained as regression tests. The unnecessary lazy Supabase
import was replaced by a test-local mock so production loading behavior stayed unchanged.

## Locked workflow change

Commit `d60ab03` makes acceptance repairs checker-owned in `AGENTS.md`,
`docs/workflows/change_safety.md`, `docs/decisions.md`, and both client copies of `speccheck`.

After implementation handback, the reviewer fixes localized allowlisted failures and their tests
inline. Model ownership, task category, warm context, and implementer availability are not reasons
to delegate a repair. Re-contact is allowed only where completing the work would mean designing
rather than repairing (a missing clause alone is not enough, revised 2026-08-09), a substantially wrong
approach, a scope/authority expansion, or missing capability/infrastructure; the reviewer must name
the exception and evidence first. Reusing a warm agent still requires Oscar's confirmation.

## Required vocabulary for Wave 3

- **Reschedule**: deterministic timing/order changes over the existing drink set. No model call and
  no catalog selection.
- **Regenerate drinks**: the deterministic engine calculates consumed plus kept alcohol and the
  remaining budget; the existing DeepSeek planner selects a new replaceable drink set; trusted
  server/client code recomputes arithmetic; the engine applies it and then reschedules.
- Never name both operations `replan`. UI copy may still say “Re-plan the rest.”

## Warm agents and worktrees

All four delegated worktrees were clean at handoff.

| Intended later role | Agent | Worktree | State relative to main |
| --- | --- | --- | --- |
| W3-A2 engine | Warm DeepSeek Primitives `e4c274d1-51af-43e1-ba2c-d7597fafc9dc` | `traycer-redesign-step2-primitives` | clean; 9 behind / 2 branch-only already integrated |
| Later session actions | W2-B DeepSeek `827aef2b-1d5e-463e-ba7e-72295ba3e223` | `traycer-w2b-plan-buzz-picker` | clean; 3 behind |
| Later wind-down UI | W2-A DeepSeek `2a14d713-f67e-4707-9c27-1606775f00da` | `traycer-w2a-bottom-tab-bar` | clean; 9 behind / 2 branch-only already integrated |
| Final visual acceptance | Luna `da47f88c-30cb-4b0e-ae9a-ac0b4d15ed74` | `traycer-w1b-vessel-meter` | clean; 9 behind / 2 branch-only already integrated |

Do not create another agent or worktree while a compatible warm route exists. Recommend the warm
route and ask before messaging or mutating it.

## Verification confirmed on integrated main

- `npm test` — PASS, 46/46.
- `npm run typecheck` — PASS, 0 errors.
- `npm run lint` — known FAIL, exactly 9 errors / 11 warnings. W3-A1 improved the old warning count
  from 12 to 11; future work must not worsen it.
- `npm run build` — PASS. The existing large-chunk warning remains.
- `git diff --check` — PASS.
- Browser UI for W3-A1 was not required. Real Supabase, deployed edge functions, model-provider
  behavior, notifications, and native hardware remain `BLOCKED`.
- `npm audit` reports 18 development-tooling advisories (3 moderate, 15 high); unchanged and not
  repaired under the no-upgrade constraint.

## Read first

1. `AGENTS.md`
2. `docs/decisions.md`
3. `tasks/next_session_kickoff.md`
4. `docs/specs/2026-08-09-w3a-deterministic-session-engine.md`
5. `docs/specs/2026-08-09-w3a1-planner-session-regression-hardening.md`
6. `tasks/todo.md`
7. `docs/workflows/agent_selection.md`
8. `docs/workflows/change_safety.md`
9. `docs/workflows/verification.md`

## Exact next step

Wait for Oscar to approve W3-A2 dispatch. The kickoff itself is not authorization.

After approval:

1. Re-inventory the warm agents and confirm the W3-A2 target is still
   `e4c274d1-51af-43e1-ba2c-d7597fafc9dc`.
2. Confirm the worktree is clean, then merge current `main` into
   `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives`.
   Do not reset, rebase, stash, or create a new worktree.
3. Explicitly configure the existing GUI agent for opencode,
   `deepseek:deepseek-v4-flash`, max reasoning, and the permission mode Oscar approves.
4. Send the complete committed W3-A2 specification with reply expected.
5. On return, run `speccheck`. Keep all localized repairs inline under the checker-owned rule.
6. Integrate only after tests, typecheck, lint-count, build, and diff checks pass from the integrated
   root checkout.

Do not dispatch later Wave 3 tickets until W3-A2 is accepted and integrated. Do not push.

## PROMPT

```text
Continue DrinkSmart Wave 3 from /home/oscar/DrinkSmart on main.

Read AGENTS.md, docs/decisions.md, tasks/next_session_kickoff.md, and
docs/specs/2026-08-09-w3a-deterministic-session-engine.md first.

W3-A1 is complete and integrated at 9948345 with 46 deterministic tests. W3-A2 is the next serial
foundation ticket, but it is on explicit user hold. Do not message or mutate its warm agent/worktree
until I explicitly approve dispatch.

When I approve, recommend reuse of Warm DeepSeek Primitives agent
e4c274d1-51af-43e1-ba2c-d7597fafc9dc in its existing
traycer-redesign-step2-primitives worktree. Confirm the worktree is clean, merge current main into
it, explicitly configure DeepSeek V4 Flash/max with my approved permission mode, and dispatch the
complete committed W3-A2 spec.

After handback, apply speccheck. The reviewer owns every localized allowlisted repair and regression
test inline; do not send small fixes back to the implementer. Integrate only after npm test,
npm run typecheck, the 9-error/11-warning lint baseline, npm run build, and git diff --check are
verified from root main. Do not push. Do not start later Wave 3 work before W3-A2 acceptance.
```
