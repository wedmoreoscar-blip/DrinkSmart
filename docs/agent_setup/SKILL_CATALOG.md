# Custom Skill Catalog

The table inventories every user-authored editable workflow found on the source machine and adapted
into this repository. Vendor-bundled skills such as client `doctor`, `code-review`, image, or official
documentation helpers are installed by their client and are not copied here.

| Skill | Origin on source machine | Portable scope | Required project support |
|---|---|---|---|
| `audit-context` | legal repo | Safe personal or project | `docs/workflows/context_audit.md` for project mode |
| `bench` | legal repo | Project | Benchmark convention and resource lock |
| `codex-tui-relay` | DrinkSmart | Project; activates only in Traycer Codex TUI | `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md` and a Traycer epic |
| `decision-check` | legal repo | Project | `docs/decisions.md` |
| `handoff` | legal repo | Safe personal or project | Defers to repo lifecycle; otherwise writes a minimal root handoff |
| `healthcheck` | `~/.claude/commands/healthcheck.md` | Safe personal or project | None; current-session jobs only |
| `kickoff` | legal repo | Safe personal or project | Discovers the repo's continuation source |
| `make-bench` | legal repo | Project | benchmark convention and safety contract |
| `relay-waker` | DrinkSmart | Project; used in practice only by the Codex TUI relay hub | `docs/agent_setup/RELAY_WAKER.md`, `tools/waker-daemon-start`, and a Traycer epic |
| `skill-writing` | `~/.claude/skills/skill-writing/SKILL.md` | Safe personal or project | portable authoring contract; client creator recommended |
| `speccheck` | `~/.claude/skills/speccheck/SKILL.md` | Safe personal or project | The commissioning spec and the delegated diff |
| `teacher` | legal repo | Safe personal or project | Current code or subject material |
| `update-decisions` | legal repo | Project | decision ledger |
| `writespec` | `~/.claude/skills/writespec/SKILL.md` | Safe personal or project | `blocks/` fixed scope and closing blocks shipped with the skill |

## Invocation

| Client | Explicit syntax | Project source | Personal source |
|---|---|---|---|
| Codex | `$skill-name` or `/skills` | `.agents/skills/` | `~/.agents/skills/` |
| Claude Code | `/skill-name` | `.claude/skills/` | `~/.claude/skills/` |
| opencode | skill tool by name (no prefix) | `.agents/skills/` + `.claude/skills/` via `opencode.json` | `~/.agents/skills/` + `~/.claude/skills/` via `~/.config/opencode/opencode.jsonc` |

The project copies deliberately share portable frontmatter and instruction bodies. Codex-only
`agents/openai.yaml` files add interface metadata without changing behavior. The mirrored
`codex-tui-relay` package remains inert in Claude and OpenCode because its trigger explicitly
requires a Traycer Codex TUI orchestrator. `relay-waker` is mirrored to all three clients for parity
but is invoked in practice only by the relay's OpenCode hub at the end of each cycle.

## Precedence warning

Do not assume project and personal skills with the same name merge. Claude Code gives a personal
skill precedence over a project skill. Codex may expose both rather than merge them. The six generic
packages therefore inspect and apply additional rules from a same-name project package before running
their portable fallback. `writespec` and `speccheck` have no such deference clause; keep their
personal and project copies byte-identical instead. Even with that safeguard:

- install only the eight generic skills user-wide;
- keep decisions and benchmarking project-local;
- preserve and review the target repository's own same-name skill because it remains the project
  extension;
- compare before replacing an existing package.

For `legal-graph-db-rag`, clone the current repository and use its project-local versions. They encode
legal-repo benchmark paths, resource locks, decisions, and handoff authority that a generic personal
copy cannot reproduce safely.
