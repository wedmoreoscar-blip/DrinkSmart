# Session Handoff / Kickoff — Wave 4 complete; WAVE 5 specified and ready to scope

Written 2026-08-13 19:15 BST. Normal-mode handoff. The canonical continuation was replaced.

## State

**Wave 4 is finished** — implemented, reviewed, repaired, integrated and visually checked end to
end. Every drawn frame `4a`–`4o` has been rendered and measured in a browser at 402×874. Both
visual-check findings were **closed by Oscar's decision**, not deferred: the auth screens keep no
bottom bar, and the Plan tab stays one scrolling surface.

`main` is at the commit below. All nine worktrees clean and level. Nothing pushed.

**Wave 5 is fully specified and is the next task.** Real UI work against a settled spec.

## Verification baseline — derived live, 2026-08-13

| Command | Result |
| --- | --- |
| `npm test` | **PASS — 131 tests across 14 files** |
| `npm run typecheck` | **PASS — 0 errors** |
| `npm run lint` | **KNOWN FAIL — exactly `20 problems (10 errors, 10 warnings)`** |
| `npm run build` | **PASS — ~36s** |
| `git diff --check` | clean |

Derive these by running the commands. Do not quote this file, or any other.

## Wave 5 — the specification, and where each part lives

**Do not work from a summary. Read `docs/decisions.md`**, which carries four LOCKED entries dated
2026-08-13 that together are the entire spec. Numbers below are the change list as agreed with
Oscar, each pointing at its record.

### Plan tab — composition (LOCKED "Plan tab is one surface, and Build the night opens a curation step")

1. The Plan tab stays **one scrolling surface**: `1n` on top, picker (`4d`) below.
2. **`Build the night`** generates, auto-scrolls to the filled tray, reveals the per-category
   drop-downs — and **no longer navigates to the Timeline**.
3. **Each category row gains a drop-down** of the drinks selected inside it, shown automatically,
   collapsible by a small **unoutlined** `hide`/`show` control.
4. The category row's **chevron keeps its existing job** — opening that category's screen. It is not
   the drop-down toggle.
5. **`Regenerate` is `Build the night` again** — same operation, second-press label, no separate logic.
6. **`Done` in the tray advances to the Timeline.** The Timeline tab stays directly tappable, ungated.

### Timeline (LOCKED "Timeline is where a plan is edited, and swaps are capped")

7. **Quick-add is removed, not hidden.**
8. Reordering and lock/unlock stay as they are.
9. Drink-reminders icon unchanged.
10. **`Re-plan the rest` no longer leaves the Timeline** — it re-rolls only the **unlocked** entries
    in place; locked entries survive.
11. **Every entry gains a `swap` control beside its lock.**

### Swapping (same LOCKED entry)

12. Swap opens the Plan tab's *add a drink* menu, filtered to acceptable replacements.
13. **Cap is +20% of the swapped entry's pure ethanol ml** — ethanol, not ABV.
14. **Upper bound only.** No lower bound; swapping for water is explicitly allowed.
15. **The cap is silent.** Within it a swap is simply taken — no warning, no confirmation, no
    interstitial. Beyond it the drink is **not offered**. The tray meter's shade is the **only**
    over-budget signal in the system.
16. **The tray opens with the swapped drink already subtracted**: committed fill = plan total minus
    that drink's ethanol.
17. A candidate paints **pending** fill (hollow `.22`, 1px accent top edge) over committed. Never
    solid until confirmed.
18. Confirming keeps the user on the Plan tab to swap further unlocked drinks; the engine re-paces.

### Locking — one rule, three buttons (LOCKED "The two meters…")

19. Lock is a **property of the drink**, not of a tab.
20. A Timeline-locked drink **cannot be moved or swapped on the Plan tab**, and **its lock icon
    renders there too**.
21. **The user can also lock on the Plan tab.**
22. `Regenerate`, a repeated `Build the night`, and `Re-plan the rest` all re-roll **only unlocked**
    drinks.

### The two meters (same LOCKED entry)

23. **Four-band meter (`1n`) is STATIC — it *is* the target.** Recomputes only from band, duration,
    user stats. If drink selection moves it, that is a bug.
24. **Tray meter (`4d`/`4e`) is DYNAMIC.** At target it reads **FULL**.
25. **Over target only the shade changes.** The meter does not grow; the fill does not rise past full.

| Over target | Tray fill |
| --- | --- |
| at or under | accent |
| 0 – 5% | accent — no change |
| 5 – 10% | yellow |
| 10 – 15% | orange |
| 15 – 20% | red |
| above 20% | **unreachable** |

26. **+20% is a hard bound on selection**, matching the per-swap cap exactly.
27. **In the red band, if a higher band exists** (anything but Heavy), a short line advises raising
    it. Heavy shows nothing. Guidance, not a block; it must not scold.
28. **`adjustedTargetMl` is unchanged and still required.** The bound narrows its input range; it
    does not replace the mechanism. **Do not cap percentages inside it** (CLAUDE.md pitfall 15).

### Constraint change

29. **Red is now permitted — in exactly one place**, the tray's 15–20% shade, recorded as an explicit
    partial supersede of the locked "no red" clause. **"No green" is absolute and unchanged.** One
    accent, no palette, holds everywhere else.

### Closed, not to be re-raised

30. **Auth screens keep no bottom bar**, despite `4m`/`4n` drawing one.
31. **Plan/picker stacking is intended**, closing the second Wave 4 visual-check finding.

## BLOCKED PREREQUISITE — four drawings do not exist yet

`5a`–`5d`, registered in `docs/visual/03-design-requests.md` §H:

- **5a** category drop-down, its unoutlined `hide`/`show` control, **and the per-drink lock + delete**
- **5b** a Timeline row carrying both lock and swap
- **5c** the swap-constrained picker, **including the tray showing a subtraction**
- **5d** the tray's over-target shade states and the band-advice line

**A screen with no drawing cannot be visually checked**, and improvising one is rank 6 on the
precedence ladder. Wave 5's *behaviour* can be built and unit-tested now; those four surfaces cannot
be visually accepted until the frames arrive.

**The prompt for Claude Design is written and ready:** `docs/visual/04-wave5-design-prompt.md`,
mirrored as the Traycer `spec` artifact **`wave-5-design-request`**. Keep the copies identical.
Sending it is Oscar's to do — ask him whether it has gone.

## The one inline task, and WHEN to do it

**The "Your stats" flash on reload** (change 0 in the discussion, not part of any Wave 5 leg).

On reload, onboarding step 1 paints briefly to an already-onboarded user. `useUserMetrics` holds
`userId` in `useState` starting `null` and its query is `enabled: !!userId`; a **disabled** React
Query reports `isLoading: false`, so `Dashboard` computes
`showOnboarding = !metricsLoading && !isOnboarded && !onboardingClosed` as true until auth resolves.
Fix by treating "user not yet known" as loading. CLAUDE.md pitfall 11.

**Oscar's instruction: fix it INLINE, and AFTER the implementation agents are dispatched and
running** — not before, and not folded into a spec.

## Agent and worktree inventory

All nine worktrees clean and level with `main`. All agents warm; none deleted.

| Agent | Worktree | State |
| --- | --- | --- |
| `visual_luna_0` | `visual_check_worktree` | warm, stood down; Wave 4 recon + Cluster C |
| `visual_luna_1` / `visual_luna_2` | `visual_check_worktree` (shared) | warm, stood down |
| `deepseek_imp_0`–`_6` | `drinksmart_worktree_0`–`_6` | warm, idle — the Wave 5 implementers |
| `codex-tui-a2a-hub` + `a2a-hub-waker` | `/home/oscar/DrinkSmart` | idle; inert under a Claude orchestrator |

`visual_check_worktree/.env` is a **symlink** to the root `.env` — keep it. A worktree ships with
only `.env.example`, and Vite reads env from its own root.

## Read first

1. `AGENTS.md`, then `docs/decisions.md` — the four 2026-08-13 LOCKED entries
2. `docs/workflows/delegation.md` and `agent_selection.md`
3. `ORCHESTRATION.md`
4. `docs/workflows/visual_check.md` — substantially revised after Wave 4; recon now parallelises
5. `docs/visual/03-design-requests.md` §H and `04-wave5-design-prompt.md`

## Explicit exclusions and boundaries

- Never use `design_handoff_drinksmart_depreciated/` as authority.
- Do not alter the deterministic BAC/pacing formulas in `AppContext.tsx`.
- Do not re-enable the light theme, add a dependency, or weaken RLS.
- Do not instruct an implementer to run `npm run lint` or `npm run build` — the guard denies it.
- Do not push, deploy functions, apply remote migrations, rotate secrets, or publish a mobile build.
- **`supabase/migrations/20260813000000_allow_missing_establishment_drink_abv.sql` is committed but
  applied to no database.** Applying it remotely needs Oscar's explicit request.

## PROMPT

```text
Continue DrinkSmart from /home/oscar/DrinkSmart on main.

WAVE 4 IS COMPLETE — implemented, integrated and visually checked. Both visual-check findings were
closed by Oscar's decision rather than deferred. Nothing is outstanding on it.

WAVE 5 IS THE TASK and it is fully specified. Read the four LOCKED entries dated 2026-08-13 in
docs/decisions.md rather than any summary: the Plan-tab curation flow, the Timeline editing rules
and the silent +20% pure-ethanol swap cap, the static-vs-dynamic two-meter model with its
over-target shade bands and hard +20% tray bound, and the no-red override (red in exactly one place,
the tray's 15-20% shade; no green is absolute). The section above this prompt lists all 31 agreed
changes with pointers to their records.

Scope it into disjoint legs and route each against the threshold in docs/workflows/delegation.md.
The seven deepseek_imp_* agents and their worktrees are warm and idle. Wave 5 is boilerplate-heavy
UI work against a settled spec, which the delegation path is good at -- but the meter shade bands
and the swap-eligibility filter are dense, small and easy to get subtly wrong, so weigh those for
inline work.

BLOCKED PREREQUISITE: four drawings do not exist -- 5a the category drop-down with its unoutlined
hide/show control and per-drink lock and delete, 5b a Timeline row carrying both lock and swap, 5c
the swap-constrained picker including the tray showing a subtraction, 5d the tray's over-target
shade states and band-advice line. Registered in docs/visual/03-design-requests.md section H. The
behaviour can be built and unit-tested without them; those four surfaces cannot be visually accepted
until the frames arrive. The prompt is written at docs/visual/04-wave5-design-prompt.md and mirrored
as the Traycer spec artifact wave-5-design-request. Sending it is Oscar's call -- ask whether it has
gone before planning any visual check.

ONE INLINE TASK, WITH EXPLICIT TIMING FROM OSCAR: the "Your stats" flash on reload. Onboarding step
1 paints briefly to an already-onboarded user because useUserMetrics starts userId as null with the
query enabled: !!userId, and a disabled React Query reports isLoading false, so Dashboard's
showOnboarding is true until auth resolves. Treat "user not yet known" as loading. FIX IT INLINE,
AFTER the implementation agents are dispatched and running -- not before, and not as part of a spec.

Derive the baseline by RUNNING the commands, never by quoting a file. It is 131 tests across 14
files, typecheck 0 errors, lint known-failing at exactly 20 problems (10 errors, 10 warnings), build
~36s, git diff --check clean.

WHAT NOT TO REDO. Five recon claims in Wave 4 did not survive checking, all misattributions of
cause. Verify against the files before "fixing" anything a report calls broken. Two live traps: the
4d categories all read "from £3.60" and the per-category logic is CORRECT -- that is live Supabase
data, and the drawings' varied prices are sample data for a fictional venue; and the 4e drink order
looks wrong only if you compare the app with "Cheapest first" ON against a drawing that shows that
chip UNSELECTED.

When drawings and code disagree, the precedence ladder in docs/decisions.md settles it: tokens, then
screens/*.html literal values, then screens/*.png appearance, then README prose, then tasks/todo.md,
then implementer judgement. Higher rank wins outright. It cannot resolve a conflict WITHIN one rank
-- that is a design clarification, not a judgement call for you.

OPERATING INSTRUCTIONS FROM OSCAR, which have carried through several sessions and still apply:

- When you are going through a workflow, CLEARLY and LOUDLY output which step you are on, what has
  been done, and what is to come. Say "Step 1", "Step 2", "Step 3" explicitly.
- You have full permission to delegate writespecced agents as you please. Output which agent you are
  delegating to so Oscar can keep an eye on things.
- Run autonomously. Ask only if you genuinely need to stop.
- Keep dispatching in as few waves as possible. Do not shrink a wave to manage host load.
- Commit locally as you go. Never push — that is Oscar's alone.
- Keep every worktree and agent warm. Delete nothing.
```
