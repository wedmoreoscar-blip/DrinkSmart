---
name: skill-writing
description: Create or revise portable Agent Skills packages for Codex and Claude Code. Use before editing any SKILL.md or when asked to create a skill, slash-command workflow, reusable agent procedure, or cross-client skill package.
---

1. When this skill is installed user-wide, inspect the active repository's same-name project skill
   (`.agents/skills/skill-writing/SKILL.md` for Codex or `.claude/skills/skill-writing/SKILL.md` for
   Claude Code). Apply any additional project rules as an extension; do not recursively re-invoke it.
2. Read `docs/workflows/skill_authoring.md` when the active repository provides it; otherwise use this
   skill's portable structure and the active client's official skill creator.
3. Define realistic triggers, non-triggers, inputs, outputs, safety boundaries, and edge cases.
4. Keep one focused job per skill and use portable `name` plus `description` frontmatter.
5. Keep the body concise; place detailed material in directly linked `references/` and use scripts only
   for deterministic repeated work.
6. Initialize and validate with the active client's official skill creator when available.
7. For a dual-client repository, mirror portable behavior under `.agents/skills/<name>/` and
   `.claude/skills/<name>/`; add Codex `agents/openai.yaml` metadata from the finished skill. For a
   personal skill, use `~/.agents/skills/` for Codex or `~/.claude/skills/` for Claude Code.
8. Test triggers, paraphrases, non-triggers, incomplete inputs, and edge cases in fresh sessions. Run a
   repository setup validator when one exists.
