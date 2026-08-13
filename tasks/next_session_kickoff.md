# Session Handoff / Kickoff — Wave 5 design request SENT; awaiting frames `5a`–`5e`

Written 2026-08-13 20:31 BST. Normal-mode handoff. The canonical continuation was replaced.

**The next orchestrator is GPT-5.6 Sol, not Claude.** Read "Orchestrator handover" below *first* —
Sol's authorization to orchestrate at all is conditional, and the condition is a skill it must
invoke before doing anything else.

## State

**Wave 4 is finished** and nothing is outstanding on it.

**Wave 5 is fully specified and the design request has been SENT.** Oscar handed the amended prompt
to Claude Design at roughly 20:30 BST on 2026-08-13 and expects it to consume the full five-hour
window, so frames should land around 01:30 BST. Wave 5 is unblocked the moment they do.

**Expect five frames, not four: `5a`–`5e`.** `5b` was widened and `5e` was added during this
session; both amendments were appended to the prompt before it went.

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

**Do not work from a summary. Read `docs/decisions.md`.** Five LOCKED entries dated 2026-08-13 are
the whole spec:

1. *Plan tab is one surface, and Build the night opens a curation step*
2. *Timeline is where a plan is edited, and swaps are capped*
3. *The two meters, the +20% tray bound, and the no-red override*
4. *Delegation threshold, spend ledger, and the capped visual pass*
5. ***`Add a drink` is destroyed, and reordering needs an affordance*** — new this session

The previous kickoff enumerated 31 agreed changes with pointers to their records; that list is
preserved verbatim in `tasks/kickoff_history/2026-08-13_1915.md` and remains accurate. **Two changes
join it:**

32. **`Add a drink` in the Timeline footer is REMOVED**, on the same unbounded-alcohol test that
    killed quick-add. It routes to the Plan picker as an unconstrained add. Needs frame `5e` because
    `1d` draws the footer as a matched pair.
33. **Timeline reordering gains a real affordance.** The capability is already built; it has never
    had one. Folded into `5b`, which now settles lock + swap + reorder in one frame.

**The generalisation to carry forward:** *no affordance may add unbounded alcohol to a plan.* Judge
every new Plan/Timeline affordance by that, not by whether it resembles quick-add.

## Outstanding fixes found this session — all for the next wave

Nothing below has been touched. Oscar's instruction: note them down, do them next wave.

| # | Fix | Where | Blocked? |
| --- | --- | --- | --- |
| 1 | **BMI/FFMI switch is one-way** | `src/hooks/useUserMetrics.ts:60–64` | No — inline, ~5 lines |
| 2 | **Taste sheet discards saved preferences** | `src/components/profile/TasteSheet.tsx:68` | No — inline |
| 3 | **Onboarding strength rail missing** | `src/components/onboarding/PreferencesPicker.tsx` | **Yes — undecided design question** |
| 4 | **Timeline reorder has no affordance** | `src/components/tabs/SortableTimelineItem.tsx:167–172` | **Yes — needs `5b`** |
| 5 | **`Add a drink` destruction** | `src/components/tabs/TimelineTab.tsx:425–435` | **Yes — needs `5e`** |
| 6 | **"Your stats" flash on reload** | `src/hooks/useUserMetrics.ts` + `Dashboard` | No — inline, timing below |

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

**3 — Onboarding strength rail.** Logged as PENDING in `docs/decisions.md`. `preferences.strong` is
fully consumed downstream (`generate-plan/index.ts:90–91`, `greedyPlanFallback.ts:39–42`) and a full
rail already exists in Profile at `TasteSheet.tsx:96–101`, but onboarding exposes only sweetness —
`strong` moves there solely as a side-effect of the "Low & no" chip, which slams it to `0`. **The
`4c` drawing has only Sweetness**, so the build matches its frame: adding a rail is a design change
needing a drawing, not a bug fix. Oscar was offered it as a fourth ask on the Wave 5 prompt and did
not take it up before sending. **Ask him before acting.**

**6 — the "Your stats" flash**, carried from the previous kickoff and still not done. On reload,
onboarding step 1 paints briefly to an already-onboarded user: `useUserMetrics` holds `userId` in
`useState` starting `null` with its query `enabled: !!userId`, and a **disabled** React Query
reports `isLoading: false`, so `Dashboard` computes `showOnboarding = !metricsLoading &&
!isOnboarded && !onboardingClosed` as true until auth resolves. Treat "user not yet known" as
loading. CLAUDE.md pitfall 11. **Oscar's standing instruction: fix it INLINE, and AFTER the
implementation agents are dispatched and running** — not before, and not folded into a spec.

## What changed this session

Read-only kickoff, then three documentation edits and no product code:

- `docs/visual/04-wave5-design-prompt.md` — **append-only** block at the bottom of the prompt
  carrying the `5b` widening and the `5e` request. Mirrored byte-identically into the Traycer `spec`
  artifact `wave-5-design-request` (verified identical from `## The prompt` onward). **Keep future
  extensions append-only at the bottom** — Oscar's explicit instruction.
- `docs/decisions.md` — new LOCKED entry *"`Add a drink` is destroyed, and reordering needs an
  affordance"*, plus a PENDING entry for the onboarding strength rail.
- `docs/visual/03-design-requests.md` — §-H widened `5b`, added `5e`, recorded the send.

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
hours, so frames should land around 01:30 BST. EXPECT FIVE FRAMES, 5a THROUGH 5e, not four.

Read the FIVE LOCKED entries dated 2026-08-13 in docs/decisions.md rather than any summary: the
Plan-tab curation flow; the Timeline editing rules and the silent +20% pure-ethanol swap cap; the
static-vs-dynamic two-meter model with its over-target shade bands and hard +20% tray bound; the
delegation threshold and capped visual pass; and the newest one, "Add a drink is destroyed, and
reordering needs an affordance". The 31 agreed changes are listed in
tasks/kickoff_history/2026-08-13_1915.md and remain accurate; two more join them, numbered 32 and 33
in the section above this prompt.

THE BEHAVIOUR CAN BE BUILT NOW. Scope Wave 5 into disjoint legs and route each against the threshold
in docs/workflows/delegation.md. The seven deepseek_imp_* agents and their worktrees are warm and
idle. Wave 5 is boilerplate-heavy UI work against a settled spec, which the delegation path is good
at -- but the meter shade bands and the swap-eligibility filter are dense, small and easy to get
subtly wrong, so weigh those for inline work. What CANNOT be done until the frames arrive is the
visual acceptance of 5a-5e; docs/workflows/visual_check.md governs that, it is Luna's, it does NOT
run on the delegation path, and you HALT and wait for Oscar on reaching it.

SIX OUTSTANDING FIXES, all recorded in the table above this prompt. Three are inline and unblocked:
the BMI/FFMI switch being one-way (useUserMetrics.ts:60-64, and it corrupts the BAC math because
unitConversions.ts:195 branches TBW on metricType); the Taste sheet discarding its initial prop and
wiping categories_liked/avoided on first tap (TasteSheet.tsx:68); and the "Your stats" flash on
reload. That last one has explicit timing from Oscar: FIX IT INLINE, AFTER the implementation agents
are dispatched and running -- not before, and not as part of a spec. Two more are Wave 5 legs
blocked on frames (the reorder affordance needs 5b, destroying Add a drink needs 5e). The sixth, the
missing onboarding strength rail, is an UNDECIDED design question logged as PENDING -- the 4c
drawing has only Sweetness, so the build matches its frame and adding a rail needs a drawing. ASK
OSCAR before acting on that one.

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
