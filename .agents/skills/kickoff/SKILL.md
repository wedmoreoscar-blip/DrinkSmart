---
name: kickoff
description: Resume a repository's recorded next-session task from its canonical kickoff and locked records. Use when the user says kickoff, resume, continue where we left off, or start the recorded next task.
---

1. When this skill is installed user-wide, inspect the active repository's same-name project skill
   (`.agents/skills/kickoff/SKILL.md` for Codex or `.claude/skills/kickoff/SKILL.md` for Claude Code).
   Apply any additional project rules as an extension; do not recursively re-invoke it.
2. Read applicable repository instructions and current Git status. If
   `docs/workflows/session_lifecycle.md` exists, follow its kickoff contract.
3. Discover the repository's continuation source. Prefer an explicitly named canonical file, then
   `tasks/next_session_kickoff.md`, root `HANDOFF.md`, or a clearly current `SESSION_HANDOFF.md`.
4. Read any referenced decisions, roster, plan, or verification records that actually exist. Do not
   assume a universal directory layout.
5. Extract an explicit fenced `## PROMPT` when present. Otherwise summarize the recorded next step and
   ask before acting if multiple continuations are plausible.
6. Flag missing, malformed, stale, or higher-authority-conflicting context. State what loaded, then
   follow the task without rewriting handoff artifacts during kickoff.
