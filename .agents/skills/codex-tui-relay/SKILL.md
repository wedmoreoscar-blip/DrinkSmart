---
name: codex-tui-relay
description: Activate or resume DrinkSmart's artifact-ledger A2A hub when a Traycer-launched Codex TUI is the orchestrator. Use at the start of Codex TUI orchestration before kickoff or GUI-agent delegation, and before checking or answering implementation-agent messages. Do not use from Codex GUI, Claude Code, OpenCode, or when Codex TUI is an implementation target.
---

# Codex TUI artifact relay

1. Read `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md` completely. It is authoritative for relay
   operation. Read `docs/agent_setup/CODEX_TUI_HUB_SETUP.md` for hub verification or whenever the
   hub is absent, ambiguous or misconfigured. Keep this skill thin; do not reconstruct either file.
2. Confirm the session is a Traycer-launched Codex TUI orchestrator. Require non-empty
   `TRAYCER_AGENT_ID` and `TRAYCER_EPIC_ID`; treat those values as authoritative. Decline outside
   Codex TUI or when Codex is an implementation target.
3. Use `tools/codex-tui-relay-ledger path --epic-id <TRAYCER_EPIC_ID>` to derive the one ledger path.
   Run `init`, then `validate`; Codex TUI owns creation of the artifact.
4. List the epic's agents read-only and locate exactly one manually created GUI agent named
   `codex-tui-a2a-hub`. Never create, configure, send to, or impersonate the hub from Codex TUI.
   If it is missing or ambiguous, stop and return the one-time settings and clean initialization
   prompt from `CODEX_TUI_HUB_SETUP.md`, with absolute repository, artifact and ledger paths.
5. Confirm the hub is OpenCode GUI / DeepSeek V4 Flash / max / `full_access` in the DrinkSmart root
   and has a clean `HUB_READY` initialization transcript. Do not trust the hub's self-report as
   provider/model evidence. If any check is unresolved, report not ready.
6. If the real hub ID has not been registered, append one `agent.registered` event with actor
   `codex:<TRAYCER_AGENT_ID>` and its verified identity/configuration. Do not wake an idle hub merely
   for activation.
7. Run `tools/codex-tui-relay-ledger state`. Read any referenced unread message blocks in full;
   inspect implementation-agent transcripts read-only whenever useful. Report the ledger path, hub
   ID, pending/claimed/ambiguous commands and unread messages.
8. For later commissions or replies, make every orchestration decision and satisfy all normal
   workflow gates first, then append the exact `command.spawn`, `command.reuse`, or `command.send`.
   Add the canonical hub routing preamble to commissions. Never call a mutating Traycer agent command
   from Codex TUI. Tell the user which event was queued and ask them to prompt the hub:
   `Check the relay ledger.`
9. After the hub runs, validate and scan again. Codex decides whether an inbound message needs a
   reply: append `command.send --in-reply-to <event-id>` when it does, or `message.processed` when it
   does not. DeepSeek transports; Codex interprets, reviews and accepts.

Return `READY` only with the exact ledger path, verified hub ID and summarized unresolved state.
When ready, continue directly into the user's requested workflow, including `$kickoff`.
