---
name: writespec
description: Write an implementation spec for delegation to a separate coding agent. Use before handing work to an implementer that does not share this session's context.
---

# Writing a spec for delegation

The implementer has none of your context. It has not read this codebase,
does not know the conventions, and cannot ask you a question. Everything
it needs is in the spec or it is not available.

## Assume nothing carries over

Name files by full path. Point at an existing function it should imitate,
by name and approximate line, rather than describing a convention. Give
exact type or signature names; do not paraphrase them.

## State scope in both directions, tightly

Say what to change and say explicitly what not to touch. Unstated scope is
where delegated work drifts, because a reasonable-looking related edit is
invisible in review unless you named the boundary first.

Default to the smallest possible change. Name the files that may be
modified, and say that no others may be. If the implementer believes
another file needs changing, it must report that rather than do it.

Unrequested improvements are the most expensive kind of drift: they look
like good work, so review waves them through, and they enlarge the diff
that every later review has to read.

## Make acceptance checkable

Each criterion should be something a reader with only the spec and a diff
can confirm or deny. "Handles the connected-party case" is not checkable.
"Returns a StatuteClaim node when both facts are present, None otherwise"
is.

## State the verification baseline

The implementer cannot ask what "passing" looks like. If the repository
has known-failing checks, a missing test runner, or checks that need
unavailable infrastructure, say so in the spec and state exactly which
commands must pass, which are expected to fail unchanged, and which are
BLOCKED rather than runnable.

Give literal numbers, not cross-references. "The lint baseline is 9 errors
and 11 warnings" is a baseline; "the accepted count from the previous
ticket" is not, because the implementer cannot look it up and cannot ask.
The same goes for the current test count and for any command that behaves
unexpectedly in this repository — name the trap and the correct invocation.

## Say where the work happens and who owns Git

State the worktree path. Say that the orchestrator has already synchronized
it and installed dependencies, and that the implementer must not merge,
rebase, reset, stash, commit, or change branches. Integration is the
orchestrator's, and an implementer that starts moving branches around
produces a diff nobody can review.

## Size it to one review

If a spec has more than roughly five clauses, split it. Long specs mean
long diffs, and long diffs mean a failed review sends a lot of correct
work back round with the incorrect part.

## Assembling the spec

Write the task-specific sections yourself. Then append the two fixed
blocks verbatim from this skill's `blocks/` directory (the skill's base
directory is shown when it loads):

    cat <skill-base-dir>/blocks/scope.md >> <spec-file>
    cat <skill-base-dir>/blocks/closing.md >> <spec-file>

Do not retype, summarise or reword these. Append the files.

### Do not ask the implementer to verify its own work

`closing.md` says "Do NOT write new tests." That line is load-bearing. Do not
override it, and do not write a spec clause that requires the implementer to
produce test coverage.

The implementer should get the code written and confirm two cheap things: it
executes without syntax or import errors, and the existing suite still passes.
Everything past that is the checker's, on the integration branch.

Three reasons, in increasing order of importance:

1. **It is duplicated work.** The checker re-derives the tests from the spec
   regardless, so the implementer's verification time buys nothing.
2. **It is the wrong agent's time.** Implementers are chosen for competence and
   land most of the work correctly. Having one grind at the last stretch is
   slower than letting an independent checker find it, and it is time added to
   the critical path rather than removed from it.
3. **Implementer-written tests conceal missing work.** This is the real cost.
   Tests written by whoever wrote the code encode the same assumptions,
   including the assumption that an unbuilt clause was built. A green suite
   then reports success over a gap, which is worse than no suite at all,
   because it stops the checker looking.

That third failure has now happened twice in this repository. In W3-A1 the
submitted fixtures hid a unit mismatch and a collapsed multi-serving portion.
In W3-A2 a test named for the spec's anchor clause contained no anchor and
passed against a function that had no anchor parameter, so an absent
requirement reported green.

If a ticket genuinely needs the implementer to write a test, state the specific
reason in the spec. For deterministic logic there is essentially never one.
