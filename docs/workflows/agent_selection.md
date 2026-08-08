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
  --reasoning-effort max --surface gui --cwd <worktree> --permission-mode auto_accept_edits
```

Served by DeepSeek's own API through configured credentials, not the `opencode:*-free` tier — the
free variant may serve a pre-0731 build of V4 Flash. Use for essentially all implementation work,
and spawn several in parallel when the work splits into independent specs.

`--reasoning-effort max` is **required**, not redundant: A/B testing showed that with it the agent
runs at max, and without it at low, on identical `opencode.json`. The config's
`agent.build.variant` does not reach a Traycer-launched agent on its own. Autonomy is the opposite —
that *is* config-driven. See "Permission and effort layers" below.

### 2. GPT-5.6 Luna via codex — escalation only

```
traycer agent create --harness codex --model gpt-5.6-luna \
  --reasoning-effort max --surface gui --cwd <worktree> --permission-mode auto_accept_edits
```

Billed against the ChatGPT Plus subscription. Two triggers, and only these:

| Trigger | Why |
| --- | --- |
| **Visual input** — screenshots, design comparison, mockups, rendered output | DeepSeek cannot ingest images at all. A hard capability gap, not a quality preference. |
| **Spatial reasoning** — layout, geometry, coordinate systems, canvas/SVG, visual diffing | Third-party testing shows DeepSeek V4 still trails Luna and comparable models on spatial reasoning in code. |

Keep these distinct. The image gap is binary — Luna or nothing. The spatial gap is a quality
margin. Collapsing them lets "spatial-ish" drift into a habit of reaching for the costlier model.

If neither applies, use DeepSeek.

The repo's `.codex/config.toml` pins `model = "gpt-5.6-sol"` and `model_reasoning_effort = "high"`.
That is deliberate and governs Oscar's own direct codex sessions on this repo. **Traycer-launched
agents must still pass `--model gpt-5.6-luna --reasoning-effort max` explicitly** — do not assume
the repo config supplies them. Codex autonomy is separately covered by
`approvals_reviewer = "auto_review"` in `~/.codex/config.toml`.

## Confirm the agent before dispatching

`traycer agent create` can return `WebSocket frame timed out after 15000ms` and **still create the
agent — with none of the requested flags applied.** It appears in `agent list` and runs normally, on
the wrong provider, model, and variant. It fails open, and nothing downstream reveals it.

So, every time:

1. Confirm `create` returned an agent id cleanly. If it timed out, delete the agent and retry —
   do not dispatch to it.
2. After the first turn, verify what actually ran:
   `opencode session list` → `opencode export <sessionID>`, and check `providerID`, `modelID`,
   `variant`. A correct DeepSeek implementer reads
   `deepseek / deepseek-v4-flash / max`.

Never take the create command or the agent's own self-report as evidence of which model is running.

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

## Permission and effort layers

Three separate layers, frequently confused. They stack; they do not override one another.

| Layer | Set where | Applies to |
| --- | --- | --- |
| Traycer `--permission-mode` | `traycer agent create` | Whether Traycer prompts the **user** to approve the child's actions. Values: `full_access`, `supervised`, `auto_accept_edits`. There is no `auto`. |
| Harness autonomy + effort | `opencode.json` (`agent.build`, `permission`) | The child itself, on **every** surface. |
| Traycer terminal CLI arguments | Traycer Settings ▸ provider selection | **Terminal-interface launches only.** Never reaches a `gui` agent. |

Consequences worth stating plainly:

- The Settings "Terminal interface CLI arguments" field — `--model … --variant max --auto` — is
  appended only when starting an agent on the Terminal interface. Every implementer here is
  `--surface gui`, so **those arguments never apply to a delegated implementer**. Since opencode
  and codex cannot do agent-to-agent messaging on the terminal surface at all, that field is
  irrelevant to delegation and matters only for hand-launched terminal tabs.
- Autonomy comes from `opencode.json`'s `permission` block: `"*": "allow"` with explicit denies.
  That is the config form of `--auto`, and it is surface-independent.
- **Effort comes from `--reasoning-effort` on `create` and nothing else.** Verified by A/B on
  identical config: no flag → GUI reports low; flag → GUI reports max. Keep
  `agent.build.variant: "max"` as a fallback, but never rely on it alone. Note the session export
  reports `variant: max` either way, so it is not a usable effort signal.
- DeepSeek is opencode's **built-in** provider, authenticated by API key via
  `opencode providers login`, so it hits DeepSeek's official endpoint and serves the current
  (0731) build. No custom provider block is needed in `opencode.json`.
- Note opencode's own model syntax uses a **slash** (`deepseek/deepseek-v4-flash`) while Traycer's
  `--model` uses a **colon** (`deepseek:deepseek-v4-flash`). Both are correct in their own place.

**Use `--permission-mode auto_accept_edits` for both implementers.** This is an explicit user
instruction (Oscar, 2026-08-08), which is the sanctioned override to Traycer's `full_access`
default — not an inference from the task or a general safety preference, which remain forbidden
grounds for restricting the mode.

Edits apply without prompting; anything further surfaces for approval. This is workable because
Oscar watches both the orchestrator and the implementer and approves in-session. Be aware of the
tradeoff it buys: an implementer waiting on an unanswered prompt looks identical to one still
working, so a stalled agent is not self-announcing. If delegations are ever run unattended — or
several in parallel with nobody watching — revisit this, because that is the case `full_access`
existed to serve.

Containment does not depend on this setting either way: worktree isolation and the `opencode.json`
deny rules (`git commit`, `git push`, `supabase db push`, `supabase functions deploy`) are enforced
one layer down, in every mode.
