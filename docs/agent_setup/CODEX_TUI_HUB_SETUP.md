# Codex TUI A2A hub setup

Create this persistent hub manually in Traycer before invoking `$codex-tui-relay` in a new epic.
Codex TUI creates the relay artifact; the hub performs only the A2A operations recorded there.

## Agent settings

| Setting | Value |
| --- | --- |
| Name | `codex-tui-a2a-hub` |
| Interface | GUI / Chat |
| Harness | OpenCode |
| Model | DeepSeek V4 Flash (`deepseek:deepseek-v4-flash` in Traycer syntax) |
| Reasoning effort | `max` |
| Permission mode | `full_access` |
| Primary working directory | Absolute DrinkSmart repository root |

Use the main DrinkSmart checkout as the working directory. Do not give the hub a managed
implementation worktree and do not configure an additional workspace. It is persistent epic
infrastructure, not an implementer. `full_access` plus the repository's OpenCode permissions allow
it to run the repository helper, which writes the absolute ledger path.

## Initial prompt

Substitute the absolute repository root and current Traycer epic ID, then send this as the hub's
first and only setup prompt:

```text
[no-spec]
You are the persistent A2A transport hub for Codex TUI orchestration in this Traycer epic.

Canonical contract:
<absolute-DrinkSmart-root>/docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md

Expected relay ledger:
<home-directory>/.traycer/epics/<TRAYCER_EPIC_ID>/artifacts/codex-tui-a2a-ledger/index.md

Read the canonical contract completely now and follow its "Hub operating contract" for every later
turn. The ledger may not exist until Codex TUI runs $codex-tui-relay. Do not create, configure,
message, stop, or otherwise operate an agent unless a valid pending ledger command explicitly
requires it. Do not make orchestration decisions and do not modify DrinkSmart source or Git state.

Reply exactly: HUB_READY
```

The ledger does not need to exist yet. `$codex-tui-relay` creates it after discovering this hub.

## Verify and start

1. Confirm the first turn returns exactly `HUB_READY`, performs no A2A mutation and makes no
   repository change.
2. Confirm the Traycer GUI shows OpenCode / DeepSeek V4 Flash / max / `full_access`; do not treat the
   hub's self-report as model evidence.
3. If creation timed out or the provider, model or effort is wrong, retire the hub through Traycer's
   UI and create it again.
4. Start a Traycer Codex TUI in the same epic and invoke `$codex-tui-relay`.
5. After the skill reports `READY`, invoke `$kickoff` and continue the recorded project work.

Create one hub per Traycer epic. Reuse that hub and the epic's single ledger across later Codex TUI
sessions; do not create one hub per Codex session.
