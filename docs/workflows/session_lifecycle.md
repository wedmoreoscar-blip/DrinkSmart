# Session Lifecycle

## Kickoff

Kickoff is read-only:

1. Read `tasks/next_session_kickoff.md`, `docs/decisions.md`, `docs/agent_roster.md`,
   `tasks/route_state.md`, and current Git status.
2. Extract the fenced text beneath `## PROMPT` and treat it as the requested continuation.
3. Flag a missing, malformed, visibly stale, or higher-authority-conflicting kickoff before acting.
4. Do not rewrite or archive session files during kickoff.

## Handoff modes

Use normal mode unless the user requests archive-only mode or another concurrent session owns the
canonical continuation.

- Normal: update `HANDOFF.md`, create a timestamped `tasks/kickoff_history/<date_time>.md`, and replace
  `tasks/next_session_kickoff.md` with identical current session content.
- Archive-only: create only a timestamped history file marked `mode: archive-only` and
  `canonical_kickoff_updated: false`. Do not touch either live continuation file.

## Handoff procedure

1. Run the update-decisions workflow and update only findings changed during the session.
2. Triage the entire Git status into safe task changes, unrelated/user changes, generated files, and
   sensitive paths.
3. Write a concise bundle with context, read-first files, locked decisions, explicit exclusions, and a
   `## PROMPT` fenced `text` block containing the exact next task.
4. Write the selected normal or archive-only destinations.
5. Re-triage. Stage explicit safe paths and create a local commit only when appropriate. Never push.
6. Report the mode, changed continuation records, history path, local commit if any, and whether the
   canonical kickoff changed.
