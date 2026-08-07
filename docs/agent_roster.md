# Coding Agent Roster

This roster defines repository-development roles, not the models used inside the DrinkSmart product.
If a named model is unavailable on a machine, retain the role and reasoning/cost intent with the
nearest available model, and record the substitution in the task plan.

| Role | Codex | Claude Code | Responsibility |
|---|---|---|---|
| Planner | GPT-5.6 Sol, high | Opus | Work with the user, approve scope and acceptance criteria, orchestrate implementation/review, integrate reviewed work |
| Implementer | GPT-5.6 Luna, high | Sonnet, high | Implement one approved, self-contained unit and run focused validation |
| Mechanical worker | GPT-5.6 Luna, low | Haiku, low | Perform narrow deterministic edits; stop when judgment is needed |
| Reviewer | GPT-5.6 Terra, high | Sonnet, high | Independently review the plan and diff, add durable tests when useful, and validate evidence |

The shared lifecycle is defined in `docs/agent_workflow.md`. Client-native definitions live in
`.codex/agents/` and `.claude/agents/`.
