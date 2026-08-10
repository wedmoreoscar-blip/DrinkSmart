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

## The path

### Provision

1. **Reuse a warm agent.** Check the epic's agents for one whose worktree is clean and whose
   harness suits the task. Reuse is the default route; creating an agent or worktree is the
   exception. Ask the user before reusing (see `agent_selection.md`) — reuse is recommended, not
   pre-authorized.
2. **Bring the worktree level with `main`.** Merge only. Never reset, rebase, or stash to get
   there. If the worktree is dirty or cannot be synchronized without risking unintegrated work,
   stop and ask rather than forcing it.
3. **Install only if the dependency set actually moved.** A warm worktree already has
   `node_modules`; reinstalling into one is slow and buys nothing. Run `npm install` under
   `tools/agent-lock dependencies` in exactly two cases:

   - the worktree is newly created, or
   - the merge in step 2 changed `package-lock.json`.

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
8. **Send with `--expect-reply`.** Without it the peer never reports back. When the orchestrator is
   Codex TUI, activate `$codex-tui-relay` first and append its communication preamble. The native
   reply thread still targets Codex TUI and is not a usable inbound channel, so the implementer must
   explicitly send every substantive question, status, blocker and handback to the persistent
   receiver. `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md` owns that transport adapter; all other
   steps here remain unchanged.

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
