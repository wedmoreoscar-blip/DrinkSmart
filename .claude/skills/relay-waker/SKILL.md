---
name: relay-waker
description: Check that the Codex TUI relay waker daemon is running and restart it if it has died, so the A2A hub is woken automatically when the ledger gains pending commands. Use at the end of a hub turn, when relay commands appear to be going unanswered, or when asked whether the waker is alive. Do not use to execute, interpret, or answer ledger commands.
---

# Relay waker check

One pass. Verify the daemon is alive, restart it if not, report one line. This is a health check on the
doorbell, not a ledger operation and not a replacement for the hub's operating contract.

`docs/agent_setup/RELAY_WAKER.md` is authoritative for the design, bring-up, terminal rules and log
meanings. Read it whenever the answer is not "it is running". Keep this skill thin; do not reconstruct
it here.

Drive the daemon through `tools/waker-daemon-start`, never by hand — it owns the pidfile, log path,
detachment and preflight. No agent id belongs in any command you write: the daemon resolves the hub
and sender by name.

1. Run `tools/waker-daemon-start status`.
2. If `RUNNING`, report one line — pid plus the last log line — and stop.
3. If `STOPPED`, run `tools/waker-daemon-start start` and report the result. `start` is idempotent and
   preflights both agent names without reading the ledger, so it cannot cost a turn.
4. Scan the log tail for `ERROR` and stop rather than restarting into a known failure.
5. Report the diagnosis and any recovery in one or two lines.

Three refusals matter more than anything above, because each one is a plausible-looking action that
breaks the relay:

- **Never create a missing agent.** If preflight reports `no agent named ...`, report exactly which
  name failed and stop. Creating a second agent with that name breaks resolution outright and the
  daemon can no longer send at all.
- **Never substitute a different sender.** It must not be the Codex TUI orchestrator, which is never
  an A2A sender, nor the hub itself.
- **Never restart after `send failed after re-resolution`.** The sender is genuinely rejected; a
  restart repeats the failure. Report it.

`ledger not actionable` is not your problem to fix — the ledger will not validate, that belongs to
Codex, and the waker is correct to stay quiet. Silence generally means nothing is pending.
