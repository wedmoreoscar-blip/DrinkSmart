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
7. **State the verification baseline in concrete numbers.** The implementer cannot ask. Give the
   literal lint error and warning counts, the literal test count, and any repository-specific
   command trap. A cross-reference to another document is not a baseline.
8. **Send with `--expect-reply`.** Without it the peer never reports back.

### Review

9. **Commit the handback, then merge the branch into an `integration` branch, not `main`.** The
   implementer is told not to commit, so the work normally arrives uncommitted in its worktree.
   Committing it on its own branch is integration work and belongs to the orchestrator; say in the
   message that it is unreviewed at that point. Reviewing the merged tree rather
   than the worktree means every repair is made against the code that will actually ship, so no
   fix can be invalidated by a later merge. Using a scratch branch rather than `main` keeps the
   discard path cheap if the diff turns out to be unacceptable.
10. **Run `speccheck` on the merged tree.** Enumerate clauses, map clauses to hunks and hunks back
    to clauses, and run `npm test` as evidence. The test run here is cheap and diagnostic: it makes
    the repairs targeted instead of speculative, and it verifies the implementer's claim rather
    than trusting it. This is not the baseline.
11. **Repair inline.** The checker owns the repair loop. Fix everything localized in one pass,
    including regression tests. Hand work back only under a named `speccheck` exception.

### Integrate

12. **Run the full baseline once, after the repairs.** `npm test`, `npm run typecheck`,
    `npm run lint` against the recorded count, `npm run build`, `git diff --check`. Skip it only
    when step 9 was a fast-forward *and* step 11 changed nothing — the tree is then byte-identical
    to what step 10 already tested.
13. **Fast-forward `main` from `integration`,** then delete the scratch branch. Commit locally.
    Never push. Keep unrelated work off `integration` — it may be discarded wholesale, and
    unrelated commits pollute the diff under review.
14. **Re-merge `main` into every worktree that is idle and clean,** including the one that just
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
15. **Leave the worktree and agent warm.** Do not delete either. The next delegation re-enters at
    step 1.

## Running several delegations at once

Fan out in parallel, fan in serially.

- Parallel implementation is safe when the specs' file allowlists are disjoint. A textual conflict
  at step 9 therefore indicates a spec violation, not a merge problem — investigate it as one.
- Integrate one branch at a time. Merging several before testing destroys attribution: a failure
  no longer names the branch that caused it.
- Disjoint files do not rule out a *semantic* clash. Branches that consume a shared API can each be
  green alone and fail together with no conflict markers. Step 12 on the merged tree is what
  catches this, and it is the reason the baseline runs post-merge rather than in the worktree.
- A branch verified against a `main` that has since advanced has not been verified against the tree
  it is about to join. Step 14 is what keeps that from accumulating.
