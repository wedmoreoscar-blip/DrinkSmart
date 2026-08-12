# Relay waker

Authoritative reference for the daemon that wakes the Codex TUI A2A hub. `relay-waker/SKILL.md` is a
thin operational wrapper over this file; read this one for anything beyond "is it running".

`CODEX_TUI_MESSAGE_RELAY.md` remains authoritative for the relay itself. The waker changes nothing
about how commands are authored, claimed, or accepted — it only removes Oscar from the middle of the
loop.

## What problem it solves

Codex TUI can **decide** but cannot **act**: Traycer does not let its terminal agent create or message
agents. So Codex appends what it wants to the ledger and the hub, which can act, performs it. That
leaves one gap: **nothing tells the hub the ledger changed.** Agents run only when messaged, so a
human was the thing that noticed.

The daemon is the only component that can close it, because it is the only one that is not an agent.
Every agent is reactive — it exists during a turn, and a turn starts because something messaged it. A
reactive thing cannot notice a file change. An ordinary OS process can, and it can also send. It is a
doorbell: it never interprets, claims, executes, or answers anything.

A skill cannot do this job. A skill is inert text loaded into a turn that is already happening; it
cannot cause a future turn.

## Components

| Component | Kind | Costs credits | Runs when |
| --- | --- | --- | --- |
| Codex TUI orchestrator | Agent (terminal) | Yes | When prompted |
| `codex-tui-a2a-hub` | Agent (OpenCode GUI, DeepSeek V4 Flash) | Yes | Only when messaged |
| `a2a-hub-waker` | Agent, idle after setup | No | Once at creation, then never |
| Relay ledger | Artifact (one markdown file) | No | It is a file |
| `tools/relay-hub-waker` | Background OS process | No | Continuously, once started |
| `tools/waker-daemon-start` | Launcher script | No | When invoked |
| `relay-waker` skill | Instruction text | No | Inside a hub turn |

Two of these mislead:

- **`a2a-hub-waker` wakes nothing.** Traycer refuses any A2A send without a real sender agent id, so
  the daemon needs a name to put on the envelope. That agent never takes a turn and is never
  prompted; only a message's *recipient* is woken and charged. In logs, "the waker" means the daemon.
- **Agents are addressed by name, never by id.** Traycer ids change whenever an agent is recreated, so
  a stored id is a stale id waiting to happen. The daemon resolves both names at launch and
  re-resolves after a failed send, so recreating the hub or the sender heals itself with no edit and
  no restart.

## What happens

1. Codex decides, then appends one command to the ledger. That is the only action it may take.
2. The file's mtime changes. The daemon notices within ~2s.
3. The daemon checks `pending_commands` only. A `claimed` command is in flight; unread messages are
   addressed to Codex. Neither wakes the hub.
4. The daemon sends the hub one message: `Check the relay ledger.` This is where credits start.
5. The hub claims the command, performs the real Traycer operation, and records the result.
6. The implementer replies natively to the hub, which appends it verbatim as `message.received`.
7. Before ending its turn the hub runs the `relay-waker` skill, restarting the daemon if it died.
8. Codex reads the reply when next prompted, decides, and appends the next command.

## Safety properties

- A pending id is pinged **once**. A hub that fails to clear a command is not re-pinged in a loop;
  re-pings need both a new id and the cooldown to have elapsed.
- A ledger that fails validation is logged and **never pinged on** — the hub cannot append to a broken
  ledger, so waking it would only burn a turn.
- Preflight resolves the two agent names and exits. It never reads the ledger and can never send, so
  a name typo cannot cost a turn.
- The pidfile holds an exclusive `flock`; a second instance exits 3 rather than double-pinging.
- The daemon has no judgement and no authority. Decisions stay with Codex; A2A actions stay with the
  hub.

## Bring-up on a live relay

When the hub already exists and has a clean `HUB_READY` transcript, there are two steps.

1. **Create an agent named exactly `a2a-hub-waker`.** Harness, model, directory and permissions are
   all irrelevant — only the name is load-bearing. Send it `do nothing` if the UI requires a first
   message, then leave it idle forever; that one real session sidesteps the untested question of
   whether a never-run agent is accepted as a sender. Do not create a second agent with this name:
   duplicate names break resolution outright.
2. **Start the daemon** from a suitable terminal (see below):

   ```bash
   tools/waker-daemon-start check    # dry run; detects pending work, wakes nothing
   tools/waker-daemon-start start
   tools/waker-daemon-start status   # expect RUNNING plus two RESOLVE lines
   ```

Nothing needs to be told to the hub. Its operating contract already carries the end-of-turn
`relay-waker` step.

Then prove it end to end with smoke-test item 8 in `CODEX_TUI_MESSAGE_RELAY.md`: append a harmless
`command.send` and confirm the hub wakes with nobody prompting it. Until that has been seen once, the
system is verified in parts but not as a whole.

## Bring-up from a fresh start

1. Clone the repository. Copy `docs/workflows/agent_selection.md` to
   `~/.traycer/agent-selection-guide.md`, then run `tools/check-agent-setup` to confirm the package is
   intact.
2. Open a Traycer epic and note its id. **Do not close that tab** — an epic is reachable only through
   an open tab, and there is no epic list or `traycer epic` command to recover it.
3. Create the hub per `CODEX_TUI_HUB_SETUP.md`: name `codex-tui-a2a-hub`, GUI, OpenCode, DeepSeek V4
   Flash, effort `max`, `full_access`, working directory the DrinkSmart root. It must reply exactly
   `HUB_READY` and change nothing.
4. Create `a2a-hub-waker`. Name only.
5. Start Codex TUI and run `$codex-tui-relay`. It creates and validates the ledger and registers the
   hub. Wait for `READY`.
6. Run `tools/waker-daemon-start`.
7. Run the full no-code smoke test in `CODEX_TUI_MESSAGE_RELAY.md`.

Steps 5 and 6 are interchangeable: the daemon tolerates a missing ledger, doing nothing until
`$codex-tui-relay` creates one.

Nothing in `CLAUDE.md`'s environment setup — Supabase keys, anonymous sign-ins, migrations,
`OPENROUTER_API_KEY` — is required. The relay needs Traycer, this repository, and Python 3.

## Which terminal to start it in

`setsid` gives the daemon its own session, so it outlives the terminal, tab, or agent session that
started it. That makes the choice less important than it looks, but four things about that terminal
matter.

| Requirement | Why |
| --- | --- |
| A WSL shell in the distro running Traycer | The CLI, `~/.traycer` and the ledger all live in the WSL filesystem; Windows shells reach none of it |
| The normal user, never `sudo` | Traycer's auth token, the pidfile and the log resolve under `$HOME`; as root it reads a different `~/.traycer` |
| The same machine as the Traycer host | The daemon shells out to the local CLI, and agents are bound to a host id |
| `TRAYCER_EPIC_ID` set to the intended epic | It selects which ledger is watched |

The last decides it in practice. Inside any Traycer agent terminal in the epic it is already set, so
`tools/waker-daemon-start` just works — this is the simplest route. In a plain WSL terminal, export it
first.

Working directory is irrelevant to what the daemon *watches* — the ledger path comes from the epic id,
not from the repo. But the checkout you launch from must actually contain `tools/waker-daemon-start`
and `tools/relay-hub-waker`, which is a real constraint in practice:

- **A stale delegated worktree cannot start the daemon.** Traycer worktrees sit on their own branches
  and fall behind `main` by design, so a worktree created before the waker landed has no waker to run.
  Fast-forward it to `main` first (`git -C <worktree> merge --ff-only main`, only when it is clean and
  `main` is a descendant), or launch from a checkout that has the tools.
- **The main checkout is not a Traycer-managed worktree**, so Traycer's UI labels it `(detached)` — its
  own fallback for an entry with no recorded branch, printed as `entry.branch ?? "(detached)"`. It is
  not a git detached HEAD and nothing is wrong with the repo. Traycer models the main checkout as a
  *workspace path* that worktrees are cut from, not as a worktree, even though git counts it as one.
- **Name resolution needs a Traycer caller identity**, which `traycer agent list` takes from the
  environment and only an agent's own shell inherits. The launcher no longer requires it:
  `tools/traycer-identity` resolves both ids — the epic from Traycer's open-tab state
  (`desktop-windows.json`, authoritative because an epic is reachable only through an open tab), and the
  identity from the agent tiles in that same file (`type` of `terminal-agent` or `chat`), each candidate
  validated against `traycer agent list` before being trusted. Any agent the user owns works as a
  caller. This needs no priming, so it works on a cold machine; `~/.cache/traycer/identity.env` is only
  a fast path, and a cached id for a deleted agent is discarded and rediscovered. A plain terminal has
  no identity of its own, so what this does is borrow the id of an agent you have open — with no agent
  tile open there is no candidate, which is the honest answer rather than a failure. `tools/traycer-identity --check` prints what it
  found. Failing that, `RELAY_WAKER_SENDER_ID=<a2a-hub-waker id>` doubles as the identity, since the
  daemon already acts as that agent when sending.
- **Only an agent's own shell inherits `TRAYCER_EPIC_ID`.** A Traycer **UI terminal tab does not**,
  which is the place a user would try first, so the launcher no longer requires the variable. It takes
  the epic from `TRAYCER_EPIC_ID`, else `RELAY_WAKER_EPIC_ID`, else a second argument
  (`start <epic-id>`), else it discovers the one epic that already holds a relay ledger and says so.
  Discovery is only ambiguous if two epics run the relay, and only unavailable on a brand-new epic
  whose ledger `$codex-tui-relay` has not yet created — both cases print the explicit form to use.

Starting the daemon from an agent terminal belonging to a **different epic** watches a ledger nobody
writes to, and presents as a silent no-op. The launcher prints epic, hub and sender on `start` and
`status` so this is visible rather than mysterious.

## Health and recovery

| Question | Command |
| --- | --- |
| Is it alive? | `tools/waker-daemon-start status` |
| Is detection working? | `tools/waker-daemon-start check` |
| Start / stop / replace | `tools/waker-daemon-start start \| stop \| restart` |

Log lines worth recognising, at `~/.traycer/relay-waker/<epic-id>.log`:

| Line | Meaning |
| --- | --- |
| `RESOLVE` | A name resolved to a current id, at startup or after a failure |
| `WAKE` | The hub was pinged for a pending command |
| `DRYRUN` | What a real run would have sent |
| `WARN ledger not actionable` | The ledger will not validate. Codex's problem; silence is correct |
| `WARN send failed … retrying` | Probably a stale id; one re-resolution follows |
| `ERROR send failed after re-resolution` | The sender is genuinely rejected. Stop; do not restart into it |
| `no agent named …` | That agent does not exist. Create it by name — never substitute another |

Silence usually means nothing is pending, which is the normal state.

## The accepted gap

The system is **self-sustaining but not self-starting.** The daemon's liveness is only observed during
a hub turn, so if it dies while the hub is idle nothing notices and the relay goes quiet.

**Decided 2026-08-11: accepted, not fixed.** A systemd user unit with `Restart=always` would close it,
but the symptom is obvious — Codex has appended something and the hub has not reacted — and recovery
is one manual `Check the relay ledger.` The hub runs its cycle and the `relay-waker` skill restarts
the daemon at the end of that turn. Autonomous again from there.

### What actually kills it

`wsl --shutdown` and reboots, as expected — but the common cause is neither, and it was found the hard
way on 2026-08-11.

**The daemon dies whenever Traycer's host service is reaped.** Anything launched from an agent shell
inherits the cgroup `/user.slice/…/app.slice/ai.traycer.host.service`. `setsid` escapes the *session*,
so the daemon survives its terminal closing — but a new session is still inside that cgroup, and when
the cgroup goes, everything in it goes however well detached. The git visualiser's two servers were
confirmed dead in the same window from the same cause.

Nothing announces it. On 2026-08-11 the daemon woke the hub successfully, died shortly after, and the
next status check reported `STOPPED` — which read as broken tooling rather than a reaped process.

`stderr` is captured to the log, so a crash leaves a traceback; an absent traceback next to a dead
process points at the cgroup rather than a bug.

Escaping it properly means a `systemd --user` unit, which places the daemon in its own cgroup with
`Restart=always` and would also remove the manual-recovery step above. Deliberately not built: judged
more maintenance than the restart is worth. That trade should be revisited if reaping turns out to be
frequent, because it defeats the end-of-turn liveness check — a daemon reaped while the hub is idle is
noticed by nobody.

Starting it twice is harmless.
