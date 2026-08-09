# Session Kickoff — whole-app redesign, Wave 2

> **2026-08-09 continuation:** Wave 2 is complete and browser-accepted at `79d3045`. Wave 3 starts
> with two serial DeepSeek foundation specs: W3-A1 planner/session regression hardening at
> `docs/specs/2026-08-09-w3a1-planner-session-regression-hardening.md`, then W3-A2 deterministic
> session rescheduling at `docs/specs/2026-08-09-w3a-deterministic-session-engine.md`. W3-A1 is
> integrated at `9948345`: Vitest `^3.2.7` is installed, 46 planner/session regression tests pass,
> and the production-catalog unit and serving-portion defects found by `speccheck` are fixed. W3-A2
> is the next serial ticket and has not yet been dispatched. Luna is reserved for later visual wiring
> and browser acceptance.

Written 2026-08-08 22:24 BST. **Wave 1 is done, integrated and verified.** The task below is Wave 2.

## Context

The redesign is now **whole-app and global**, not the old step 2-of-8 plan. `tasks/todo.md`'s
step numbering is superseded by the wave plan in `docs/visual/02-planned-changes.md`.

**Wave 1 landed** (`afa6c5e`, `eff7f94`): `button`, `card`, `badge`, `slider` restyled to design 1k,
and a new `src/components/ui/vessel-meter.tsx` replacing the battery meter in `DrinksTab`. Both were
delegated, both passed `speccheck`, both merged clean.

Three of the five recorded visual violations are now fixed, including **the last red and green in
the product**. What remains: chrome (Wave 2) and the touch floor on the ~46 primitives Claude
Design never drew.

### The one thing that most needs knowing

**`npx tsc --noEmit` is a no-op in this repo and always was.** The root `tsconfig.json` is
`"files": []` plus project references; without `-b` it compiles zero files and exits 0. Every
"typecheck PASS" recorded before 2026-08-08 was evidence of nothing, and it concealed four real
errors plus four more introduced by a delegated diff.

`npm run typecheck` is now `tsc -b --noEmit`, proven to work by injecting a deliberate error.
**Never quote bare `tsc --noEmit` as evidence.** The general rule, now locked: a green check is only
evidence if the command has been shown capable of going red.

## Where to work — read this before your first write

**Write to `/home/oscar/DrinkSmart` on `main`. That is the integration target.**

Traycer may launch you inside a worktree. That does not make the worktree your working tree. The
previous orchestrator ran from `traycer-stellar-raven` and committed everything to
`/home/oscar/DrinkSmart`; its own worktree ended 13 commits behind `main` and was simply discarded.
Do the same. Delegated implementers work in worktrees — orchestrators do not.

## READ FIRST

- `AGENTS.md`, then `CLAUDE.md` (verification baseline rewritten 2026-08-08)
- `docs/decisions.md` — new/amended: precedence ladder, whole-app scale, specs-in-repo, typecheck
- `docs/visual/01-current-state.md` — what the app looks like in code right now
- `docs/visual/02-planned-changes.md` — the wave plan and what `speccheck` caught
- `docs/visual/03-design-requests.md` — the Claude Design brief, still unanswered
- `docs/workflows/agent_selection.md`

## Locked constraints that bite immediately

- **Claude Design entities are ground truth**, in this order: `tokens/` → `screens/*.html` (values)
  → `screens/*.png` (appearance) → README prose → `tasks/todo.md` → implementer judgement. The prose
  has been wrong repeatedly; the markup has not.
- **Read the prototype's trailing `<script>` blocks.** They carry copy and formatting rules, not
  just markup. A spec that quotes design copy as an example of *tone* will get it shipped literally.
- Global touch scale: `act` 64px is the one primary action, `tap` 56px the floor, icon 56×56 r12.
  No dual scale.
- One accent, no palette. No red, no green, ever. Outlined, never filled.
- Do not read `design_handoff_drinksmart/DrinkSmart-design-reference.html` (1.3 MB) or
  `project/DrinkSmart.dc.html`.
- **Every delegation is commissioned by a `writespec` spec with the fixed blocks appended via
  `cat`** — the `PreToolUse` hook rejects it otherwise — and accepted only via `speccheck`.
- **Write specs to `docs/specs/` and commit them.** Traycer artifacts are epic-scoped and vanish;
  use them only as a review surface before dispatch.

## Verification baseline — confirmed on `main`, 2026-08-08

- `npm run typecheck` (`tsc -b --noEmit`) — **PASS, 0 errors**
- `npm run lint` — **known FAIL, exactly 9 errors / 12 warnings.** Must not get worse.
- `npm run build` — **PASS** (~16–26s)
- Browser, Supabase, edge-function and native verification remain **BLOCKED**.
- **Nothing has been rendered in a browser.** Wave 1 is typechecked and built, never seen. This is
  the single largest unverified area and the user has chosen to keep it that way for now.

## Delegation setup

**Two implementers are alive with warm codebase context — reuse them rather than spawning fresh:**

| Agent | id | Harness | Worktree |
| --- | --- | --- | --- |
| DeepSeek (did W1-A) | `a0b2fcaa-5bbb-4076-97e5-680928a1e542` | opencode | `traycer-redesign-step2-primitives` |
| Luna (did W1-B) | `da47f88c-30cb-4b0e-ae9a-ac0b4d15ed74` | codex | `traycer-w1b-vessel-meter` |

Both worktrees are merged, clean and **already have `node_modules`**. There are four specs, so
**spawn exactly two more implementers — both DeepSeek** — and pre-install their worktrees yourself.

Suggested routing:

| Spec | Agent |
| --- | --- |
| W1-C form controls (`1l`/`1m`) | existing DeepSeek `a0b2fcaa` |
| W2-C Timeline (`1d`) | existing Luna `da47f88c` — spine geometry genuinely needs appearance judgement |
| W2-A bottom tab bar | new DeepSeek |
| W2-B buzz picker (`1n`/`1o`) | new DeepSeek |

W2-B looks like Luna work because it compares two frames, but it is not: extract the primary
action's offset from both `1n` and `1o` markup and **state the number in the spec**. Once the value
is written down it is a text task, and Luna is better spent on the timeline.

- `--permission-mode full_access` for these waves. Deliberate per-wave override of the
  `auto_accept_edits` default in `agent_selection.md`; **do not change that default.**
- `--reasoning-effort max` is required, not optional. Config alone does not reach a Traycer agent.
- Confirm `create` returns a clean agent id. A timed-out create still makes an agent with **none**
  of the flags applied.
- `screens/*.html` is plain text, so **DeepSeek can build designed screens without visual input.**
  Reserve Luna for appearance judgement — spine geometry, tick positioning, ambiguous reflow.
  Codex quota was at ~80% for the week on 2026-08-08.
- The orchestrator pre-installs each worktree. `agent-lock` fails fast, so parallel implementers
  must not run their own `npm install`.
- Send a status ping or stand-down with `[no-spec]` in the message; the guard passes it.

## Explicit exclusions

- **Do not push.** Enforced by `permissions.deny`. `main` is ~22 commits ahead of `origin/main`,
  deliberately.
- **Wave 4 (undesigned screens) is still blocked.** Onboarding, Profile, drink picker, auth, menu
  scanner and establishment browsing have no drawing. Do not build them from tokens alone.
- Do not start wind-down/engine work without raising the test-runner question; vitest needs
  explicit approval.
- Not in scope: auth, menu scanner, establishment browsing, a `DrinksTab.tsx` refactor beyond the
  meter already replaced, re-enabling a light theme.

## Known follow-ups from Wave 1

- The `entries` reduce in `DrinksTab` duplicates the volume/ABV computation around
  `DrinksTab.tsx:198–235`. A shared helper was out of the implementer's permitted range.
- `VesselMeter` recomputes `plannedMl` from `entries` while the surrounding screen uses
  `pureAlcoholChosen`. They agree today; they could drift.
- Button `sm` and `lg` are aliases of `tap`. Call sites should migrate to explicit `tap`/`act`.

## PROMPT

Specs are already written and committed at `2dab3a4`; all four worktrees exist with `node_modules`
installed. The next session only has to dispatch. Verified 2026-08-08 23:45.

```text
Continue DrinkSmart Wave 2 from /home/oscar/DrinkSmart on main.

Read first:
- AGENTS.md
- docs/decisions.md
- tasks/next_session_kickoff.md
- docs/visual/02-planned-changes.md
- the four committed specs under docs/specs/

Current state:
- main is clean; commissioning specs committed as 2dab3a4.
- Do not rewrite the kickoff before dispatch.
- Do not push.

Dispatch this single parallel batch:

1. W1-C -> existing DeepSeek GUI agent
   id: a0b2fcaa-5bbb-4076-97e5-680928a1e542
   worktree: traycer-redesign-step2-primitives
   spec: docs/specs/2026-08-08-w1c-form-controls.md

2. W2-C -> existing Luna GUI agent
   id: da47f88c-30cb-4b0e-ae9a-ac0b4d15ed74
   worktree: traycer-w1b-vessel-meter
   spec: docs/specs/2026-08-08-w2c-timeline.md

These existing worktrees need no preparation or reinstall. Send their specs directly.

Create exactly two new DeepSeek GUI agents in these already-created, dependency-prepared worktrees:

3. W2-A
   worktree: /home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2a-bottom-tab-bar
   spec: docs/specs/2026-08-08-w2a-bottom-tab-bar.md

4. W2-B
   worktree: /home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-w2b-plan-buzz-picker
   spec: docs/specs/2026-08-08-w2b-plan-buzz-picker.md

For both new agents use:
--harness opencode
--model deepseek:deepseek-v4-flash
--reasoning-effort max
--surface gui
--permission-mode full_access

Confirm each create returns a clean agent id. Dispatch all four specs with --expect-reply before
waiting. The specs already contain the mandatory verbatim writespec blocks.

On return, run the speccheck skill separately against every implementation before accepting it.
Integrate only checked work into root main, preserve unrelated changes, and verify:
- npm run typecheck (tsc -b --noEmit): PASS, 0 errors. NEVER bare tsc --noEmit; it compiles nothing.
- npm run lint: known FAIL at exactly 9 errors / 12 warnings; must not worsen
- npm run build: PASS
- browser/live/native verification: BLOCKED

Do not alter BAC formulas, refactor DrinksTab, add dependencies, or push. Keep each worktree until
its integration verification succeeds.
```

## Known Traycer quirks

- **Killing a Traycer agent's processes does not remove it.** The host supervisor respawns the
  app-server within seconds. There is no `traycer agent delete`; removal is UI-only.
- Agent `5420734b-b6c2-4a17-8664-fb7f7508d85c` (a Sol orchestrator) is a phantom: running, invisible
  in the sidebar and not in the archive. It pins the stale `traycer-stellar-raven` worktree. It is
  harmless and blocks nothing.
- Codex writes two rollout files per session under `~/.codex/sessions/`. A lost session can be read
  straight off disk, which is how this prompt was recovered.
