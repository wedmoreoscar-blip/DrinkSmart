# Final Visual Check

The terminal phase of a redesign wave: confirming the built UI actually matches the Claude Design
drawings, and fixing it where it does not.

This is **not** `docs/workflows/delegation.md` and must not be run as if it were. That path is
built for rigour and speed on deterministic work, is almost always DeepSeek, and is enforced by
`tools/writespec-guard`. This one is Luna, free-flowing, conversational, and deliberately lower
ceremony. The two differ on purpose; the reasons are in "Why this is not the delegation path"
below.

Luna is the only agent that can do this work at all: ingesting images is a hard capability gap, not
a quality preference (`agent_selection.md`).

## Shape

```
implementation integrated
        │
        ▼
   HALT ─── notify Oscar, wait for his go-ahead ────────────┐
        │                                                   │
        ▼                                              (no contact
   Luna-1 recon: drive the app, screenshot, compare,     with Luna
   report findings, FIX NOTHING                          until he says go)
        │
        ▼
   Orchestrator + Luna-1 agree headcount and the file-ownership split
        │
        ▼
   n Luna fixers in ONE shared worktree, each owning disjoint files,
   A2A coordinating with each other, self-verifying by screenshot
        │
        ▼
   Orchestrator final pass: visual + full baseline + fast-forward
```

## Tooling — Playwright, already provisioned

This phase works because Luna can drive a real browser, not merely read images. **Verified in this
repository**, not assumed: Luna completed a full Wave 2 browser acceptance pass this way —
capturing at 402×874, measuring geometry and computed styles, driving pointer and keyboard
drag-and-drop, checking overflow and console errors, fixing code, and re-shooting to confirm.

**`playwright` is a committed devDependency**, pinned to exactly `1.55.0` (approved by Oscar,
2026-08-09). Chromium is cached at `~/.cache/ms-playwright`. Verified working: launches, captures
at 402×874, and reads `getComputedStyle` back.

**The pin is exact on purpose — do not widen it to `^` or `~`.** Each Playwright release expects a
specific Chromium build, and `1.55.0` is the one matching the cached `chromium-1187`. A range
silently resolves to `1.55.1`, which wants `chromium-1193` and fails at launch with
`Executable doesn't exist`. If the version is ever raised deliberately, run
`npx playwright install chromium` to fetch the matching build.

It was previously installed ad-hoc and absent from `package.json`, which made it extraneous — so
the next `npm install` pruned it and the capability vanished silently. Declaring it removes that
failure mode; the general lesson is that an undeclared tool does not survive a managed lockfile.

Import it from runner scripts by **absolute module path** (`<repo>/node_modules/playwright`) —
scripts living under `/tmp` will not resolve it otherwise. Implementers must not change
`package.json` or the lockfile themselves; provisioning is the orchestrator's.

Runner scripts are scratch. Keep them out of the repository, alongside the working captures.

What that buys, beyond screenshots: `getComputedStyle` and bounding boxes for the numeric
criteria, real interaction for behaviour a static capture cannot show, and `errors: []` as
evidence rather than an impression.

## 0. No drawing, no check

**A Claude Design drawing is a precondition, not a nice-to-have.** A visual check compares the
built screen against an authoritative picture of what it should be. With no drawing there is
nothing to compare against, and the exercise degrades into an agent's taste — which is exactly
what a design system exists to remove.

So the scope of any visual pass is *only* the screens listed as Available in
`docs/visual/03-design-requests.md`. Tell Luna this explicitly and give it the list. Left
unstated, it will dutifully report dozens of findings on undesigned screens and the phase will be
spent triaging noise.

A screen that needs checking and has no drawing is not a visual-check problem. It is a blocked
prerequisite: record it in `03-design-requests.md` and obtain the drawing first.

## 1. Halt and wait

When the implementation work for the wave is integrated, stop. Tell Oscar the visual-check stage
has been reached. **Do not contact Luna until he says to start.** Reaching this point is not
authorization to begin.

## 2. Brief Luna-1 roughly, and send it in blind

Do not write a spec. A real spec would require taking the screenshots and finding the defects
first — which is the entire job being delegated. Writing one means either doing Luna's work or
inventing findings, so the brief is deliberately rough:

- what changed in this wave, and which screens it touched;
- where the drawings live and where the numeric criteria live (below);
- the standing design constraints it must not violate (below);
- an explicit instruction to **report, not repair**.

Luna-1 drives the running app, captures each screen, compares, and comes back with a finding list
and a recommendation for how many agents the fixes warrant.

**Measure, do not only look.** Eyeballing a screenshot catches layout breakage and misses "that is
13px, not 14px". The drawings in `design_handoff_drinksmart/screens/*.png` establish appearance;
the numeric acceptance criteria in `design_handoff_drinksmart/README.md` and `tasks/todo.md`
establish correctness. Where the spec states a number, read it back out of the browser with
`getComputedStyle` or a bounding box rather than judging it by eye — Playwright is there precisely
so a pixel claim can be evidence instead of an impression.

**Standing constraints, which a free-running agent will drift away from:** dark-only, the light
theme is deliberately unreachable; one accent and no palette; no red and no green; completion
desaturates; nothing congratulates the user; `--fs-body` 19px is the floor for anything readable;
nothing tappable under 56px, one 64px primary action per screen; restyle the existing
`src/components/ui/*` primitives rather than forking them or adding a dependency. See the LOCKED
redesign entries in `docs/decisions.md`.

## 3. Size the team from the findings

Discuss the headcount with Luna-1 rather than picking one. `n` is justified by the size and spread
of the finding list, not chosen by default. Luna bills against Oscar's ChatGPT Plus subscription,
and two agents that finish beat four that mostly coordinate.

## 4. One shared worktree, agents spawned into it

All Luna agents work in a **single shared worktree** — normally the one a Luna already inhabits.
One tree means one running app, no divergent copies, and no merge of several worktrees at the end,
which is exactly the reconciliation this phase cannot afford.

Spawn the additional agents into that worktree directly, created as Luna at max effort. Do **not**
convert a DeepSeek agent: its worktree is a different tree, and converting would require a manual
compaction step that the single-worktree decision removes entirely.

### File ownership is the only safety net

A shared worktree has no isolation. Two agents editing one file means last write wins and the other
agent's work vanishes silently — there is no merge to catch it.

Screens are the convenient way to derive ownership, but **screens are not files**. Two screens
routinely share a component; the redesign's primitives (`button`, `card`, `badge`, `tabs`,
`slider`, the meter) are used everywhere. So Luna-1's split must produce two lists:

- **per-agent screen-local files** — parallelise freely;
- **shared components** — assigned to exactly one named agent, or held back for the orchestrator.

The rule enforced is disjoint *file* ownership. Screen assignment that yields overlapping files is
not a valid split.

Luna-1 is fixer #1 as well as the coordination hub: it has the recon context, and standing it down
wastes the best-informed agent. The orchestrator dispatches each fixer with the findings and the
ownership split; the fixers coordinate among themselves by A2A from there, so the app reads as one
coherent thing rather than n locally-correct patches.

## 5. The finding list is the allowlist

This is what bounds "casual". There is no spec and no file allowlist, and visual judgment invites
improvement nobody asked for.

Fixers fix listed findings. Anything else an agent notices goes back to the orchestrator as a new
finding; it does not go into the tree. Unrequested visual improvements are drift, and here there is
no clause map to catch them in review.

## 6. Self-verification is explicitly exempt

`delegation.md` forbids an implementer verifying its own work, and `writespec-guard` enforces it.
**That rule does not apply here, and the exemption is deliberate.**

Screenshot, fix, screenshot again is the mechanism of this phase, not a smell. The reasoning behind
the ban does not transfer: it exists because implementer-authored *tests* encode the same blind
spots as the implementation and can report green over a clause that was never built. A screenshot
is an observation of the running app, not an assertion the agent authored, so it cannot conceal an
omission in the same way.

Commissioning messages for this phase carry the literal marker **`[visual-check]`**, which
`writespec-guard` recognises. Do not reuse `[no-spec]`: that marker asserts the message commissions
no work, which would be false here and would corrupt the meaning of a marker used elsewhere.

## 7. One dev server, owned by the orchestrator

Start `npm run dev` once, before dispatching the fixers, under
`tools/agent-lock dev-server -- npm run dev`. Give the agents the URL and tell them not to start
their own. Pass it as `APP_URL` so every runner script points at the same place instead of
hardcoding a port that may not be the one Vite chose.

Running `npm run dev` several times in one directory does not fail — Vite increments to the next
free port — so the failure mode is not a crash but several redundant servers on unpredictable
ports serving byte-identical files. One server, one port, one lifecycle, owned by the orchestrator.

**Cross-talk is real in a shared tree.** With HMR, one agent saving a broken edit shows up in every
other agent's screenshots as an error overlay. Tell the agents: an error overlay on a screen you do
not own is not your finding and not yours to fix — wait and re-shoot. A syntax error in a shared
component breaks everyone at once, which is a further reason shared components belong to exactly
one agent.

**The lock cannot go stale, but the server can die quietly.** `tools/agent-lock` holds a `flock` on
a file descriptor that the kernel releases when the process ends, including on `SIGKILL` — verified
2026-08-09 by killing a holder and immediately reacquiring. So there is no stale-lock failure mode
and no cleanup to perform; the lock file remaining on disk is not the lock.

The real risk is the opposite one: if the dev server dies, the lock frees silently and nobody
notices, so agents keep capturing against a dead port and their screenshots fail or, worse, show a
stale page. **Check liveness, not the lock** — confirm the port actually answers before dispatching
the fixers, and again if an agent reports captures behaving strangely. Restarting the server is the
orchestrator's job, not an agent's.

## 8. Checkpoint commits are the only undo

One worktree, several concurrent writers, no merge safety net. If an agent wrecks something hours
in, there is nothing to roll back to unless it was committed.

The orchestrator commits a checkpoint after each fixer reports done. Agents do not commit.

## 8a. Where screenshots go

`docs/visual/screenshots/` is the archive; its `README.md` holds the full convention. In short:

- **Working captures** go in `docs/visual/screenshots/<screen>/work/`, which is gitignored. Agents
  write here freely and reference each other's captures by filename in A2A messages.
- **Milestone captures** sit directly in `docs/visual/screenshots/<screen>/` and **are committed** —
  one per drawn screen per wave, taken once the check passes. These are the visual evolution
  record that `docs/visual/` exists to hold.
- Name every capture `<wave>-<agent>-<timestampZ>-<status>.png`, status one of `broken`,
  `suspect`, `ok`, and append a line to that screen's `notes.md` saying what you concluded.

Both halves are needed and they pull in opposite directions: a history wants images that persist,
a working loop produces dozens that should not. Committing everything gives an unusable history
and a heavy repository; committing nothing leaves no history at all.

Keep captures under 5MB — that is the codex image ceiling, and a capture Luna cannot ingest is
worthless.

## 9. Casual review, rigorous integration

The *checking* is casual. The *code* is not. Luna's fixes are real edits to real components and
land under the same guarantees as anything else.

At the very end, once every fixer has reported:

1. **The orchestrator does its own visual pass — by looking, not by reading Luna's summary.**
   Playwright is a committed devDependency, so drive the app directly: capture each drawn screen at
   402×874 into `docs/visual/screenshots/<screen>/`, then open the PNGs and compare them against
   `design_handoff_drinksmart/screens/`. Read back any stated number with `getComputedStyle` rather
   than trusting a report that it was fixed.

   This step is the independent check, and accepting a summary in place of looking would remove the
   only independence the phase has — every other observation in it was made by the agents that
   wrote the fixes. Capture these as the wave's **milestone** images: the pass and the archive
   entry are the same act.
2. Full baseline, once: `npm test`, `npm run typecheck`, `npm run lint` against its recorded count,
   `npm run build`, `git diff --check`.
3. Fast-forward `main`. Commit locally. Never push.
4. Leave the shared worktree clean, current, and warm.

**No repair loops back to Luna.** Anything the final pass turns up, the orchestrator fixes inline.
Re-dispatching to argue about pixels is precisely the cost this phase is shaped to avoid.

## Done

Every finding is fixed or explicitly deferred by Oscar; the orchestrator's final pass is clean; the
baseline is green; `main` has been fast-forwarded. Without a stated finish line, agents discussing
whether the app looks good can continue indefinitely.

## Why this is not the delegation path

| | Implementation (`delegation.md`) | Final visual check |
| --- | --- | --- |
| Agent | DeepSeek, almost always | Luna, necessarily — images |
| Commissioned by | A `writespec` spec, hook-enforced | A rough brief, blind by necessity |
| Bounded by | The spec's file allowlist | Luna-1's finding list |
| Isolation | One worktree per agent | One shared worktree, disjoint file ownership |
| Self-verification | Forbidden and enforced | Expected — it is the mechanism |
| Coordination | None; specs are disjoint | A2A between agents, by design |
| Review | Clause mapping under `speccheck` | Orchestrator's own visual pass |
| Integration | Scratch branch, one baseline, fast-forward | Same |

The asymmetry is not laxity. A spec cannot be written for work whose first step is discovering what
is wrong, and rigour applied to discovery would mean doing the discovery twice.
