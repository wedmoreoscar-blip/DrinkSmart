# Session Handoff / Kickoff — Git visual system (new project)

Written 2026-08-09 21:42 BST. Normal-mode handoff. The canonical continuation was replaced.

**The next task is not Wave 3.** Wave 3 is paused mid-wave, deliberately and cleanly. The next
session builds a **live git visualiser** in a new directory, as a deliberate first real exercise of
the delegation workflow rewritten during this session.

## Where the next session runs

**Start the Claude Code orchestrator in `/home/oscar/DrinkSmart`** so it inherits `AGENTS.md`,
`docs/workflows/*`, `docs/decisions.md` and the `writespec`/`speccheck` skills — the workflow being
tested lives here.

**The work itself happens in `/home/oscar/git_visual_system`**, a separate repository that is **not**
part of DrinkSmart. Never commit its files into this repo, or this repo's into it.

Its state as of this handoff: branch `main`, one commit `2fc36b1` holding the eight `reference/`
files, remote `origin` at `github.com/wedmoreoscar-blip/git_visualiser.git`, already pushed, working
tree clean, one worktree.

**Do not push there either.** It has a real remote, unlike DrinkSmart, so the usual "there is no
remote" reasoning does not apply — the rule is the same anyway and it is explicit: Oscar pushes,
you do not. Commit locally and leave it.

It has no `.gitignore`. Whichever stack is chosen will need one before the first `git add -A`, or a
Node build will commit `node_modules`.

That split is the point: this repo is the workflow's home, the new folder is the subject.

## What this session did

Wave 3's engine work finished, and then the delegation workflow itself was rewritten around it.

### W3-A2 — accepted and integrated at `a612fad`

`src/lib/sessionEngine.ts` now owns the pure timeline calculation, duration-bearing breaks,
consumption logging, anchor-aware rescheduling, regeneration accounting, session phase and the
wind-down summary. `AppContext` calls it and keeps no second implementation. `sessionStore`
persists only minimal break/action/consumption inputs under the unchanged `drinksmart.session.v1`
key. **93 tests pass.** Step 7 of `tasks/todo.md` is complete.

**Acceptance repair, and the lesson that drove the rest of the session.** The delivered
`rescheduleTimeline` omitted Req 3's absolute-anchor clause entirely — it accepted no kept ids, so
any kept future entry was displaced by the preceding interval. The submitted suite reported that
clause as *covered*, by a test named for anchors that contained none and passed against a function
with no anchor parameter. Repaired inline with six spec-derived tests. Nothing was sent back.

### The delegation workflow was rewritten

Six commits: `68a5437`, `5d3cfeb`, `53b23c6`, `df6743b`, `519f5c6`, plus `a5d45fe` for the visual
path. Both are now LOCKED entries in `docs/decisions.md`. Summary:

- **`docs/workflows/delegation.md`** is the canonical sixteen-step path. Warm worktrees are kept and
  re-synced, never deleted. Review happens on a scratch `integration` branch. Clause mapping comes
  before test authorship. Repairs are inline. **One** full baseline, after the repairs. `main`
  advances only by fast-forward. Disjoint specs integrate as a batch — one merge, one check, one
  baseline — and never fall back to per-branch bisection.
- **Verification is the checker's, never the implementer's**, and `tools/writespec-guard` now
  enforces it: a spec asking the implementer to write tests is denied, `[implementer-tests]`
  bypasses.
- **A missing clause is no longer grounds to hand work back.** The test is design-vs-repair.
- **`docs/workflows/visual_check.md`** is a separate, deliberately looser workflow for Luna.
- **`full_access`** is now the documented default for implementers.

### Also landed

- `playwright@1.55.0` is a committed devDependency, pinned exactly (a range wants a Chromium build
  that is not cached and fails at launch). All four worktrees verified launching Chromium.
- `docs/visual/03-design-requests.md` created — the register `01`/`02` had referenced since Wave 1
  without it existing. `§A` is the form vocabulary, `§B`–`§G` the six undesigned screens.
- `docs/visual/screenshots/` added as the capture archive; milestone captures committed, `work/`
  gitignored.
- A Traycer artifact, **"Wave 4 design request — six screens for Claude Design"**, is ready to send.
  Sending it is the thing that unblocks Wave 4.

## The next task — a live git visualiser

A read-only local web interface that is pointed at any git repository and renders what is happening
in it, live. Purpose is twofold: **verify the new workflow is actually behaving as designed**, and
build an intuitive understanding of git by watching it move.

It must show: commits as nodes; branch labels and where they point; **HEAD pointing at a branch, not
a commit**; worktrees as first-class separated lanes; **which agent owns which worktree**; and the
workflow's own lifecycle animated — a scratch `integration` branch appearing, worktree branches
merging into it, a **fast-forward** into `main`, and the branch vanishing.

### Prior art — researched 2026-08-09, read before building

Nothing does the whole thing; two projects each do half.

| Project | Has | Lacks |
| --- | --- | --- |
| [`riezebosch/gitviz`](https://github.com/riezebosch/gitviz) | Live DAG of a real repo's internals; educational intent | Worktrees, workflow animation |
| [`initialcommit-com/git-sim`](https://github.com/initialcommit-com/git-sim) | Animates git operations in your own repo | Simulates a named command; does not watch |
| Learn Git Branching | Animated SVG graph, solved stable layout | Teaching sandbox on fake repos |
| 1DevTool | Worktrees tab, lane graph, live watcher | Commercial, general dev tool |
| Agent-of-Empires, gwq, Claude Squad, dmux | Multiple agents in worktrees, status dashboards | **Draw no git graph at all** |

**The gap is the join.** One camp draws live topology and ignores worktrees; the other tracks
worktrees-with-agents and ignores topology. Nobody renders one picture containing both, and agent
ownership is not a git concept at all — it is ours.

### Feasibility — confirmed, not assumed

All data is plumbing, no porcelain parsing: `git worktree list --porcelain`, `git for-each-ref`,
`git rev-list --parents --all`, `git symbolic-ref`. Live updates via `fs.watch` on `.git`, **verified
working on WSL2** this session. Agent→worktree mapping comes from `traycer agent list`. DrinkSmart
currently has 8 refs across 5 worktrees — a tiny dataset.

**The hard part is not data.** It is stable lane layout so nodes do not jump between frames, and
animating the *diff* between two graph states rather than re-rendering. Learn Git Branching solved
exactly this; read it rather than reinventing.

### Reference material — `/home/oscar/git_visual_system/reference/`

Four SVGs with paired markdown, moved out of this repo where they did not belong. They are the
**visual language and the still-frame storyboard**, and they were assessed as strongly aligned:

1. `1-branch-pointer-anatomy` — commit / branch / HEAD as three distinct layers. HEAD points at a
   *branch*. This is the mental model the app must render.
2. `2-checkout-vs-worktree` — two HEADs feeding two folders. The picture no existing tool draws.
3. `3-merge-leaves-worktrees-intact` — before/after; merge moves the graph, folders untouched. Its
   own line, *"the only difference is one extra circle and one label that moved"*, is an animation
   specification.
4. `4-worktree-remove-vs-branch-delete` — `worktree remove` and `branch -d` as two independent
   operations with a forced order. This is the scratch branch vanishing.

Vocabulary to reuse: commit = grey circle with short SHA; branch = teal rounded label; HEAD = coral
label; worktree folder = purple box; destroyed = red, survives = teal.

**Three gaps in the reference set, to be designed:**

1. **No agent ownership** — the novel layer is absent.
2. **No fast-forward.** Diagram 3 draws a merge commit; the new workflow is fast-forward-only, which
   looks entirely different — no new node, the label slides. Probably the single most important
   animation for verifying the workflow, and it is not drawn.
3. **No full lifecycle arc** — the pieces exist, the sequence does not.

Note the reference palette is teal/coral/purple on pure black. That is **not** DrinkSmart's system
and should not be harmonised with it; this is a separate tool.

### Suggested shape, for the next session to accept or reject

Split into two disjoint specs so the batch-integration path gets exercised for the first time:

- **DeepSeek** — the watcher and model: plumbing to a stable JSON graph, ref/worktree/agent
  resolution, the diff between two states. Deterministic and testable.
- **Luna** — the renderer: SVG layout, lane assignment, transitions. Spatial reasoning, which is its
  documented trigger.

Two disjoint specs, one `integration`, one `speccheck`, one baseline. Judgement call, not a
decision — the next session owns it.

## Wave 3 — paused, fully preserved, resumes after the visualiser

**This is the designated next-after task, not an abandoned one.** Wave 3 is paused mid-wave at a
clean boundary: the engine work it was blocked on is integrated, nothing is half-finished, and every
agent and worktree it needs is warm and current. Resume it once the visualiser is done — and use the
visualiser to watch the resumption, which is the point of building it first.

Everything needed to restart is below and in `tasks/todo.md`.

- **Steps 6 (notification) and 8 (wind-down UI) remain, and are the resumption point.** Both
  unblocked; step 8 depended on W3-A2, which is integrated. Their file scopes are disjoint, so they
  are the natural first *real* use of batch integration once the visualiser can show it happening.
  - **Step 6 — notification (`1g`)**: `notificationService.ts`, `useWebDrinkReminders`. One
    notification per drink at its scheduled time; `Had it` and `+15 min` in the same two places
    every time; both must work without opening the app; break notifications are the quieter variant
    with no actions. Native delivery is `BLOCKED` on real hardware — `npm run dev` exercises only
    the web toast fallback. State that boundary; never report native behaviour as verified.
  - **Step 8 — wind-down screen (`1f`)**: new screen. `SOBER AROUND` plus time at 76px; three stat
    rows at 60px min-height with group radii `14 14 4 4` / `4` / `4 4 14 14`; the disclaimer wording
    kept verbatim; one care card; `Get home` (64px) and `End session` (56px text-only). No score, no
    streak, no praise. It consumes W3-A2's `deriveSessionPhase` and wind-down summary
    (`lastDrinkAt`, `soberAt`, `under008At`, `peakBAC`, consumed vs planned).
- Step 5 (Timeline) is **already done** — it was Wave 2's W2-C, browser-accepted at `79d3045`.
- Wave 4 stays blocked until the Claude Design artifact is sent and `§B`–`§G` come back.
- All four worktrees are clean, 0 behind `main`, dependencies installed, Chromium launching.

| Agent | Worktree | Branch |
| --- | --- | --- |
| DeepSeek `e4c274d1-51af-43e1-ba2c-d7597fafc9dc` | `traycer-redesign-step2-primitives` | — |
| DeepSeek `827aef2b-1d5e-463e-ba7e-72295ba3e223` | `traycer-w2b-plan-buzz-picker` | — |
| DeepSeek `2a14d713-f67e-4707-9c27-1606775f00da` | `traycer-w2a-bottom-tab-bar` | — |
| Luna `da47f88c-30cb-4b0e-ae9a-ac0b4d15ed74` | `traycer-w1b-vessel-meter` | `traycer/visual-check` |

## Verification on integrated `main`

- `npm test` — **PASS, 93/93.**
- `npm run typecheck` — **PASS**, 0 errors. ~46s.
- `npm run lint` — known **FAIL at exactly 9 errors / 11 warnings**. Must not worsen. **Derive this
  by running it, never by quoting a document** — four documents carried a stale count this session.
- `npm run build` — **PASS**, ~16s.
- `git diff --check` — PASS.
- Playwright launches Chromium and captures at 402×874 in all four worktrees.
- Real Supabase, edge functions, model-provider behaviour, notifications and native hardware remain
  `BLOCKED`.

## Read first

1. `AGENTS.md`
2. `docs/workflows/delegation.md` — the workflow being tested
3. `docs/decisions.md` — especially the two new 2026-08-09 LOCKED entries
4. `docs/workflows/agent_selection.md`
5. `docs/workflows/visual_check.md`
6. `/home/oscar/git_visual_system/reference/*.md`
7. `tasks/todo.md` — only if resuming Wave 3

## Explicitly excluded

- Do not push. Local commits only; `main` is ~55 commits ahead of `origin` by intent.
- Do not commit anything from `/home/oscar/git_visual_system` into this repository.
- Do not resume Wave 3 *in the next session* — the visualiser comes first. Wave 3 is paused and
  preserved, not dropped, and is the designated task after it.
- Three overrides Oscar gave verbally this session were **deliberately not written down** and do not
  carry over: standing delegation authority without per-reuse confirmation, and the Luna headcount
  consultation. **The per-reuse confirmation gate is in force** — ask before reusing a warm agent.

## PROMPT

```text
Build a live git visualiser. Run the orchestrator from /home/oscar/DrinkSmart so you inherit the
workflow, but do the actual work in /home/oscar/git_visual_system, which is empty apart from
reference/ and is not a git repo yet. Never commit its files into DrinkSmart.

Read first: AGENTS.md, docs/workflows/delegation.md, docs/decisions.md (the two new 2026-08-09
LOCKED entries), docs/workflows/agent_selection.md, and the four markdown files in
/home/oscar/git_visual_system/reference/.

The product: a read-only local web UI pointed at any git repo, rendering live what is happening in
it. Commits as nodes, branch labels and their targets, HEAD pointing at a branch rather than a
commit, worktrees as separated lanes, which agent owns which worktree, and the workflow lifecycle
animated -- a scratch integration branch appearing, worktrees merging into it, a fast-forward into
main, then the branch vanishing. The point is that I can watch the delegation workflow behave and
understand git intuitively.

Feasibility is confirmed: all data comes from git plumbing (worktree list --porcelain, for-each-ref,
rev-list --parents, symbolic-ref), fs.watch on .git works on WSL2, and traycer agent list gives the
agent-to-worktree mapping. The hard part is stable lane layout and animating the diff between two
graph states -- read Learn Git Branching's visualization system rather than reinventing it. Read
gitviz and git-sim as prior art; nothing existing joins live topology with worktrees and agent
ownership.

The reference/ diagrams are the visual language and storyboard. Three known gaps to design: agent
ownership, fast-forward as visually distinct from a merge commit, and the full lifecycle arc.

This is a deliberate first exercise of the rewritten delegation workflow, so follow it exactly and
tell me where it creaks. Suggested split, yours to accept or reject: DeepSeek builds the watcher and
graph model, Luna builds the SVG renderer, two disjoint specs batched into one integration branch,
one speccheck, one baseline. Ask me before reusing any warm agent -- that gate is in force.

Do not push. Wave 3 is paused, not dropped -- steps 6 and 8 remain and everything for them is warm
and recorded in tasks/next_session_kickoff.md. We return to it after the visualiser, and I want to
watch that resumption through the tool. Do not start it in this session.
```
