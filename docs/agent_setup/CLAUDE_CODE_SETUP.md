# Claude Code Setup

## Project discovery

From the repository root, Claude Code discovers:

- `CLAUDE.md`, which imports the shared `AGENTS.md` and adds DrinkSmart-specific history.
- `.claude/settings.json` as shared project settings.
- `.claude/agents/*.md` as project subagents.
- `.claude/skills/<name>/SKILL.md` as project skills and slash workflows.

Start Claude Code from the repository root:

```bash
claude
```

Run `/context` to confirm `CLAUDE.md` loaded. Ask Claude to list project skills and subagents, then
invoke `/decision-check` or `/kickoff`. Restart after cloning if the first session began before the
`.claude/skills` or `.claude/agents` directories existed.

Keep personal approvals in `.claude/settings.local.json`; it is ignored and must not be copied to the
other machine.

## Recommended user-level installation

Claude Code user skills live at `~/.claude/skills/`. Install only the generic workflows that are safe
across repositories:

- `audit-context`
- `handoff`
- `healthcheck`
- `kickoff`
- `skill-writing`
- `teacher`

Personal Claude skills take precedence over same-name project skills. Inspect any destination first
and never overwrite it blindly. From the DrinkSmart root on macOS, Linux, or WSL:

```bash
mkdir -p "$HOME/.claude/skills"
cp -R .claude/skills/healthcheck "$HOME/.claude/skills/healthcheck"
```

Repeat for the other five names only when the destination is missing or its replacement was explicitly
reviewed. On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$HOME/.claude/skills" | Out-Null
Copy-Item -Recurse ".claude/skills/healthcheck" "$HOME/.claude/skills/healthcheck"
```

Do not install benchmark, decisions-ledger, or routing skills user-wide by default. The generic
personal packages first inspect a same-name project package and follow the repository's own lifecycle
contract. A current `legal-graph-db-rag` clone still carries the richer supporting files they defer to.

## Verification

1. Run `tools/check-agent-setup`.
2. Start a fresh Claude Code session and run `/context`.
3. Invoke `/decision-check` and ask for the deterministic-math decision.
4. Invoke `/healthcheck` with no jobs running; it should not invent or start work.
5. Run `/agents` and confirm `implementer`, `mechanical-worker`, and `reviewer` are available.

Official references:

- `https://code.claude.com/docs/en/memory`
- `https://code.claude.com/docs/en/slash-commands`
- `https://code.claude.com/docs/en/sub-agents`
- `https://code.claude.com/docs/en/settings`
