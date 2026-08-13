# Session Handoff / Kickoff — Wave 5 design request SENT; awaiting frames `5a`–`5f`

Written 2026-08-13 20:31 BST, amended 20:55. Normal-mode handoff. The canonical continuation was
replaced.

**The next orchestrator is GPT-5.6 Sol, not Claude.** Read "Orchestrator handover" below *first* —
Sol's authorization to orchestrate at all is conditional, and the condition is a skill it must
invoke before doing anything else.

## State

**Wave 4 is finished** and nothing is outstanding on it.

**Wave 5 is fully specified and the design request has been SENT.** Oscar handed the amended prompt
to Claude Design at roughly 20:30 BST on 2026-08-13 and expects it to consume the full five-hour
window, so frames should land around 01:30 BST. Wave 5 is unblocked the moment they do.

**Expect six frames, not four: `5a`–`5f`.** `5b` was widened and `5e`/`5f` were added during this
session; all three amendments were appended to the prompt before it went.

**Assume the frames are present and that WAVE 5 OWNS EVERY OPEN ITEM BELOW** (Oscar, 2026-08-13).
Nothing in this handoff is deferred to a later wave and nothing is left awaiting a decision — the six
fixes listed further down are Wave 5 scope alongside the 33 changes.

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

**Do not work from a summary. Read `docs/decisions.md`.** Six LOCKED entries dated 2026-08-13 are
the whole spec:

1. *Plan tab is one surface, and Build the night opens a curation step*
2. *Timeline is where a plan is edited, and swaps are capped*
3. *The two meters, the +20% tray bound, and the no-red override*
4. *Delegation threshold, spend ledger, and the capped visual pass*
5. ***`Add a drink` is destroyed, and reordering needs an affordance*** — new this session
6. ***Onboarding gains a strength rail, requested as `5f`*** — new this session

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
  `design_handoffs/design_handoff_drinksmart/DrinkSmart-design-reference.html` shows deleted and
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

WAVE 5 IS THE TASK. It is fully specified and the design request HAS BEEN SENT -- Oscar handed the
amended prompt to Claude Design at ~20:30 BST on 2026-08-13 and expects it to take the full five
hours, so frames should land around 01:30 BST. EXPECT SIX FRAMES, 5a THROUGH 5f, not four. Assume
they are in hand by the time you read this; confirm they are actually on disk in
design_handoffs/design_handoff_drinksmart/screens/ before scoping the legs that depend on them.

Read the SIX LOCKED entries dated 2026-08-13 in docs/decisions.md rather than any summary: the
Plan-tab curation flow; the Timeline editing rules and the silent +20% pure-ethanol swap cap; the
static-vs-dynamic two-meter model with its over-target shade bands and hard +20% tray bound; the
delegation threshold and capped visual pass; "Add a drink is destroyed, and reordering needs an
affordance"; and "Onboarding gains a strength rail, requested as 5f". The 31 agreed changes are
listed in tasks/kickoff_history/2026-08-13_1915.md and remain accurate; three more join them,
numbered 32, 33 and 34 in the section above this prompt.

WAVE 5 OWNS EVERYTHING IN THIS HANDOFF. Nothing is deferred to a later wave and nothing waits on a
decision from Oscar. Scope it into disjoint legs and route each against the threshold in
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
frames: the reorder affordance against 5b, destroying Add a drink against 5e, and the onboarding
strength rail against 5f.

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
