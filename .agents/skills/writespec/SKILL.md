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
