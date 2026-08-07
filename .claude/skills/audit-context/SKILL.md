---
name: audit-context
description: Audit and reconcile repository code, configuration, durable records, and requested session history without changes. Use when asked to read everything, understand a codebase, audit context, reconcile docs with code, or recommend workflow changes after a broad review.
---

1. When this skill is installed user-wide, inspect the active repository's same-name project skill
   (`.agents/skills/audit-context/SKILL.md` for Codex or `.claude/skills/audit-context/SKILL.md` for
   Claude Code). Apply any additional project rules as an extension; do not recursively re-invoke it.
2. Read applicable repository instructions and Git status. If
   `docs/workflows/context_audit.md` exists, follow it as the repository-specific contract.
3. Inventory the requested code, configuration, task records, history, and session sources before
   claiming coverage.
4. Separate current code/config from settled decisions, pending intent, generated handoffs, historical
   context, and machine-local state. If the repo has no decision ledger, say so rather than inventing one.
5. Verify drift-prone claims against current files and Git state.
6. Report exclusions and discrepancies with file references. Keep the audit read-only unless the user
   separately approves implementation.
