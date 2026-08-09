---
name: speccheck
description: Verify an implementer's diff against the spec that commissioned it. Use after a delegated implementation returns, before accepting the work.
---

# Spec check

Order matters. Do these in sequence and do not skip ahead to the diff.

## 1. Enumerate the spec first

Before reading the diff, list every requirement in the spec as a numbered
clause. Include acceptance criteria and scope restrictions ("do not touch X")
as clauses. Do not look at the implementation while doing this.

## 2. Map clauses to hunks

For each clause, find the hunk that satisfies it. Record clause number,
file, and line range. A clause with no hunk is the primary thing this
check exists to catch: the diff cannot show what was never written, so
it will not draw attention to itself.

## 3. Map hunks to clauses

Reverse direction. Any hunk not traceable to a clause is scope creep.
Flag it; do not silently accept it because it looks reasonable.

## 4. Write tests from the spec, not the code

Derive test cases from the clause list. Do not read the implementation
to decide what to test, or the tests will mirror whatever the code
happens to do, including its mistakes.

Cover at minimum: each clause's stated behaviour, the negative case for
any conditional clause, and anything the spec named as acceptance criteria.

## 5. Run and fix inline

Run the tests. Once the implementation is handed back, the checker owns the
repair loop. The implementer's original model assignment, subject-matter
category, warm context, or availability is no longer a reason to delegate a
repair.

Fix localized failures directly, including their regression tests. Do not hand
back anything within the commissioned allowlist that is roughly twenty changed
production lines or less and does not replace the approach. Test lines do not
make a small production fix "large". Finish all such fixes and verification in
the current checker turn.

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

## 6. Report

State: clauses satisfied, clauses missing, out-of-scope changes, tests
added, failures found and fixed. Be specific about clause numbers.
