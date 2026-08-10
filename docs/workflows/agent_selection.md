# Agent Selection

Canonical source for which agent runs which role. For *how* a delegation runs end to end —
provisioning, commissioning, review, and integration sequencing — see
`docs/workflows/delegation.md`, which this file defers to on ordering.

Traycer reads its copy from the machine-global
`~/.traycer/agent-selection-guide.md` (served by `traycer agent selection-guide`); that file is a
mirror of this one. **Edit this file, then copy it across.** `tools/check-agent-setup` reports
drift between the two.

## Orchestrator

Claude Code on **Opus 5** or **Fable 5**, `tui` surface, remains the default. It plans, writes specs,
checks returned diffs, integrates, and commits. Orchestration, spec authorship, and acceptance are
never delegated.

Codex TUI is also authorized as orchestrator, but **only while `$codex-tui-relay` is active**. Codex
TUI can commission and send outbound messages but cannot expose implementation-agent replies. The
skill therefore locates or provisions the epic's persistent OpenCode GUI / DeepSeek V4 Flash / max
receiver and makes its transcript the sole usable inbound channel. See
`docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md`.

Codex TUI is never an agent-to-agent implementation target. A Codex implementer always uses the GUI
surface. The persistent receiver is idle whenever Codex TUI is not orchestrating and is reused by a
later Codex TUI orchestrator.

## Implementers

Two options. Default to the first.

### Reuse warm agents before creating anything

A compatible warm implementer with an existing worktree is the default implementation route,
ahead of creating another agent or worktree. This applies even when the model-ranking guidance
below would otherwise start from a fresh DeepSeek agent: retained codebase context and an already
prepared worktree are intentional resources, not leftovers to ignore.

Before every implementation dispatch:

1. List the epic's agents and worktrees. Identify any warm implementer capable of the task and
   inspect, read-only, its harness/model, worktree branch, Git status and distance from the current
   integration target.
2. If a compatible warm agent exists, tell Oscar which agent and worktree would be reused, what
   synchronization or reconfiguration would be needed, and ask whether to reuse it or create an
   isolated agent/worktree instead. **Do not send the spec, reconfigure the agent, stash or alter
   its worktree, or create a replacement until Oscar answers.**

   This gate is deliberate and stays. It is also the largest source of latency in provisioning, so
   make it cheap to answer: present the facts in one block and ask one question, rather than
   opening a discussion.

   ```
   Reuse for <ticket>?
     agent     <id> "<title>" (<harness>/<model>)
     worktree  <name> — clean/dirty, N behind main
     sync      merge only | merge + npm install (lockfile moved) | none
     reconfig  none | <what changes>
   Reuse, or isolated agent/worktree?
   ```

   Everything there is read-only to gather and it is what the decision turns on. If any line would
   read "dirty" or "cannot sync safely", say so and stop — that is a different question and needs
   its own answer.
3. Treat reuse as the recommended/default option, not as pre-authorized action. Oscar may prefer a
   clean agent or separate worktree for isolation, comparison, quota, ownership or any other
   reason; the confirmation gate exists to preserve that choice.
4. After Oscar confirms reuse, preserve any dirty state before safely synchronizing the worktree,
   explicitly configure the required model/effort, then commission through `writespec` as usual.
   If the worktree cannot be synchronized without risking unintegrated work, report that and ask
   again rather than silently replacing or discarding it.
5. Create a new agent/worktree only when no compatible warm route exists or Oscar explicitly
   chooses the isolated route.

When several compatible warm agents exist, use the task/model guidance below to recommend one,
then present that recommendation for confirmation. Warm-agent reuse changes provisioning order; it
does not weaken worktree isolation, model verification, `writespec`, or `speccheck`.

### 1. DeepSeek V4 Flash via opencode — the go-to

```
traycer agent create --harness opencode --model deepseek:deepseek-v4-flash \
  --reasoning-effort max --surface gui --cwd <worktree> --permission-mode full_access
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

The **final visual check** of a redesign wave is Luna's, and it does not run on the delegation
path at all — it has its own workflow in `docs/workflows/visual_check.md`: a halt for Oscar, a
rough blind brief, one shared worktree, several coordinating agents, and self-verification by
screenshot. Do not commission it with a spec.

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
Claude-Code-only; `codex` and `opencode` both fail `agent.create` with `TARGET_TUI_UNSUPPORTED —
harness cannot participate in agent-to-agent messaging`.

Traycer's docs list all three as Terminal-capable, which is not a contradiction: that matrix covers
harnesses backing a **human-driven** terminal session and says nothing about agent-to-agent
messaging. You can launch codex or opencode in a terminal tab yourself; another agent cannot message
one there. Delegation requires the latter, hence `gui`.

This target-side limitation does not prevent Codex TUI from originating commissions. Its authorized
orchestrator route is the receiver adapter above: commissions retain `--expect-reply`, implementers
explicitly send every usable response to the GUI receiver, and Codex TUI reads that one transcript.

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

The receiver route does not make questions part of normal commissioning. Write every spec as though
the implementer cannot ask, then allow genuinely unforeseen questions through the receiver when the
orchestrator is Codex TUI.

## Isolation

Every implementer runs in its own worktree from `traycer worktree create`, never the workspace
folder. Note that `gui` agents release their worktree when idle; `tui` agents pin it until their
process exits.

**Keep the worktree after integration. Do not delete it.** A clean worktree that is level with
`main` is a provisioned asset — dependencies installed, agent context cached — and reusing it is
what makes the warm route above cheap. Deleting it forces a full create/install/configure/verify
cycle for the next delegation, which is the cost the warm-reuse rule exists to avoid. The
precondition for reuse is *clean and current*, not merely *exists*: bring it level with `main` by
merge before the next dispatch, and if it is dirty or cannot be synchronized safely, stop and ask
rather than forcing it.

This supersedes the earlier instruction to delete the worktree once `speccheck` passed, which
contradicted the warm-reuse rule at the top of this file (corrected 2026-08-09).

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

**Use `--permission-mode full_access` for implementers.** This is the default and needs no
justification. Superseded on 2026-08-09 by explicit user instruction; the previous
`auto_accept_edits` default is withdrawn.

The reason it changed is the failure mode `auto_accept_edits` carries: an implementer waiting on
an unanswered prompt looks identical to one still working, so a stalled agent never announces
itself. That is tolerable when one delegation runs under close watch and intolerable when several
run in parallel, which is now the normal case.

Containment does not rest on this setting. Worktree isolation and the `opencode.json` deny rules
(`git commit`, `git push`, `supabase db push`, `supabase functions deploy`) are enforced a layer
down, in every mode.

Never infer a more restrictive mode from the task, the parent agent's mode, or a general safety
preference. Only an explicit user instruction may narrow it.
