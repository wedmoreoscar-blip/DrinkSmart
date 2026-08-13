# Session Handoff / Kickoff — Wave 5 frames DELIVERED; every open question settled

Written 2026-08-13 20:31 BST, amended 21:30. Normal-mode handoff. The canonical continuation was
replaced.

**The next orchestrator is GPT-5.6 Sol, not Claude.** Read "Orchestrator handover" below *first* —
Sol's authorization to orchestrate at all is conditional, and the condition is a skill it must
invoke before doing anything else.

## State

**Wave 4 is finished** and nothing is outstanding on it.

**Wave 5 is fully specified, the frames have ARRIVED, and every open question is settled.** All six
(`5a`–`5f`) were delivered and live in **`design_handoffs/design_handoff_drinksmart_wave5/`**. The
old `design_handoff_drinksmart/` path is gone — the Wave 4 delivery moved to
`design_handoff_drinksmart_depreciated_wave4/`. Live docs have been repointed; historical specs under
`docs/specs/` still carry the old path and are left as history.

**`wave-5-change-inventory` (Traycer artifact) is the single Wave 5 reference.** It carries all 34
changes plus the three distinct fixes, the literal frame geometry, and a head block recording the six
rulings below. The companion `wave-5-change-list` artifact was folded into it and deleted.

**WAVE 5 OWNS EVERY OPEN ITEM BELOW** (Oscar, 2026-08-13). Nothing is deferred and nothing awaits a
decision.

**Count: 37, not 40.** Fixes 3, 4 and 5 below *are* changes 34, 33 and 32 reached from the bug list
rather than the spec list.

`main` is at the commit below. All nine worktrees clean and level. Nothing pushed.

## Orchestrator handover — Sol, and the condition attached to it

`docs/workflows/agent_selection.md` makes Claude Code (Opus 5 / Fable 5) the default orchestrator
and authorizes **Codex TUI only while `$codex-tui-relay` is active.** That is not a formality:

- **Codex TUI cannot create, send to, or receive A2A agents itself.** Without the relay it can plan
  and write specs but cannot dispatch a single implementer, which is most of Wave 5.
- **Invoke `$codex-tui-relay` BEFORE kickoff or commissioning any GUI agent.** `AGENTS.md` states
  this explicitly. The persistent OpenCode/DeepSeek GUI hub `codex-tui-a2a-hub` already exists for
  this epic and is idle; do not create another. Its transport contract is
  `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md`.
- **`$relay-waker` keeps the hub-waking daemon alive** (`docs/agent_setup/RELAY_WAKER.md`). The
  agent `a2a-hub-waker` exists. Check it at the end of a hub turn; a dead waker means commissions
  sit in the ledger unanswered and every agent looks stalled.
- **Codex invokes skills with `$<skill>`, Claude with `/<skill>`.** The skill trees are mirrored, so
  `$writespec`, `$speccheck`, `$kickoff`, `$handoff` all exist.
- `.codex/config.toml` pins `gpt-5.6-sol` at `high`. That governs Oscar's own direct codex sessions.
  **Traycer-launched agents still need their flags passed explicitly** — never assume the repo
  config supplies them.

Everything else in the workflow contracts is unchanged and applies to Sol exactly as written.

## Verification baseline — derive it by RUNNING the commands

| Command | Last observed 2026-08-13 |
| --- | --- |
| `npm test` | PASS — 131 tests across 14 files |
| `npm run typecheck` | PASS — 0 errors |
| `npm run lint` | KNOWN FAIL — exactly `20 problems (10 errors, 10 warnings)` |
| `npm run build` | PASS — ~36s |
| `git diff --check` | clean |

**These are stale by construction.** Re-derive them; do not quote this file or any other. `npm run
typecheck` must be `tsc -b --noEmit` — bare `tsc --noEmit` compiles zero files here and reports
nothing (CLAUDE.md).

## Wave 5 — the specification

**Do not work from a summary. Read `docs/decisions.md`.** Nine LOCKED entries dated 2026-08-13 are
the whole spec:

1. *Plan tab is one surface, and Build the night opens a curation step*
2. *Timeline is where a plan is edited, and swaps are capped*
3. *The two meters, the +20% tray bound, and the no-red override*
4. *Delegation threshold, spend ledger, and the capped visual pass*
5. *`Add a drink` is destroyed, and reordering needs an affordance*
6. *Onboarding gains a strength rail, requested as `5f`*
7. ***The written spec outranks the drawings*** — a new rank 0 on the precedence ladder
8. ***A lock only stops regeneration, and nothing else*** — with the full row-eligibility table
9. ***`5f` resolved: five strength stops, five chips***

**READ 7, 8 AND 9 FIRST.** They were settled after the frames landed and they override earlier
entries, the frames themselves, and parts of the Codex inventory.

### The precedence inversion, because it changes how every conflict is read

Oscar: *"claude design is good but it isnt perfect and makes mistakes. its screenshots are
inspiration but the SPEC we write now TAKES PRECEDENCE."* Rank 0 is `docs/decisions.md` and the specs
written from it. The rest of the ladder is unchanged and still governs everything the spec is silent
on — geometry, hexes, type, spacing, motion, uncommitted copy — which is most of the UI. **A frame
that contradicts a locked decision is a regression to raise, not a spec to follow.**

### A lock only stops regeneration

That is its entire meaning. Movement, reordering and swapping are all **free** on a locked drink, on
either tab. Locked entries do not hold their times and do not refuse a crossing drop.

| Row | Grip / move | Re-plan / regenerate | Swap | Lock |
| --- | --- | --- | --- | --- |
| Future, unlocked | yes | yes | yes | yes |
| **Drink currently up** | **yes** | **yes, when unlocked** | yes | **yes** |
| Locked | **yes** | no — that is the lock | **yes** | unlock |
| Past | **no** | no | no | no |

**Grips are omitted on PAST rows only.** The drink currently up is a full participant and can itself
be locked. The old rule excluding it — in the ledger, in change 8, and in the `5b` text sent to
Claude Design — is withdrawn.

### Four frame conflicts, all ruled

| Frame | Drawn | Implement |
| --- | --- | --- |
| `5a` | tray action `Start` | **`Done`** — there is no `Start`. Keep the drawn 64px geometry |
| `5c` | Timeline tab active during a swap | **Plan stays active** until the user tabs to Timeline or presses `Done` |
| `5d` | `This is a Loose night, on Social's target.` | **Advises raising the band**, per the locked wording |
| `5e` | README prose: locked rows dim to `.30`, lose their grip, hold their times | **Withdrawn.** `5e`'s own HTML was right: locked drinks move like any other |

### `5f` — take the frame's form, not its counts

Five strength stops with the existing labels (`Light · Mild · Medium · Strong · Very strong`), not
the six lowercase ones `5f` draws. **The `Low & no` chip is KEPT** — with five stops there is no
`alcohol-free` stop to absorb it. `Cider` merges into `Beer & cider` as drawn, so chips go six to
**five**: `Beer & cider`, `Wine`, `Spirits`, `Cocktails`, `Low & no`. Everything else in `5f` stands,
including the shared form in Profile's Taste sheet.

The previous kickoff enumerated 31 agreed changes with pointers to their records; that list is
preserved verbatim in `tasks/kickoff_history/2026-08-13_1915.md` and remains accurate. **Three
changes join it:**

32. **`Add a drink` in the Timeline footer is REMOVED**, on the same unbounded-alcohol test that
    killed quick-add. It routes to the Plan picker as an unconstrained add. Frame `5e`, because `1d`
    draws the footer as a matched pair.
33. **Timeline reordering gains a real affordance.** The capability is already built; it has never
    had one. Folded into `5b`, which now settles lock + swap + reorder in one frame.
34. **Onboarding gains a Strength rail beneath Sweetness.** Frame `5f`.

**The generalisation to carry forward:** *no affordance may add unbounded alcohol to a plan.* Judge
every new Plan/Timeline affordance by that, not by whether it resembles quick-add.

**And one thing to get right on 34, because the obvious reading is wrong.** Strength is a **taste**
preference, exactly like sweetness: it leans selection toward higher-ABV catalogue items. **It is not
a quantity control.** The amount of alcohol in a night is fixed by the four-band buzz picker before
the preference is read; `Very strong` yielding fewer, stronger drinks is the **deterministic
engine's** doing, falling out of a fixed ethanol budget. Do not implement or describe it as a count
control, and do not let it read as a second intensity dial beside `1n`.

## Six fixes found this session — ALL of them are Wave 5 scope

Nothing below has been touched. **Oscar's instruction: Wave 5 deals with all of it.** Nothing here
waits on a decision and nothing is deferred; the frames that three of them need are expected to be in
hand before this kickoff is read.

| # | Fix | Where | Route |
| --- | --- | --- | --- |
| 1 | **BMI/FFMI switch is one-way** | `src/hooks/useUserMetrics.ts:60–64` | inline, ~5 lines |
| 2 | **Taste sheet discards saved preferences** | `src/components/profile/TasteSheet.tsx:68` | inline |
| 3 | **Onboarding strength rail missing** | `src/components/onboarding/PreferencesPicker.tsx` | leg, against `5f` |
| 4 | **Timeline reorder has no affordance** | `src/components/tabs/SortableTimelineItem.tsx:167–172` | leg, against `5b` |
| 5 | **`Add a drink` destruction** | `src/components/tabs/TimelineTab.tsx:425–435` | leg, against `5e` |
| 6 | **"Your stats" flash on reload** | `src/hooks/useUserMetrics.ts` + `Dashboard` | inline, timing below |

**1 — BMI/FFMI is one-way.** `metricsToColumns` computes
`effectiveMetricType = hasFFMData && hasBMIData ? "ffmi" : metrics.metricType`. Saving FFMI requires
a body-fat figure (`StatsSheet.tsx:41–45`) and that figure is never cleared, so switching the Method
select back to BMI and saving is silently overridden back to `"ffmi"`, written to
`profiles.metric_type`, and read back on the invalidated refetch. **Not cosmetic** —
`unitConversions.ts:195` branches the total-body-water formula on `metricType`, so a user who chose
BMI keeps getting FFMI-derived TBW and every BAC figure downstream with it. Fix: honour the explicit
`metrics.metricType`, and null `body_fat` when it is `"bmi"`. The heuristic looks like a legacy
auto-upgrade predating the explicit selector.

**2 — Taste sheet wipes categories.** `TasteSheet` takes an `initial` prop and never reads it —
`useState({ ...defaultPreferences })` with no open-sync effect, where the sibling `StatsSheet` has
one at line 26. `PreferencesCard.tsx:70` does pass real preferences in. So the sheet always opens at
middling/middling, and the first tap fires `onChange` with the stale local object, writing
`categories_liked: []` and `categories_avoided: []` over the onboarding selection. Those feed the
liked-boost in `greedyPlanFallback` and the edge-function prompt. Fix alongside #1; same area, one
pass.

**3 — Onboarding strength rail.** LOCKED and requested as `5f`; build it against that frame.
`preferences.strong` is fully consumed downstream (`generate-plan/index.ts:90–91`,
`greedyPlanFallback.ts:39–42`) and the rail already exists in Profile at `TasteSheet.tsx:96–101` on
the stops `Light · Mild · Medium · Strong · Very strong`, but onboarding exposes only sweetness —
`strong` moves there solely as a side-effect of the "Low & no" chip, which slams it to `0`. **Read
the LOCKED entry for what strength is and is not** before writing the spec: it is a taste preference
that leans selection toward higher-ABV items, **not** a quantity control, and the fewer-but-stronger
outcome belongs to the deterministic engine's fixed budget rather than to the setting. Two
composition questions went to Claude Design rather than being settled in the ledger — vertical space
on an already-full `4c` card, and whether the `Low & no` chip survives now that an explicit rail
exists. **`5f` answers both; follow it.** If it moves the Profile taste sheet too, follow it there.

**6 — the "Your stats" flash**, carried from the previous kickoff and still not done. On reload,
onboarding step 1 paints briefly to an already-onboarded user: `useUserMetrics` holds `userId` in
`useState` starting `null` with its query `enabled: !!userId`, and a **disabled** React Query
reports `isLoading: false`, so `Dashboard` computes `showOnboarding = !metricsLoading &&
!isOnboarded && !onboardingClosed` as true until auth resolves. Treat "user not yet known" as
loading. CLAUDE.md pitfall 11. **Oscar's standing instruction: fix it INLINE, and AFTER the
implementation agents are dispatched and running** — not before, and not folded into a spec.

## What changed this session

Read-only kickoff, then three documentation edits and no product code:

- `docs/visual/04-wave5-design-prompt.md` — **two append-only blocks** at the bottom of the prompt:
  the `5b` widening with the `5e` request, then the `5f` strength-rail request. Mirrored
  byte-identically into the Traycer `spec` artifact `wave-5-design-request` (verified identical from
  `## The prompt` onward). **Keep future extensions append-only at the bottom** — Oscar's explicit
  instruction.
- `docs/decisions.md` — two new LOCKED entries: *"`Add a drink` is destroyed, and reordering needs an
  affordance"* and *"Onboarding gains a strength rail, requested as `5f`"*. The strength rail was
  briefly logged as PENDING and is now closed by that second entry.
- `docs/visual/03-design-requests.md` — §-H widened `5b`, added `5e` and `5f`, recorded the send.

## Agent and worktree inventory — verified live this session

All nine worktrees clean and level with `main`. All agents warm; none deleted.

| Agent | Worktree | State |
| --- | --- | --- |
| `deepseek_imp_0`–`_6` | `drinksmart_worktree_0`–`_6` | warm, idle — the Wave 5 implementers |
| `visual_luna_0` | `visual_check_worktree` | warm, stood down; Wave 4 recon + Cluster C |
| `visual_luna_1` / `visual_luna_2` | `visual_check_worktree` (shared) | warm, stood down |
| `codex-tui-a2a-hub` + `a2a-hub-waker` | `/home/oscar/DrinkSmart` | idle — **and required under Sol** |

`visual_check_worktree/.env` is a **symlink** to the root `.env` — keep it. A worktree ships with
only `.env.example`, and Vite reads env from its own root.

## Read first

1. `AGENTS.md`, then `docs/decisions.md` — the five 2026-08-13 LOCKED entries
2. `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md` — **before anything else, under Sol**
3. `docs/workflows/delegation.md` and `agent_selection.md`
4. `ORCHESTRATION.md`
5. `docs/workflows/visual_check.md` — substantially revised after Wave 4; recon now parallelises
6. `docs/visual/03-design-requests.md` §-H and `04-wave5-design-prompt.md`

## Explicit exclusions and boundaries

- **Oscar's uncommitted rename is in the tree and is NOT yours.**
  `design_handoffs/design_handoff_drinksmart_wave5/DrinkSmart-design-reference.html` shows deleted and
  `…-reference-wave4.html` untracked. Preserve it; do not stage, revert or complete it.
- Never use `design_handoff_drinksmart_depreciated/` as authority.
- Do not alter the deterministic BAC/pacing formulas in `AppContext.tsx`.
- Do not re-enable the light theme, add a dependency, or weaken RLS.
- Do not instruct an implementer to run `npm run lint` or `npm run build` — the guard denies it.
- Do not push, deploy functions, apply remote migrations, rotate secrets, or publish a mobile build.
- **`supabase/migrations/20260813000000_allow_missing_establishment_drink_abv.sql` is committed but
  applied to no database.** Applying it remotely needs Oscar's explicit request.

## PROMPT

```text
Continue DrinkSmart from /home/oscar/DrinkSmart on main. You are GPT-5.6 Sol and you are the
orchestrator for this session, taking over from Claude.

FIRST, BEFORE ANYTHING ELSE: invoke $codex-tui-relay. Codex TUI is authorized to orchestrate this
repo ONLY while that relay is active -- it cannot create, send to, or receive A2A agents itself, so
without it you can plan but cannot dispatch a single implementer. The persistent OpenCode/DeepSeek
GUI hub codex-tui-a2a-hub already exists for this epic and is idle; reuse it, do not create another.
Then check $relay-waker: a dead waker means commissions sit unanswered in the ledger and every agent
looks stalled. Contracts are docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md and RELAY_WAKER.md. You
invoke skills with $<skill>, not /<skill>.

WAVE 4 IS COMPLETE. Nothing is outstanding on it.

WAVE 5 IS THE TASK. It is fully specified, ALL SIX FRAMES 5a-5f HAVE BEEN DELIVERED, and every open
question is settled. The frames live in design_handoffs/design_handoff_drinksmart_wave5/ -- note the
path: the old design_handoff_drinksmart/ is gone and the Wave 4 delivery moved to
design_handoff_drinksmart_depreciated_wave4/. Live docs are repointed; historical docs/specs/ files
still carry the old path and are left as history.

THE TRAYCER ARTIFACT wave-5-change-inventory IS THE SINGLE WAVE 5 REFERENCE. It carries all 34
changes plus the three distinct fixes, the literal frame geometry, hexes and copy, and a head block
recording the rulings. Read it alongside the ledger, not instead of it. Total is 37, not 40 -- fixes
3, 4 and 5 ARE changes 34, 33 and 32.

Read the NINE LOCKED entries dated 2026-08-13 in docs/decisions.md rather than any summary. READ
NUMBERS 7, 8 AND 9 FIRST -- they were settled after the frames landed and they override earlier
entries, the frames, and parts of the Codex inventory.

7. THE WRITTEN SPEC OUTRANKS THE DRAWINGS. A new rank 0 sits above tokens on the precedence ladder:
docs/decisions.md and the specs written from it. Oscar: "claude design is good but it isnt perfect
and makes mistakes. its screenshots are inspiration but the SPEC we write now TAKES PRECEDENCE."
The rest of the ladder is unchanged and still governs everything the spec is silent on, which is
most of the UI. A frame that contradicts a locked decision is a REGRESSION TO RAISE, not a spec to
follow. This is the opposite of how Waves 1-4 were run; do not apply the old habit.

8. A LOCK ONLY STOPS REGENERATION. That is all it does. Movement, reordering and swapping are free
on a locked drink, on either tab. Locked entries do NOT hold their times and do NOT refuse a
crossing drop. GRIPS ARE OMITTED ON PAST ROWS ONLY -- current-up and locked rows keep them, and the
drink currently up can itself be locked and re-planned. The full eligibility table is in the entry
and in the section above this prompt.

9. 5f RESOLVED: five strength stops with the existing labels (Light, Mild, Medium, Strong, Very
strong), NOT the six lowercase stops the frame draws. The Low & no chip is KEPT. Cider merges into
Beer & cider, so chips go six to FIVE, not the four the frame draws.

FOUR FRAME CONFLICTS ARE ALREADY RULED: 5a draws the tray action as "Start" -- use Done. 5c draws
the Timeline tab active during a swap -- Plan stays active until the user tabs away or presses Done.
5d draws a statement of fact -- the line advises raising the band. 5e's README prose dims locked
rows and strips their grips -- withdrawn, its own HTML was right.

The 31 agreed changes are listed in tasks/kickoff_history/2026-08-13_1915.md and remain accurate
except where entries 7-9 override them; three more join them, numbered 32, 33 and 34 in the section
above this prompt.

WAVE 5 OWNS EVERYTHING IN THIS HANDOFF. Nothing is deferred and nothing waits on a decision. Scope it into disjoint legs and route each against the threshold in
docs/workflows/delegation.md. The seven deepseek_imp_* agents and their worktrees are warm and idle.
Wave 5 is boilerplate-heavy UI work against a settled spec, which the delegation path is good at --
but the meter shade bands and the swap-eligibility filter are dense, small and easy to get subtly
wrong, so weigh those for inline work. The visual acceptance of 5a-5f is the one thing that is NOT
yours to run: docs/workflows/visual_check.md governs it, it is Luna's, it does NOT run on the
delegation path, and you HALT and wait for Oscar on reaching it.

SIX FIXES, all recorded in the table above this prompt, ALL of them Wave 5 scope. Three are inline:
the BMI/FFMI switch being one-way (useUserMetrics.ts:60-64, and it corrupts the BAC math because
unitConversions.ts:195 branches TBW on metricType); the Taste sheet discarding its initial prop and
wiping categories_liked/avoided on first tap (TasteSheet.tsx:68); and the "Your stats" flash on
reload. That last one has explicit timing from Oscar: FIX IT INLINE, AFTER the implementation agents
are dispatched and running -- not before, and not as part of a spec. Three are legs against their
frames, which are now in hand: the reorder affordance against 5b, destroying Add a drink against 5e,
and the onboarding strength rail against 5f -- subject to entries 8 and 9 above.

ON THE STRENGTH RAIL, GET THE MODEL RIGHT. Strength is a TASTE preference like sweetness -- it leans
drink selection toward higher-ABV catalogue items. It is NOT a quantity control and NOT a second
intensity dial. The alcohol total is fixed by the four-band buzz picker before the preference is
ever read; "Very strong" producing fewer, stronger drinks is the DETERMINISTIC ENGINE's doing,
falling out of a fixed ethanol budget. Do not implement or describe it as shaping the drink count.

Derive the baseline by RUNNING the commands, never by quoting a file. Last observed: 131 tests
across 14 files, typecheck 0 errors, lint known-failing at exactly 20 problems (10 errors, 10
warnings), build ~36s, git diff --check clean. Note npm run typecheck must be tsc -b --noEmit; bare
tsc --noEmit compiles zero files in this repo.

OSCAR'S UNCOMMITTED WORK IS IN THE TREE AND IS NOT YOURS. DrinkSmart-design-reference.html shows
deleted with -reference-wave4.html untracked -- that is his rename. Preserve it; do not stage,
revert or complete it.

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
- Commit locally as you go. Never push -- that is Oscar's alone.
- Keep every worktree and agent warm. Delete nothing.
```
