# Cross-Machine Agent Setup

This repository is the portable source for DrinkSmart's shared Codex and Claude Code workflow. A
fresh clone contains project instructions, skills, role definitions, lifecycle records, and worktree
tools. No chat import is required to recreate the project setup.

## What a clone provides automatically

- Codex: `AGENTS.md`, `.codex/config.toml`, and `.agents/skills/`.
- Traycer Codex TUI orchestration: the repo-local `codex-tui-relay` skill and
  `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md`; live receiver identity and transcript remain in the
  Traycer epic rather than Git.
- Claude Code: `CLAUDE.md` importing `AGENTS.md`, `.claude/settings.json`, and `.claude/skills/`.
- opencode: `AGENTS.md`, `opencode.json` (registers both skill trees and the change-safety deny
  rules), and both `.agents/skills/` and `.claude/skills/`.
- Both: decisions, the delegation spec workflow (`writespec`/`speccheck` for Traycer-orchestrated
  implementation), handoff/kickoff lifecycle, resource locks, verification profiles, and benchmark
  conventions.

The clients still keep authentication, secrets, trust decisions, local permissions, chat history, and
auto memory on the individual machine. Never copy those through Git.

## Bootstrap sequence for either agent

1. Install or update the chosen client and authenticate on the new machine.
2. Clone the repository and enter its root.
3. Read `AGENTS.md`, this file, the client-specific setup file, and `SKILL_CATALOG.md`.
4. Mark the repository trusted when the client asks. Codex ignores project `.codex/` configuration in
   an untrusted repository; Claude applies project permission rules only after workspace trust.
5. Run `tools/check-agent-setup`.
6. Start a fresh client session from the repository root and verify project instructions and skills.
7. Install only the recommended generic personal skills if they should follow the user into unrelated
   repositories. They explicitly defer to additional rules in same-name project packages. Keep project
   lifecycle and benchmark skills repo-local.

Use `CODEX_SETUP.md` or `CLAUDE_CODE_SETUP.md` for exact discovery paths and checks. An agent can follow
`BOOTSTRAP_PROMPT.md` to carry out this sequence interactively.

## Using another repository on the new machine

Repository-specific skills travel with that repository. A current clone of `legal-graph-db-rag`
already contains its specialized `bench`, `make-bench`, `handoff`, routing, and decision workflows;
do not replace them with DrinkSmart's generic variants. Clone that repository, launch the client at
its root, and run its own setup check or inspect its `.agents/skills` and `.claude/skills` directories.

If a third repository has no workflow layer, copy and adapt the complete integration as a unit:
`AGENTS.md`, the Claude import, `.agents`, `.claude`, `.codex`, `opencode.json`,
`docs/workflows/`, `tasks/`, and
`tools/agent-*`. Copying only `bench` or `handoff` leaves dangling references and is not a valid
installation.

## Never transfer

- `.env` files, API keys, Supabase secrets, OAuth state, or client authentication.
- `.claude/settings.local.json`, `CLAUDE.local.md`, local memories, chats, or approval caches.
- `.worktrees/`, its lifecycle state, `node_modules/`, `dist/`, or generated benchmark results.
- A personal skill over an existing same-name project skill without reviewing precedence and diff.
- A live Codex-TUI receiver ID, receiver transcript, processed-message state, or Traycer agent record.
