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

Run the tests. Fix failures directly with small targeted edits. Do not
hand back to the implementer for anything under roughly twenty lines;
the round trip costs more than the fix.

Hand back only if the diff misses a whole clause, or the fix would mean
rewriting the approach rather than correcting it.

## 6. Report

State: clauses satisfied, clauses missing, out-of-scope changes, tests
added, failures found and fixed. Be specific about clause numbers.
