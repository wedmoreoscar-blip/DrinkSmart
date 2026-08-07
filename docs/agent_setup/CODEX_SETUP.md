# Codex Setup

## Project discovery

From the repository root, Codex discovers:

- `AGENTS.md` as durable project guidance.
- `.codex/config.toml` as trusted-project settings.
- `.codex/agents/*.toml` as project custom agents.
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

## Recommended user-level installation

Codex user skills live at `~/.agents/skills/`. Install only the generic workflows that are safe across
repositories:

- `audit-context`
- `handoff`
- `healthcheck`
- `kickoff`
- `skill-writing`
- `teacher`

Before copying, inspect any same-name destination. Do not overwrite it blindly. From the DrinkSmart
root on macOS, Linux, or WSL, an agent may create the user directory and copy a missing package:

```bash
mkdir -p "$HOME/.agents/skills"
cp -R .agents/skills/healthcheck "$HOME/.agents/skills/healthcheck"
```

Repeat for the other five names only when the destination is absent or its replacement was reviewed.
Codex detects changes automatically; restart if a skill does not appear.

On Windows PowerShell, use:

```powershell
New-Item -ItemType Directory -Force "$HOME/.agents/skills" | Out-Null
Copy-Item -Recurse ".agents/skills/healthcheck" "$HOME/.agents/skills/healthcheck"
```

Do not install `bench`, `make-bench`, `decision-check`, `route`, `unroute`, or `update-decisions`
user-wide by default. They rely on project records and tools. The generic personal packages inspect
a same-name project package and defer to a repository's richer lifecycle contract when one exists.

## Verification

1. Run `tools/check-agent-setup`.
2. Start a fresh Codex session at the repo root.
3. Invoke `$decision-check` and ask for the deterministic-math decision.
4. Invoke `$healthcheck` with no jobs running; it should report that no current-session background work
   exists and must not invent or start work.
5. Ask Codex to name the `implementer`, `mechanical-worker`, and `reviewer` custom agents.

Official references:

- `https://learn.chatgpt.com/docs/agent-configuration/agents-md`
- `https://learn.chatgpt.com/docs/build-skills`
- `https://learn.chatgpt.com/docs/agent-configuration/subagents`
- `https://learn.chatgpt.com/docs/config-file/config-basic`
