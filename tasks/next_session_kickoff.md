# Session Handoff / Kickoff — DrinkSmart Wave 4, legs 6 and 7

Written 2026-08-12 23:30 BST. Normal-mode handoff. The canonical continuation was replaced.

## Outcome of this session

**Five of Wave 4's seven legs are implemented, reviewed, repaired and integrated.** `main` is at
`961a044`. The remaining two are written, committed, guard-compliant, and assigned — **but not
dispatched**, deliberately: Oscar is raising `.wslconfig` `processors` from 2 to 3, which needs
`wsl --shutdown`, and that kills every agent mid-task.

Everything is committed. All nine worktrees are clean and level with `main`. Nothing was pushed.

### The seven legs

| Leg | Surface | Agent | State |
| --- | --- | --- | --- |
| W4-1 | `4o` numeric keypad primitive | `deepseek_imp_0` | **integrated** |
| W4-2 | §B Profile `4a` | `deepseek_imp_1` | **integrated** |
| W4-3 | §C Onboarding `4b` `4c` (+ amendment 1) | `deepseek_imp_2` | **integrated** |
| W4-4 | §G Account upgrade `4m` `4n` | `deepseek_imp_3` | **integrated** |
| W4-7 | §F Establishments `4k` `4l` | `deepseek_imp_4` | **integrated** |
| W4-5 | §D Drink picker `4d` `4e` `4f` | `deepseek_imp_0` | **specced, NOT dispatched** |
| W4-6 | §E Menu scanner `4g`–`4j` | `deepseek_imp_4` | **specced, NOT dispatched** |

### Three corrections to the previous kickoff, which was wrong on all three

1. **W1-C was already implemented and on `main`** (`91b88a6`, corrected in `47f5acc`), contrary to
   the previous kickoff and `docs/visual/*`. The form primitives already carry `h-tap`,
   `rounded-ctl`, `bg-field` and the 2px focus ring. That collapsed the primitives-first boundary
   from "W1-C + `4o`" to **`4o` alone**, which is why Wave 4 ran as one wave rather than two.
2. **§F establishments had no screen at all.** It existed only as collapsible groups inside
   `DrinksTab`'s command palette, so `4k`/`4l` was new work, not a restyle.
3. **`$codex-tui-relay` did not apply.** This session was Claude Code TUI, the default orchestrator
   under `AGENTS.md`; the relay is for a Codex TUI orchestrator and is inert here. Traycer's agent
   CLI was used directly.

### Verification baseline — derived live on `main` at `92dd1d1`, 2026-08-12

| Command | Result |
| --- | --- |
| `npm test` | **PASS — 119 tests across 11 files** (was 102; the checker added 17) |
| `npm run typecheck` | **PASS — 0 errors** |
| `npm run lint` | **KNOWN FAIL — exactly `21 problems (10 errors, 11 warnings)`** |
| `npm run build` | **PASS — ~27–33s** |
| `git diff --check` | clean |

**`tasks/todo.md` and `CLAUDE.md` still record the lint baseline as 9 errors. It is 10.** Derive it
by running the command; do not quote either file.

Browser, Supabase, edge-function, notification and native checks remain **BLOCKED** on real
infrastructure. Nothing in Wave 4 has been rendered in a browser — that is the visual check's job.

## What review found, and what it cost

`speccheck` ran once across the whole five-branch diff: **24 of 27 clauses satisfied, 3 repaired
inline, 0 handed back, 0 out-of-scope changes** — all 20 files inside their allowlists.

- **W4-2 c4** — the admin group was nested inside the Account card. `4a` closes both the CTA div
  *and* the card before the fading rule (div balance zero), so it is a sibling. Moved out. Its rule
  also insets at **48px**, not the 30px the spec wrongly pointed at.
- **W4-4 c2** — "nights planned" counted `user_sessions` rows; that table is one row per user
  (`user_id` is the PK), so it could only ever read 0 or 1 and would have said "1 nights planned".
  Column removed rather than shown wrong. Restoring it needs a completed-sessions table.
- **Amendment 1 covered 17 of 18 category keys.** `alcopops` was in no family, so that preference
  could never be expressed by a chip nor read by the planner. **Found by a clause-derived test, not
  by reading the code.**

Not repaired, and needs no code: **W4-7 c2's "by last used" ordering.** `useEstablishments` already
orders by name, so own venues arrive alphabetically and deterministically. Recency has no data
source — `Establishment` exposes only `id`, `name`, `isGlobal` — and adding one is a schema change.

## Two cross-cutting fixes that outlive Wave 4

1. **`cn()` was silently dropping every custom font size** (`a19790a`). `twMerge` read `text-body`,
   `text-title`, `text-micro` as *colours* and evicted them. `src/lib/utils.ts` now registers the
   scale. **Keep that list in step with `fontSize` in `tailwind.config.ts`.**
2. **`writespec` gained a third fixed block and the guard enforces it** (`d45295c`). Every Wave 4
   spec appended `closing.md` and then instructed all four verification commands on top of it. The
   guard checked the blocks were *present*, never whether the spec contradicted them. See the
   2026-08-12 amendment in `docs/decisions.md`.

## Required startup and execution sequence

1. Invoke `/kickoff`, read the files below, and inspect current Git, worktree and agent state.
2. **Confirm the WSL restart happened** and `nproc` now reports 3. If it still reports 2, say so —
   the contention that shaped this session's problems is still present.
3. Re-verify the agents are alive (`traycer agent list`), and that all worktrees are clean and level
   with `main`. A restart kills agents; they may need waking.
4. **Dispatch W4-5 and W4-6.** Both specs are committed, carry the re-derived baseline, and already
   name their worktrees. Send each with `--expect-reply`.
5. Follow `docs/workflows/delegation.md` end to end: commit handbacks on their branches, merge both
   into one `integration/w4b`, one `speccheck` pass, repair inline, **one** full baseline, then
   fast-forward `main` and re-sync every worktree.
6. **Wire `PlanTab.tsx` yourself.** It is deliberately excluded from all seven allowlists because it
   mounts both the picker and the scanner, and Wave 4's navigation runs picker → venue row →
   establishments → scanner. `EstablishmentsScreen` takes
   `{ selectedId, onSelect, onScanMenu, onBack }`; `DrinksTab` gains `onOpenVenues?: () => void`;
   `MenuScannerTab` keeps `onNext`.
7. **Then halt loudly for the visual check and wait for Oscar.** Do not contact `visual_luna_0`
   until he says go. Once authorized, follow `docs/workflows/visual_check.md` in full.

## Agent and worktree inventory

All nine worktrees are clean at `961a044`. All seven implementers are `opencode` / `deepseek-v4-flash`
/ `max` / `gui` / `full_access`, verified from the harness rather than self-report.

| Agent | Worktree / branch | Context used | Assigned next |
| --- | --- | --- | --- |
| `deepseek_imp_0` | `drinksmart_worktree_0` / `deepseek_agent_0` | smallest | **W4-5 picker** |
| `deepseek_imp_1` | `drinksmart_worktree_1` / `deepseek_agent_1` | largest | — |
| `deepseek_imp_2` | `drinksmart_worktree_2` / `deepseek_agent_2` | large | — |
| `deepseek_imp_3` | `drinksmart_worktree_3` / `deepseek_agent_3` | large | — |
| `deepseek_imp_4` | `drinksmart_worktree_4` / `deepseek_agent_4` | small | **W4-6 scanner** |
| `deepseek_imp_5` | `drinksmart_worktree_5` / `deepseek_agent_5` | unused | idle spare |
| `deepseek_imp_6` | `drinksmart_worktree_6` / `deepseek_agent_6` | unused | idle spare |
| `visual_luna_0` | `visual_check_worktree` / `visual_check_branch` | unused | visual check, **after Oscar's go** |

**The assignment is deliberate and both agents are the best seat on two counts.** `imp_0` wrote the
`4o` keypad and `4f`'s custom sheet is a `4o` call site; its ticket was one file, so it has the most
headroom for the largest ticket in the wave. `imp_4` wrote `EstablishmentsScreen`, so it knows
`useEstablishments`, `getEstablishmentDrinks` and the `Establishment`/`EstablishmentDrink` types —
and `4i`'s primary action saves parsed drinks into a venue. Keep `imp_5`/`imp_6` and their worktrees:
a clean worktree level with `main` is a provisioned asset, not clutter.

## Read first

1. `AGENTS.md`
2. `docs/decisions.md` — especially the **2026-08-12 amendment** on baselines and the `cn()` entry
3. `docs/workflows/delegation.md`
4. `docs/workflows/visual_check.md`
5. `docs/workflows/agent_selection.md`
6. `docs/specs/2026-08-12-w4-5-drink-picker.md` and `docs/specs/2026-08-12-w4-6-menu-scanner.md`
7. `design_handoffs/design_handoff_drinksmart/README.md` §D and §E, and
   `screens/{4d,4e,4f,4g,4h,4i,4j,4o}-*.html` — **read the trailing `<script>` blocks**, they carry
   the literal copy and the arithmetic
8. `tasks/todo.md` (lint count stale) and `docs/visual/01-current-state.md` (W1-C status stale)

## Explicit exclusions and boundaries

- Never use `design_handoff_drinksmart_depreciated/` as authority.
- **Do not instruct an implementer to run `npm run lint` or `npm run build`.** The guard denies it.
- Do not improvise the undrawn drink-detail edit or notification-permission screens.
- Do not refactor `DrinksTab.tsx` beyond §D's surface work, which W4-5 explicitly authorizes.
- Do not alter the deterministic BAC/pacing formulas.
- Do not re-enable the light theme, add a dependency, or weaken RLS.
- Do not push, deploy functions, apply remote migrations, rotate secrets, or publish a mobile build.
- Do not run the visual check on the delegation path, and do not contact Luna before Oscar's go.

## PROMPT

```text
Continue DrinkSmart with the last two legs of Wave 4 from /home/oscar/DrinkSmart on main.

Five of seven legs are integrated at 961a044. W4-5 (drink picker, 4d/4e/4f) and W4-6 (menu scanner,
4g-4j) are specced, committed, guard-compliant and assigned but NOT dispatched — they were held
back for a wsl --shutdown that raises .wslconfig processors from 2 to 3. Confirm nproc reports 3
before assuming the contention problem is gone.

W4-5 goes to deepseek_imp_0 (worktree_0 / deepseek_agent_0) because it wrote the 4o keypad that
4f calls. W4-6 goes to deepseek_imp_4 (worktree_4 / deepseek_agent_4) because it wrote
EstablishmentsScreen and knows the venue/drink data model that 4i saves into. Both specs already
name those worktrees and carry the baseline derived live on 92dd1d1: 119 tests across 11 files,
typecheck 0 errors, lint known-failing at exactly 21 problems (10 errors, 11 warnings), build ~30s.
Do not quote tasks/todo.md or CLAUDE.md for the lint count; both still say 9 errors and it is 10.

Dispatch both with --expect-reply, then follow all of docs/workflows/delegation.md: commit each
handback on its own branch, merge both into one integration/w4b, run one speccheck pass across the
whole diff, repair inline, run ONE full baseline after the repairs, fast-forward main, and re-sync
every worktree. Keep every worktree and agent warm; delete nothing.

PlanTab.tsx is yours, not any implementer's. It is excluded from all seven allowlists because it
mounts both the picker and the scanner, and Wave 4's navigation runs picker -> venue row ->
establishments -> scanner. Wire it at integration: EstablishmentsScreen takes
{ selectedId, onSelect, onScanMenu, onBack }, DrinksTab gains onOpenVenues?: () => void, and
MenuScannerTab keeps its existing onNext.

When both legs are integrated, announce the visual-check halt LOUDLY and wait. Do not contact
visual_luna_0 until Oscar says go. Once authorized, follow docs/workflows/visual_check.md in full,
including the tracked per-screen notes, working captures, committed milestone images, and the
orchestrator's own independent pass. Never push.

OPERATING INSTRUCTIONS FROM OSCAR, which carried through this session and still apply:

- You are go. Unblocked, to be done now.
- Read the workflows folder, specifically delegation.md and visual_check.md, for the necessary
  workflows.
- When you are going through a workflow, CLEARLY and LOUDLY output to the user which step you are
  on, what has been done, and what is to come. Say "Step 1", "Step 2", "Step 3" etc. explicitly, as
  well as describing the work.
- You have full permission to delegate writespecced agents as you please. Just output which agent
  you are delegating to so Oscar can keep an eye on things.
- Run autonomously. You should not need Oscar to help you out. If you have a question or genuinely
  need to stop, of course you can — but the workflows and this kickoff are enough to finish Wave 4,
  with a visual check if needed.
- Keep dispatching in as few waves as possible. Do not shrink a wave to manage host load;
  serialization and cutting the implementer's expensive commands are the fix, and both are already
  in place.
- Commit locally as you go. Never push — that is Oscar's alone.
```
