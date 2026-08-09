---
name: speccheck
description: Verify an implementer's diff against the spec that commissioned it. Use after a delegated implementation returns, before accepting the work.
---

# Spec check

Order matters. Do these in sequence and do not skip ahead to the diff.

The sequence is built to cost one review pass, one repair loop, and one full
baseline run per delegation. `docs/workflows/delegation.md` holds the wider
end-to-end path this check sits inside.

## 1. Check the merged tree, not the worktree

Merge the delegated branch into an `integration` branch before reading
anything. Two reasons, both about not paying twice:

- A repair made in the worktree is made against a tree that is not the one
  shipping. If the integration target moved while the implementer worked, the
  merge produces a tree that has never existed anywhere, and it needs its own
  verification regardless — so verifying the worktree first is wasted.
- Merging into a scratch branch rather than the integration target keeps the
  discard path cheap. If the diff turns out to be unacceptable, delete the
  branch; nothing has to be reverted.

A textual conflict here means the implementer wrote outside its allowlist.
Treat that as a scope finding, not a merge chore.

## 2. Enumerate the spec first

Before reading the diff, list every requirement in the spec as a numbered
clause. Include acceptance criteria and scope restrictions ("do not touch X")
as clauses. Do not look at the implementation while doing this.

## 3. Map clauses to hunks

For each clause, find the hunk that satisfies it. Record clause number,
file, and line range. A clause with no hunk is the primary thing this
check exists to catch: the diff cannot show what was never written, so
it will not draw attention to itself.

## 4. Map hunks to clauses

Reverse direction. Any hunk not traceable to a clause is scope creep.
Flag it; do not silently accept it because it looks reasonable.

## 5. Write tests from the spec, not the code

Derive test cases from the clause list. Do not read the implementation
to decide what to test, or the tests will mirror whatever the code
happens to do, including its mistakes.

**Treat any tests the implementer supplied as part of the diff under review,
never as evidence.** They were written by the agent that wrote the code, so
they encode its assumptions, including the assumption that an unbuilt clause
was built. A test whose name matches a clause is not coverage of that clause;
read its body and confirm it exercises the thing it claims to. A passing suite
submitted alongside an implementation is a claim, and this step exists to test
that claim rather than inherit it.

Cover at minimum: each clause's stated behaviour, the negative case for
any conditional clause, and anything the spec named as acceptance criteria.

## 6. Run the tests, and fix inline

Run the test suite only — not the full verification profile. This run is
diagnostic: it makes the repairs targeted rather than speculative, and it
verifies the implementer's claim that its tests pass rather than trusting it.
It is cheap, so run it here.

Once the implementation is handed back, the checker owns the repair loop. The
implementer's original model assignment, subject-matter category, warm context,
or availability is no longer a reason to delegate a repair.

Fix localized failures directly, including their regression tests. Do not hand
back anything within the commissioned allowlist that is roughly twenty changed
production lines or less and does not replace the approach. Test lines do not
make a small production fix "large". Finish all such fixes and verification in
the current checker turn.

Gather every problem from steps 3, 4, and this one before starting to repair,
and fix them together. Interleaving discovery and repair is what turns one
loop into several.

Contact the implementer again only when at least one of these exceptions is
true:

1. a whole specification clause is absent;
2. the implementation uses the wrong approach and needs a substantial rewrite;
3. the repair requires files or authority outside the commissioned scope; or
4. the checker lacks a required external capability or infrastructure.

Before any repair message or follow-up task, state which numbered exception
applies and the concrete evidence for it. If none applies, sending the message
is a workflow violation. Re-engaging a warm agent is new delegated work and
still requires the user's confirmation under the warm-agent rule.

## 7. Run the full baseline once, after the repairs

Now run the whole profile: tests, typecheck, lint against its recorded count,
build, and a whitespace check. This is a confirmation gate, not a diagnostic.
Running it before the repairs means running it twice.

Skip it only when step 1's merge was a fast-forward *and* step 6 changed
nothing. The tree is then byte-identical to the one step 6 already tested, and
re-running proves nothing.

## 8. Integrate by fast-forward, and leave the worktree warm

Fast-forward the integration target from `integration`. Commit locally; never
push without explicit authorization.

Then re-merge the integration target into every delegated worktree that is
idle and clean, including the one that just delivered. Skipping this is what
makes the second and third integrations of a batch conflict.

Never merge into a worktree whose agent is mid-task. Where the incoming commits
touch a file the agent has modified, Git refuses and fails safe; where they
touch other files the merge succeeds and the agent's tree shifts underneath it,
producing stale reads and misplaced edits that are hard to trace back. Defer
that worktree's sync until just before its next dispatch, which brings it
current anyway.

Do not delete the worktree or stand down the agent. A clean worktree level with
the integration target is a provisioned asset for the next delegation.

## 9. Report

State: clauses satisfied, clauses missing, out-of-scope changes, tests
added, failures found and fixed. Be specific about clause numbers. Report the
baseline result, or state that it was skipped and why.
