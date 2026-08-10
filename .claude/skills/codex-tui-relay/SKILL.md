---
name: codex-tui-relay
description: Prepare and operate DrinkSmart's persistent Traycer receiver when a Traycer-launched Codex TUI is acting as orchestrator. Use before that Codex TUI commissions GUI agents, resumes Codex-TUI-orchestrated work, checks for implementation-agent questions or handbacks, or responds through the receiver. Do not use from Codex GUI, Claude Code, OpenCode, or when Codex TUI is not the orchestrator.
---

# Codex TUI receiver adapter

1. Read `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md` completely. It is authoritative for this
   messaging adapter; do not reconstruct the protocol from this skill.
2. Confirm that the current agent is a Traycer-launched Codex TUI orchestrator. Read
   `TRAYCER_AGENT_ID` for the authoritative current-agent identity. If the environment is not Codex
   TUI, or Codex is being considered as an implementation target, stop: Codex implementers use the
   GUI surface and this adapter does not apply.
3. List the epic's agents and locate the single persistent agent named `codex-tui-receiver`.
   Reuse it when its transcript and configuration are healthy. If none exists, create it in the
   DrinkSmart repository context with:

   ```text
   traycer agent create --name codex-tui-receiver --harness opencode \
     --model deepseek:deepseek-v4-flash --reasoning-effort max --surface gui \
     --cwd <DrinkSmart-repository-root> --permission-mode full_access
   ```

   If creation times out, treat the resulting agent as misconfigured and stop for user recovery.
   Do not commission work through an unverified receiver.
4. For a new receiver, send the canonical passive-receiver initialization message from the
   document. After its first turn, verify the actual OpenCode provider, model and effort through the
   harness as required by `docs/workflows/agent_selection.md`. Confirm that the initialization turn
   used no tools and changed no files.
5. For a reused receiver, read its transcript before doing anything else. Match every inbound
   `message_id` to a later processed control marker and identify any pending questions, blockers or
   handbacks. Confirm that the receiver has remained passive.
6. Send the receiver a `[no-spec]` activation control message containing the current
   `TRAYCER_AGENT_ID`. The receiver remains idle outside Codex TUI orchestration and does not decide
   who owns the next turn.
7. Add the canonical communication preamble and receiver ID to every implementation commission.
   Keep `--expect-reply` on the commission. Require the implementer to explicitly run
   `traycer agent send --to <receiver-id>` for every question, status, blocker and handback; the
   native reply thread back to Codex TUI is not a usable inbound channel.
8. While implementation agents are active, poll the one receiver transcript. Answer each pending
   message with a fresh outbound send directly to its `sender_agent_id`, then append the canonical
   processed control marker to the receiver transcript. Never delegate interpretation or decisions
   to the receiver.
9. If the receiver fails, use individual implementation-agent transcripts only as a recovery path,
   provision a verified replacement when necessary, and redirect active agents outbound. Never let
   receiver failure change Git, worktree, specification, review or acceptance rules.

Return the active receiver ID, any pending messages found, and whether receiver creation,
configuration and passive behavior were verified. Do not claim the adapter ready while any of those
checks is unresolved.
