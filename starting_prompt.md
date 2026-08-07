# Starting Prompt for a Newly Cloned Machine

Run Codex or Claude Code from the DrinkSmart repository root, then give it the complete prompt below.
The prompt sets up every installed coding client without changing DrinkSmart application code.

```text
Set up this newly cloned DrinkSmart repository for the Codex and Claude Code workflow that is already
versioned here. Work autonomously through safe setup steps, but do not overwrite a conflicting personal
skill or install/update a coding-client binary without asking me first.

Scope and safety:

- Keep this task strictly to coding-agent setup. Do not edit application source, install npm
  dependencies, run database migrations, deploy anything, change secrets, commit, or push.
- Never copy `.env` files, API keys, authentication state, chats, memories, approval caches,
  `.claude/settings.local.json`, `CLAUDE.local.md`, `.worktrees/`, `node_modules/`, or `dist/`.
- Preserve all existing user-level skills. An absent destination may be created and populated; an
  identical destination is a no-op; a different same-name destination is a conflict that you must show
  me and leave untouched until I approve a resolution.
- Use real directories and files, not symlinks, so the setup remains portable across macOS, Linux, WSL,
  and Windows.

Do the following:

1. Confirm that the current directory is the DrinkSmart repository root. Read these files completely:

   - `AGENTS.md`
   - `docs/agent_setup/CROSS_MACHINE_SETUP.md`
   - `docs/agent_setup/SKILL_CATALOG.md`
   - `docs/agent_workflow.md`

2. Identify whether this session is running in Codex or Claude Code. Also detect whether `codex` and
   `claude` are installed on this machine. Do not install a missing client; report it instead. Read the
   matching setup guide for every installed client:

   - Codex: `docs/agent_setup/CODEX_SETUP.md`
   - Claude Code: `docs/agent_setup/CLAUDE_CODE_SETUP.md`

3. Explain briefly what the clone already provides. Verify, rather than recreate, these project-local
   layers:

   - shared authority and project rules in `AGENTS.md`, with Claude's `CLAUDE.md` extension;
   - Codex configuration and roles in `.codex/`, plus project skills in `.agents/skills/`;
   - Claude settings and roles in `.claude/`, plus project skills in `.claude/skills/`;
   - shared decisions, routing, handoff/kickoff, verification, locking, and worktree tooling under
     `docs/`, `tasks/`, and `tools/`.

4. If repository trust or workspace trust is required, tell me the exact client action needed. Do not
   weaken global permissions to bypass trust. Run:

   `tools/check-agent-setup`

   Stop and diagnose any failure before copying personal skills.

5. Install the following six generic skills user-wide for every coding client that is installed:

   - `audit-context`
   - `handoff`
   - `healthcheck`
   - `kickoff`
   - `skill-writing`
   - `teacher`

   Use these source and destination mappings:

   - Codex: `.agents/skills/<name>/` -> `~/.agents/skills/<name>/`
   - Claude Code: `.claude/skills/<name>/` -> `~/.claude/skills/<name>/`

   Inspect each destination before writing. Copy the complete skill directory only when the destination
   is missing. If the destination exists, compare it recursively: leave identical packages alone and
   report differing packages as conflicts without overwriting them. Preserve Codex
   `agents/openai.yaml` metadata when copying a Codex package.

6. Do not install these project-integrated skills user-wide:

   - `bench`
   - `make-bench`
   - `decision-check`
   - `route`
   - `unroute`
   - `update-decisions`

   They remain available inside DrinkSmart through the repo-local skill directories. Other repositories,
   especially `legal-graph-db-rag`, must use their own project-local versions because their benchmarks,
   decision ledger, routing state, resource locks, and handoff authority are repository-specific. The
   generic personal skills are designed to inspect and defer to richer same-name project packages.

7. Verify the result:

   - rerun `tools/check-agent-setup`;
   - confirm that every copied personal package contains its `SKILL.md`;
   - confirm that no project-specific skill was installed user-wide;
   - confirm that no secret, local settings file, application file, dependency file, or Git-tracked
     project file was changed by this setup;
   - determine whether a fresh client session is needed for discovery.

8. Give me a concise final report containing:

   - the current client and every installed client detected;
   - repository validation results;
   - exact personal skill destinations created for Codex and/or Claude Code;
   - identical packages skipped;
   - conflicts left untouched;
   - project-specific skills intentionally kept repo-local;
   - any trust action, authentication, missing client, or restart still required.

Do not claim that another repository is configured merely because the generic personal skills exist.
When `legal-graph-db-rag` is cloned, start a fresh session in its root and use its own `AGENTS.md`,
`CLAUDE.md`, `.agents/skills/`, `.claude/skills/`, decisions, and workflow tools.
```
