---
name: healthcheck
description: Perform one lightweight health check of background work active in the current session, diagnose failures or stalls, and minimally recover them. Use when asked for a health check, background-job status, or to check whether an active run is still healthy. Do not use for continuous monitoring.
---

1. When this skill is installed user-wide, inspect the active repository's same-name project skill
   (`.agents/skills/healthcheck/SKILL.md` for Codex or `.claude/skills/healthcheck/SKILL.md` for Claude
   Code). Apply any additional project rules as an extension; do not recursively re-invoke it.
2. Discover only background jobs associated with the current session. Inspect tracked shells/tasks and
   relevant process names; identify each job's output or log.
3. Check current progress and task-specific failures: exceptions, nonzero exits, HTTP errors, auth or
   credit/rate limits, malformed output, and genuine stalls.
4. If healthy, report one terse line per job and stop.
5. If broken, apply the smallest in-scope fix and resume only checkpoint-safe work. Do not restart
   unrelated jobs or loop on a persistent failure.
6. Report the diagnosis and recovery in one or two lines. Never invent a background job when none is
   active.
