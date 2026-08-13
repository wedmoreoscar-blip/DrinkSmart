# Delegation

The canonical end-to-end path for one delegated implementation, from provisioning an agent to
integrating its work. `agent_selection.md` decides *which* agent runs a role; this file defines
*how* every delegation runs, whichever agent it is.

The other workflow documents defer to this one on sequencing. `change_safety.md` remains
authoritative on what may be written and committed; `verification.md` remains authoritative on
evidence categories and reporting language; the `writespec` and `speccheck` skills remain
authoritative on spec content and clause-mapping technique.

## Design goals

Four properties, in priority order. Every rule below exists to serve one of them.

1. **Worktrees stay warm.** A provisioned worktree that is clean and level with `main` is a
   standing asset: dependencies installed, agent context cached. Never delete one to prove
   tidiness.
2. **One full baseline per delegation.** `typecheck` + `lint` + `build` is slow and token-hungry.
   It runs once, as a confirmation gate, after repairs — never as a diagnostic before them.
3. **One repair loop.** Surface every problem in a single review pass, fix them together, verify
   once.
   **Verification belongs to the checker, not the implementer.** The implementer writes the code
   and confirms only that it runs and that the existing suite still passes; it does not write
   tests. The checker derives coverage from the spec on the integration branch. This is not only
   about avoiding duplicated effort — tests written by the agent that wrote the code encode the
   same blind spots, so a green suite can report success over a clause that was never
   implemented. Independence is what makes the single check loop trustworthy enough to be the
   only one.
4. **Fast-forwards only.** `main` advances by fast-forward from a verified integration branch. It
   never receives untested work that then has to be re-tested in place.

## When to delegate at all

Delegation removes from the orchestrator's window the *iteration churn* — exploration, failed
attempts, re-edits, command output — not the code itself. The spec, the handback diff, the
independent tests, and the repairs all still land in the orchestrator's context. The saving is the
churn, typically several times the size of the finished diff; the cost is a fixed per-delegation
floor (provision, spec, commission round-trip, clause map, tests, repairs, baseline) that does not
shrink with the task. Below a certain task size the floor exceeds the churn and delegation loses
to inline work on every axis at once — tokens, latency, and quality.

So the gate is a size-and-kind rule, decided when the work is scoped rather than felt out at
dispatch time:

- **Delegate** work whose expected diff is roughly 150 production lines or more of mechanical,
  fully specifiable change — or any wave that splits into two or more disjoint specs, where
  batched fan-in amortizes the floor across the legs.
- **Keep inline** anything smaller; anything requiring design judgment mid-implementation (a spec
  that must settle the design *is* the solution, serialized as prose, so nothing was saved by not
  writing the code); dense single-file logic; and work whose independent test suite would rival
  the implementation in size — there the checker performs the expensive half regardless.

"Keep tiny context-cached changes inline" (`AGENTS.md`) is this rule's summary; the lines above
are its operating definition. The line-count figure is a working estimate, not a measured one —
the per-delegation context-spend note that `speccheck` records in each acceptance record is what
will eventually correct it.

## The path

### Provision

1. **Reuse a warm agent.** Check the epic's agents for one whose worktree is clean and whose
   harness suits the task. Reuse is the default route; creating an agent or worktree is the
   exception. Ask the user before reusing (see `agent_selection.md`) — reuse is recommended, not
   pre-authorized.
2. **Bring the worktree level with `main`.** Merge only. Never reset, rebase, or stash to get
   there. If the worktree is dirty or cannot be synchronized without risking unintegrated work,
   stop and ask rather than forcing it.
3. **Install only if the dependency set actually moved,** and pick the command by case. A warm
   worktree already has `node_modules`; reinstalling into one is slow and buys nothing. Install
   under `tools/agent-lock dependencies` in exactly two cases, which take *different* commands:

   | Case | Command | Why that one |
   | --- | --- | --- |
   | The worktree is newly created | **`npm ci`** | Deterministic, and it never writes `package-lock.json` |
   | The merge in step 2 changed `package-lock.json` | **`npm install`** | Incremental — seconds, against a full cold install |

   **The fresh-worktree case is `npm ci` because `npm install` can rewrite the lockfile, and a
   delegated worktree shares the repository** (added 2026-08-12). If provisioning mutates
   `package-lock.json`, the implementer is handed a worktree that is already dirty in a file its
   spec forbids it to touch, and that change then rides into the handback diff — where it looks
   like the implementer's doing. `npm ci` cannot do this: it installs the lockfile exactly and
   never writes it back, so the agent starts from a genuinely clean `git status` against the same
   dependency set `main` was verified with. Being faster on a cold `node_modules` is a bonus, not
   the reason. It does not disturb the Playwright browser cache, which lives in
   `~/.cache/ms-playwright` rather than in `node_modules` — see `visual_check.md`.

   **Do not reach for `npm ci` in the second case.** It deletes `node_modules` and reinstalls cold,
   discarding exactly the incremental update that makes that path cheap.

   The second case is not caution, it is staleness: `node_modules` now describes a dependency set
   the tree no longer has. This is a real failure mode, not a theoretical one — a worktree
   predating the introduction of Vitest was merged current, and `node_modules/.bin/vitest` simply
   did not exist, so the first command of the baseline would have failed. The install is
   incremental and took seconds.

   Detect it rather than guessing:

   ```bash
   git diff --name-only <pre-merge-sha> HEAD -- package-lock.json
   ```

   Empty output means skip. Then run `npm test` and record the green count the implementer
   inherits — that run is cheap and confirms the worktree is genuinely usable before an agent is
   pointed at it.
4. **Configure explicitly.** Harness, model, `--reasoning-effort max`, `--surface gui`, and the
   permission mode. None of these are inherited reliably.
5. **Verify what actually ran.** `traycer agent create` and `configure` can fail open — reporting
   success while applying none of the flags. Confirm the real provider, model, and variant from the
   harness itself after the first turn. Never accept the create command or the agent's self-report
   as evidence.

Steps 4 and 5 are first-time or repurposing costs. A warm agent already configured for the same
role skips to step 6.

### Commission

6. **Write the spec with `writespec`.** Roughly five clauses, an explicit allowlist of modifiable
   files, and the `scope.md` and `closing.md` blocks appended verbatim. `tools/writespec-guard`
   denies non-compliant sends, so this is enforced rather than advisory.
7. **State the verification baseline in concrete numbers.** Write the spec as though the
   implementer cannot ask. Give the literal lint error and warning counts, the literal test count,
   and any repository-specific command trap. A cross-reference to another document is not a
   baseline. A runtime question route does not weaken this requirement.

   **State the numbers, but ask the implementer to run only `typecheck` and `vitest`** (added
   2026-08-12). It needs the literal counts to know what "no worse" means; it does not need to
   produce them all itself.

   | Command | Who runs it | Why |
   | --- | --- | --- |
   | `npm run typecheck` | implementer **and** checker | The one check that catches the implementer's own errors before handback. Non-negotiable. |
   | `npx vitest run` | implementer **and** checker | Cheap (~12s) and confirms nothing existing broke. |
   | `npm run lint` | **checker only** | Known-failing at a fixed count; an implementer re-deriving it learns nothing. |
   | `npm run build` | **checker only** | The most expensive command in the repo and the least informative to the implementer. |

   The reason is contention, and it is measured rather than theoretical. This machine gives WSL 2
   of its 4 cores. Asking five agents for four commands each is ~20 build-weight jobs on two
   cores; on 2026-08-12 the load average sat at 7.85–11.14 and an implementer's `npm run build`
   took **2m40s** against the orchestrator's **29s** for the identical command — a 5.5× slowdown
   from contention alone.

   This matters beyond speed. **A starved agent is indistinguishable from a stalled one.** That
   ambiguity produced a wrong "the agents are looping" diagnosis, a needless steer sent to five
   working agents, and an implementer that sat twenty minutes on a `tsc -b` whose result was going
   to be discarded and re-run on the integration branch anyway.

   Cutting the two expensive commands is the fix. **Do not respond by shrinking the wave** — fan
   out as wide as the specs allow.

   `tools/agent-lock` does **not** help here: it holds `flock -n`, so a second caller fails
   immediately with exit 75 rather than queuing. It is a mutual-exclusion guard for things that
   must never overlap (installs, the dev server), not a scheduler. Wrapping verification in it
   would turn contention into spurious failures.

   **The orchestrator observes the same rule in reverse: never run a baseline in the root checkout
   while agents are still working.** It competes with them directly. Hold it until the handbacks
   are in and run it once on the integration branch, which is what step 13 wants regardless.
8. **Send with `--expect-reply`.** Without it the peer never reports back. When the orchestrator is
   Codex TUI, activate `$codex-tui-relay` first and append the complete commission to its artifact
   ledger instead of calling Traycer's mutating agent commands. The persistent DeepSeek GUI hub
   executes the commission with `--expect-reply`, so native responses return to that hub and it
   appends them verbatim to the same ledger. `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md` owns that
   transport adapter; all other steps here remain unchanged.

### Review

9. **Commit the handback, then merge the branch into an `integration` branch, not `main`.** The
   implementer is told not to commit, so the work normally arrives uncommitted in its worktree.
   Committing it on its own branch is integration work and belongs to the orchestrator; say in the
   message that it is unreviewed at that point. Reviewing the merged tree rather
   than the worktree means every repair is made against the code that will actually ship, so no
   fix can be invalidated by a later merge. Using a scratch branch rather than `main` keeps the
   discard path cheap if the diff turns out to be unacceptable.
10. **Map clauses first, and decide redelegation here.** Enumerate every spec clause, map each to
    the hunk that satisfies it, and map every hunk back to a clause. Do this before writing a
    single test.

    This ordering matters: **a missing clause is the one finding that tests cannot surface.** A
    suite written against a clause nobody implemented does not report a gap, it reports a failure,
    and you would go looking for a bug that is really an absence. Finding it here instead is
    cheap, and it is the point at which the redelegate-or-repair call is made — before any further
    effort is spent either way.

    **A missing clause does not by itself mean redelegation.** The test is the size and kind of
    the remaining work: repair it inline when it is implementable from the spec you already wrote,
    hand it back only when completing it would mean designing rather than repairing. See the
    exception list in `speccheck`.

11. **Then write independent tests and run them.** Derive coverage from the clause list, never
    from the implementation. Treat any tests the implementer supplied as part of the diff under
    review, not as evidence: read their bodies, because a test named for a clause can contain
    nothing that exercises it.

12. **Repair inline, then re-run the tests.** The checker owns the repair loop. Fix everything
    localized in one pass and confirm the suite is green afterwards. Hand work back only under a
    named `speccheck` exception — and by this point that should only be the whole-missing-clause
    case already caught at step 10.

### Integrate

13. **Run the full baseline once, after the repairs.** `npm test`, `npm run typecheck`,
    `npm run lint`, `npm run build`, `git diff --check`. Derive the lint ceiling by running it, not
    by quoting a document — see step 7.

    **A green test suite does not make this redundant.** Vitest transforms with esbuild, which
    strips types without checking them. Demonstrated 2026-08-09: a deliberate
    `const bogus: number = "not a number"` left all 93 tests passing while `tsc -b` reported
    `TS2322`. Typecheck is the irreplaceable element and also the slowest — roughly 46s of the
    ~79s total, against 7.6s for tests, 8.7s lint, 16.7s build. That is the price of the one gate
    that catches what behaviour cannot.

    Skip it only when the merge at step 9 was a fast-forward *and* step 12 changed nothing — the
    tree is then byte-identical to something already verified.
14. **Fast-forward `main` from `integration`,** then delete the scratch branch. Commit locally.
    Never push. Keep unrelated work off `integration` — it may be discarded wholesale, and
    unrelated commits pollute the diff under review.
15. **Re-merge `main` into every worktree that is idle and clean,** including the one that just
    delivered. Skipping this is what makes the second and third integrations of a batch conflict.

    **Never merge into a worktree whose agent is mid-task.** Git fails safe when the incoming
    commits touch a file the agent has modified — it refuses rather than clobbering — but when
    they touch *other* files the merge succeeds and the agent's working tree shifts underneath it.
    Its file reads go stale, its edits land on moved line numbers, and the resulting failures are
    hard to attribute to the merge that caused them.

    For a busy worktree, defer the sync instead of forcing it. Step 2 of its next delegation
    brings it current before anything is dispatched, so nothing is lost by waiting. Syncing idle
    worktrees eagerly is an optimization that keeps drift small and surfaces conflicts early — it
    is not a correctness requirement.
16. **Leave the worktree and agent warm.** Do not delete either. The next delegation re-enters at
    step 1.

## Running several delegations at once

Fan out in parallel. **How you fan in depends on whether the specs are disjoint**, and that is a
fact about the specs you wrote, not a judgement call at integration time.

### Disjoint specs — batch them

When no two specs name the same file, merge **all** the returned branches into one `integration`
branch, run **one** `speccheck` pass across the whole diff, repair inline, and run **one**
baseline. Three delegations then cost one baseline rather than three.

**If that baseline fails, repair inline again and re-run it. Do not fall back to per-branch
integration.** Going backwards means unpicking a merge whose inline repairs are already applied
and re-applying them one branch at a time — far more expensive than fixing forward, and the
failure is nearly always a small semantic clash between branches rather than one bad branch. The
attribution you would gain by bisecting is not worth the work you would throw away to get it.

Disjoint files do not rule out a *semantic* clash: branches consuming a shared API can each be
green alone and fail together with no conflict markers. That is precisely what the single
post-merge baseline exists to catch, and it is why the baseline runs on the merged tree rather
than in any worktree.

### Overlapping specs — integrate one at a time

When the specs genuinely share files, merge and check them one branch at a time. Here attribution
does pay for itself, because a conflict or failure is likely to belong to a specific branch rather
than to the combination, and the per-branch cost buys a clear owner.

Prefer to avoid this by partitioning the specs properly. A textual conflict between supposedly
disjoint branches at step 9 is a spec violation, not a merge problem — investigate it as one.

### Either way

A branch verified against a `main` that has since advanced has not been verified against the tree
it is about to join. Step 15 is what keeps that from accumulating.
