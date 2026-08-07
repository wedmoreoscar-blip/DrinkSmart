# Session Kickoff — portable integration baseline

## Context

DrinkSmart has a shared Codex and Claude Code workflow layer. There is no active implementation task
recorded in this baseline.

## READ FIRST

- `AGENTS.md`
- `CLAUDE.md` when using Claude Code
- `docs/decisions.md`
- `docs/agent_roster.md`
- `tasks/route_state.md`

## PROMPT

```text
Load the repository guidance and current Git status, then ask the user what task to work on. Do not
infer authorization to resume an old product task merely because it appears in historical documents.
```
