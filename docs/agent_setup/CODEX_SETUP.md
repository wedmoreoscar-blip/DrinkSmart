# Codex Setup

## Project discovery

From the repository root, Codex discovers:

- `AGENTS.md` as durable project guidance.
- `.codex/config.toml` as trusted-project settings.
- `.agents/skills/<name>/SKILL.md` as project skills.

Start a new session after cloning or after creating the first skill/agent directory:

```bash
codex
```

Then verify:

```text
Summarize the project instruction sources you loaded and list the available DrinkSmart skills.
```

Use `/skills` or type `$` to select a skill. Invoke, for example, `$kickoff`, `$handoff`, or
`$skill-writing`. If project config does not load, confirm the repo is trusted and restart Codex from
the repo root.

When this Codex session is a Traycer-launched TUI acting as orchestrator, invoke
`$codex-tui-relay` before kickoff or commissioning GUI agents. The skill creates or resumes the
epic artifact ledger and verifies Oscar's persistent A2A hub according to
`CODEX_TUI_MESSAGE_RELAY.md`. Do not invoke it from Codex GUI or when Codex is an implementation
target.

## Recommended user-level installation

Codex user skills live at `~/.agents/skills/`. Install only the generic workflows that are safe across
repositories:

- `audit-context`
- `handoff`
- `healthcheck`
- `kickoff`
- `skill-writing`
- `speccheck`
- `teacher`
- `writespec`

Before copying, inspect any same-name destination. Do not overwrite it blindly. From the DrinkSmart
root on macOS, Linux, or WSL, an agent may create the user directory and copy a missing package:

```bash
mkdir -p "$HOME/.agents/skills"
cp -R .agents/skills/healthcheck "$HOME/.agents/skills/healthcheck"
```

Repeat for the other names only when the destination is absent or its replacement was reviewed.
Codex detects changes automatically; restart if a skill does not appear.

On Windows PowerShell, use:

```powershell
New-Item -ItemType Directory -Force "$HOME/.agents/skills" | Out-Null
Copy-Item -Recurse ".agents/skills/healthcheck" "$HOME/.agents/skills/healthcheck"
```

Do not install `bench`, `codex-tui-relay`, `make-bench`, `decision-check`, or `update-decisions`
user-wide by default. They rely on project records, Traycer state, or tools. The generic personal
packages inspect a same-name project package and defer to a repository's richer lifecycle contract
when one exists.

## Verification

1. Run `tools/check-agent-setup`.
2. Start a fresh Codex session at the repo root.
3. Invoke `$decision-check` and ask for the deterministic-math decision.
4. Invoke `$healthcheck` with no jobs running; it should report that no current-session background work
   exists and must not invent or start work.
5. Confirm `$writespec` and `$speccheck` appear in `/skills`.
6. Confirm `$codex-tui-relay` appears, and that it declines to activate outside a Traycer Codex TUI
   orchestrator session.

Official references:

- `https://learn.chatgpt.com/docs/agent-configuration/agents-md`
- `https://learn.chatgpt.com/docs/build-skills`
- `https://learn.chatgpt.com/docs/agent-configuration/subagents`
- `https://learn.chatgpt.com/docs/config-file/config-basic`
