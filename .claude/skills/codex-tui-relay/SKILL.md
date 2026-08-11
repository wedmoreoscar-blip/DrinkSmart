---
name: codex-tui-relay
description: Activate or resume DrinkSmart's artifact-ledger A2A hub when a Traycer-launched Codex TUI is the orchestrator. Use at the start of Codex TUI orchestration before kickoff or GUI-agent delegation, and before checking or answering implementation-agent messages. Do not use from Codex GUI, Claude Code, OpenCode, or when Codex TUI is an implementation target.
---

# Codex TUI artifact relay

## The system, and where each part is documented

Traycer does not let a terminal agent create or message agents. So Codex TUI **decides** and a GUI hub
**acts**, bridged by one append-only artifact that works like a mailbox. Five parts, all documented in
this repository — nothing needed here lives only on one machine, so a clone carries the whole system:

| Part | Role | Authority |
| --- | --- | --- |
| Codex TUI orchestrator | Decides everything; appends commands. Never an A2A sender. | this skill, then the contract |
| Relay ledger (Traycer artifact) | The mailbox. Codex writes commands; the hub writes receipts and inbound messages. | `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md` |
| `codex-tui-a2a-hub` (OpenCode GUI) | Commissions implementers and receives their replies. Transport only. | `docs/agent_setup/CODEX_TUI_HUB_SETUP.md` |
| `tools/relay-hub-waker` daemon | Watches the ledger and wakes the hub when a command is pending. Not an agent. | `docs/agent_setup/RELAY_WAKER.md` |
| `a2a-hub-waker` (idle agent) | Exists only so the daemon has a real sender id for its send. Never prompted, never runs. | `docs/agent_setup/RELAY_WAKER.md` |

Read `CODEX_TUI_MESSAGE_RELAY.md` completely — it is authoritative for relay operation. Read
`RELAY_WAKER.md` for the daemon, the sender identity, terminal rules and bring-up. Read
`CODEX_TUI_HUB_SETUP.md` for hub verification or whenever the hub is absent, ambiguous or
misconfigured. Keep this skill thin; do not reconstruct any of them.

Manual, user-only setup is three things — hub agent, `a2a-hub-waker` agent, daemon — and it is
enumerated in `RELAY_WAKER.md`. Codex can create none of them and must hand them back.

## Procedure

1. Confirm the session is a Traycer-launched Codex TUI orchestrator. Require non-empty
   `TRAYCER_AGENT_ID` and `TRAYCER_EPIC_ID`; treat those values as authoritative. Decline outside
   Codex TUI or when Codex is an implementation target.
2. Use `tools/codex-tui-relay-ledger path --epic-id <TRAYCER_EPIC_ID>` to derive the one ledger path.
   Run `init`, then `validate`; Codex TUI owns creation of the artifact.
3. List the epic's agents read-only and locate exactly one manually created GUI agent named
   `codex-tui-a2a-hub`. Never create, configure, send to, or impersonate the hub from Codex TUI.
   If it is missing or ambiguous, stop and return the one-time settings and clean initialization
   prompt from `CODEX_TUI_HUB_SETUP.md`, with absolute repository, artifact and ledger paths.
4. Confirm the hub is OpenCode GUI / DeepSeek V4 Flash / max / `full_access` in the DrinkSmart root
   and has a clean `HUB_READY` initialization transcript. Do not trust the hub's self-report as
   provider/model evidence. If any check is unresolved, report not ready.
5. If the real hub ID has not been registered, append one `agent.registered` event with actor
   `codex:<TRAYCER_AGENT_ID>` and its verified identity/configuration. Do not wake an idle hub merely
   for activation.
6. Check the waker with `tools/waker-daemon-start status`. Without it the hub is never woken and every
   queued command waits on the user.
   - If it is `STOPPED`, ask the user to confirm that agents named `codex-tui-a2a-hub` and
     `a2a-hub-waker` exist, then **start it yourself: `tools/waker-daemon-start start`.** This is the
     normal route. Codex TUI is an agent shell, so it already holds both the epic id and the caller
     identity that name resolution needs, and no id has to be typed. Report `RUNNING` and the pid.
   - Launching the daemon is not an A2A action and does not make Codex a sender: the daemon overrides
     the sender identity to `a2a-hub-waker` for every wake it sends.
   - Codex must still never create the `a2a-hub-waker` or hub agent, and never substitute another
     agent as sender. If either is missing, return the bring-up steps from `RELAY_WAKER.md` and stop.
7. Run `tools/codex-tui-relay-ledger state`. Read any referenced unread message blocks in full;
   inspect implementation-agent transcripts read-only whenever useful. Report the ledger path, hub
   ID, waker status, pending/claimed/ambiguous commands and unread messages.
8. For later commissions or replies, make every orchestration decision and satisfy all normal
   workflow gates first, then append the exact `command.spawn`, `command.reuse`, or `command.send`.
   Add the canonical hub routing preamble to commissions. Never call a mutating Traycer agent command
   from Codex TUI. With the daemon running the append itself wakes the hub; otherwise tell the user
   which event was queued and ask them to prompt the hub: `Check the relay ledger.`
9. After the hub runs, validate and scan again. Codex decides whether an inbound message needs a
   reply: append `command.send --in-reply-to <event-id>` when it does, or `message.processed` when it
   does not. DeepSeek transports; Codex interprets, reviews and accepts.

Return `READY` only with the exact ledger path, verified hub ID, waker status and summarized
unresolved state. When ready, continue directly into the user's requested workflow, including
`$kickoff`.
