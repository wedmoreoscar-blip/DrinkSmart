# Agent Selection

Canonical source for which agent runs which role. Traycer reads its copy from the machine-global
`~/.traycer/agent-selection-guide.md` (served by `traycer agent selection-guide`); that file is a
mirror of this one. **Edit this file, then copy it across.** `tools/check-agent-setup` reports
drift between the two.

## Orchestrator

Claude Code on **Opus 5** or **Fable 5**, `tui` surface. Plans, writes specs, checks returned
diffs, integrates, and commits. Orchestration, spec authorship, and acceptance are never delegated.

## Implementers

Two options. Default to the first.

### 1. DeepSeek V4 Flash via opencode — the go-to

```
traycer agent create --harness opencode --model deepseek:deepseek-v4-flash \
  --reasoning-effort max --surface gui --cwd <worktree> --permission-mode full_access
```

Served by DeepSeek's own API through configured credentials, not the `opencode:*-free` tier — the
free variant may serve a pre-0731 build of V4 Flash. Max effort and auto mode from the start.
Use for essentially all implementation work, and spawn several in parallel when the work splits
into independent specs.

### 2. GPT-5.6 Luna via codex — escalation only

```
traycer agent create --harness codex --model gpt-5.6-luna \
  --reasoning-effort max --surface gui --cwd <worktree> --permission-mode full_access
```

Billed against the ChatGPT Plus subscription. Two triggers, and only these:

| Trigger | Why |
| --- | --- |
| **Visual input** — screenshots, design comparison, mockups, rendered output | DeepSeek cannot ingest images at all. A hard capability gap, not a quality preference. |
| **Spatial reasoning** — layout, geometry, coordinate systems, canvas/SVG, visual diffing | Third-party testing shows DeepSeek V4 still trails Luna and comparable models on spatial reasoning in code. |

Keep these distinct. The image gap is binary — Luna or nothing. The spatial gap is a quality
margin. Collapsing them lets "spatial-ish" drift into a habit of reaching for the costlier model.

If neither applies, use DeepSeek.

## Surface

Always `--surface gui` for implementers. Agent-to-agent messaging on `--surface tui` is
Claude-Code-only; `codex` and `opencode` both fail `agent.create` with `TARGET_TUI_UNSUPPORTED`.

## Commissioning and acceptance

Commission with a **`writespec`** spec; accept only through **`speccheck`**. See
`docs/decisions.md` (LOCKED — Traycer-orchestrated delegation). A `PreToolUse` hook
(`tools/writespec-guard`) denies non-compliant sends, so commissioning is enforced rather than
advisory.

These override the bundled `traycer-*` delegation skills where they overlap; the `traycer-*`
skills remain authoritative for artifact structure. The spec's `closing.md` block already tells
the child how to verify and report, so do not additionally ask it to run `traycer-implement`.

Keep specs to roughly five clauses. An implementer approaching its context limit means the spec
was oversized — split it rather than resuming the agent.

## Isolation

Every implementer runs in its own worktree from `traycer worktree create`, never the workspace
folder. Delete the worktree after `speccheck` passes and the work is integrated. Note that `gui`
agents release their worktree when idle; `tui` agents pin it until their process exits.

## Permission mode

Use `full_access` unless the user explicitly instructs `supervised` or `auto_accept_edits`; never
infer a more restrictive mode from the task, the parent's mode, or a general safety preference.
