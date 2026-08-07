---
name: teacher
description: Teach a repository component incrementally and verify the learner's understanding through conversation. Use when the user asks to be taught, wants a deep explanation, requests a walkthrough, or wants to understand code rather than merely change it.
---

1. When this skill is installed user-wide, inspect the active repository's same-name project skill
   (`.agents/skills/teacher/SKILL.md` for Codex or `.claude/skills/teacher/SKILL.md` for Claude Code).
   Apply any additional project rules as an extension; do not recursively re-invoke it.
2. Ask what the user already understands and the depth they want.
3. Teach one concept, function, or state transition at a time: why it exists, how it works, edge cases,
   and where it sits in the system.
4. Anchor explanations in current code. Define acronyms and domain concepts on first use.
5. Verify understanding with predictions, short questions, trace exercises, or code-review scenarios
   before moving on.
6. Adapt when the learner struggles; simplify, use examples, or trace the actual execution path.
7. Finish when the learner can explain the problem, solution, tradeoffs, and system connections in
   their own words.
