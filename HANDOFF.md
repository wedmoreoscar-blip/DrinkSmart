# Session Handoff / Kickoff — Codex TUI relay ready; DrinkSmart Wave 3 next

Written 2026-08-10 21:01 BST. Normal-mode handoff. The canonical continuation was replaced.

## Outcome of this session

The Codex-TUI-specific messaging adapter is statically implemented and ready for its first live use.
A future Traycer-launched Codex TUI can orchestrate through one persistent passive OpenCode GUI /
DeepSeek receiver instead of losing implementation-agent replies.

The implementation adds the canonical contract at
`docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md`, the repo-local `codex-tui-relay` skill, discovery
and workflow links, locked decisions, and setup validation. It does not change application code.

Static verification completed:

- the official skill validator passed;
- the Codex and Claude skill bodies are byte-identical;
- `tools/check-agent-setup` passed with 13 mirrored skills;
- the setup check was mutation-tested and failed on a deliberately impossible receiver marker;
- the repo agent-selection guide and `~/.traycer/agent-selection-guide.md` are byte-identical;
- `git diff --check` passed.

The live receiver was deliberately not provisioned in this session. Its no-code end-to-end smoke test
is the new Codex TUI's first task.

## Current repository state

- DrinkSmart root checkout is `/home/oscar/DrinkSmart`, branch `main`.
- Before this handoff commit, `main` was `aa6b839`. That commit pins Playwright `1.62.1` and
  its verified `chromium-1234`; 93/93 tests, typecheck and build passed in that provisioning
  session. This handoff does not claim a fresh application baseline.
- Wave 3 engine work W3-A1 and W3-A2 is complete. The remaining implementation tasks are step 6
  notifications and step 8 wind-down.
- Four DrinkSmart worktrees exist. They are clean, but the raw Git inspection shows they are at
  least three commits behind current `main`; two also have historical branch-only commits.
  Never reset or synchronize one until its agent has been identified and Oscar has approved reuse.
- `traycer agent list --json` returned no rows from this TUI, so durable history supplies candidate
  IDs only. The new session must obtain a live Traycer inventory before treating an agent as warm.

The git visualiser remains built and accepted at `/home/oscar/git_visual_system`. Playwright is now
provisioned there too, but its separate Luna visual-check phase remains pending. Oscar's current
direction is to open the next Codex TUI for DrinkSmart Wave 3, so Wave 3 is the canonical next task;
do not silently fold the git-visualiser visual check into this kickoff.

## Required startup sequence

1. From the Traycer-launched Codex TUI in `/home/oscar/DrinkSmart`, invoke
   `$codex-tui-relay` as the first message.
2. Locate or provision exactly one epic-scoped `codex-tui-receiver`, activate it, and complete the
   no-code smoke test in `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md`.
3. Confirm the receiver is OpenCode GUI / DeepSeek V4 Flash / max, stayed passive, changed no files,
   preserved a test message, and has no unread test message after the processed marker.
4. Invoke `$kickoff`; kickoff is read-only.
5. Read the files listed below and inspect current Git, Traycer-agent, and Traycer-worktree state.
6. Before any worktree synchronization, spec, or implementation commission, present Oscar with the
   proposed agent-to-task map, including full names, IDs, harness/model, worktree paths, sync needs,
   and why each model fits. Wait for his confirmation.

## Preliminary Wave 3 roster to verify and present

This is a recommendation, not dispatch authorization:

| Role | Recommended target | Task |
| --- | --- | --- |
| Orchestrator | Current Traycer Codex TUI with `$codex-tui-relay` active | Plan, write specs, poll receiver, answer agents, run `speccheck`, repair, integrate and commit; never implement as a child |
| Inbound receiver | Persistent `codex-tui-receiver`: OpenCode GUI / DeepSeek V4 Flash / max / no worktree | Receive and preserve questions, status, blockers and handbacks only; never implement or decide |
| Step 6 implementer | Warm DrinkSmart DeepSeek candidate `827aef2b-1d5e-463e-ba7e-72295ba3e223`, historically bound to `traycer-w2b-plan-buzz-picker` | Notification scheduling/actions and web reminder behavior; non-visual platform/state work |
| Step 8 implementer | Warm DrinkSmart DeepSeek candidate `2a14d713-f67e-4707-9c27-1606775f00da`, historically bound to `traycer-w2a-bottom-tab-bar` | Wind-down screen from the authoritative text-readable `1f-wind-down.html` and engine summary; this agent was previously earmarked for the task |
| Later visual check | Warm DrinkSmart Luna-0 candidate `da47f88c-30cb-4b0e-ae9a-ac0b4d15ed74`, historically bound to `traycer-w1b-vessel-meter` | Separate final browser/screenshot acceptance under `visual_check.md`; not a writespec implementation and not contacted until the workflow halt plus Oscar's go-ahead |

DeepSeek is recommended for both implementation specs because each has a complete textual authority:
the notification contracts are code/state behavior, and wind-down has literal HTML values plus prose.
Luna is reserved for the later visual-input/spatial acceptance pass. If the live inventory disproves
any candidate identity, compatibility, or health, stop and recommend a fresh GUI agent/worktree
rather than guessing or repurposing by suffix.

## Wave 3 execution after Oscar confirms the roster

- Create two committed `writespec` specs with disjoint file allowlists and live verification
  baselines. Do not quote the stale lint count from `tasks/todo.md`; run it.
- Keep `--expect-reply` on both commissions and append the receiver transport preamble with the
  actual receiver ID. Every implementer sends questions, status, blockers and complete handback
  envelopes to the receiver.
- Synchronize only the approved worktrees by merge, preserve unrelated or historical branch work,
  install only if the lockfile changed, and verify agent model/effort after the first turn.
- The tasks are intended for parallel implementation and batch integration only if the completed
  specs prove their file sets disjoint. Point the git visualiser watcher at
  `/home/oscar/DrinkSmart` if available; it observes but does not govern the work.
- Poll the receiver throughout. Answer each pending message directly to its sender, then append the
  matching `PROCESSED` marker.
- On both handbacks, follow `docs/workflows/delegation.md`: merge to a scratch integration branch,
  run one `speccheck`, repair inline, run one full baseline, fast-forward `main`, synchronize the
  accepted worktrees, and keep agents warm.
- Native iOS/Android notification behavior remains `BLOCKED` without real devices. Do not call web
  fallback, typecheck, or build evidence native verification.
- When Wave 3 implementation is accepted, reach the DrinkSmart final visual-check halt and wait for
  Oscar before contacting Luna-0.

## Read first

1. `AGENTS.md`
2. `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md`
3. `docs/decisions.md`
4. `docs/workflows/agent_selection.md`
5. `docs/workflows/delegation.md`
6. `docs/workflows/verification.md`
7. `tasks/todo.md`
8. `design_handoffs/design_handoff_drinksmart/README.md` and
   `design_handoffs/design_handoff_drinksmart/screens/1f-wind-down.html`

## Explicit exclusions

- Do not push, deploy, migrate a remote database, rotate secrets, or publish a mobile build.
- Do not use Codex TUI or the receiver as an implementation agent.
- Do not commission, reconfigure, or synchronize a warm implementer before showing Oscar the live
  roster and receiving confirmation.
- Do not accept a receiver handback as implementation acceptance; `speccheck` remains mandatory.
- Do not run the pending git-visualiser visual check as an implicit prerequisite for this Wave 3
  kickoff. It remains separately pending unless Oscar directs otherwise.
- Do not contact DrinkSmart Luna-0 for the final visual check until that workflow's explicit halt and
  Oscar's go-ahead.

## PROMPT

```text
Continue DrinkSmart Wave 3 from /home/oscar/DrinkSmart on main.

First, confirm that $codex-tui-relay has already been activated in this new Traycer Codex TUI and
that its persistent codex-tui-receiver passed the no-code smoke test. If it has not, stop Wave 3 and
complete that activation first. Then inventory the live Traycer agents and worktrees.

Before synchronizing a worktree, writing a commission, or delegating anything, tell Oscar exactly
which full agent name/id/model/worktree you recommend for each role and wait for confirmation. The
durable preliminary recommendation is: warm DeepSeek 827aef2b... for step 6 notifications; warm
DeepSeek 2a14d713... for step 8 wind-down; keep warm DrinkSmart Luna-0 da47f88c... for the separate
final visual check. Verify every identity live because the previous TUI could not list agents.

After Oscar confirms, write and commit two writespec specs with disjoint scopes and live baselines,
commission both GUI implementers with --expect-reply plus the receiver transport preamble, and
follow docs/workflows/delegation.md through one batch speccheck, inline repair, one full baseline
and fast-forward integration. Native notification verification stays BLOCKED without real devices.
At the final visual-check stage, halt and wait for Oscar before contacting Luna-0. Never push.
```
