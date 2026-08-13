# Screenshot archive

Captures of the app **as actually rendered**, taken during visual checks
(`docs/workflows/visual_check.md`). The drawings in `design_handoffs/design_handoff_drinksmart_wave5/screens/` are what
the app should look like; these are what it does look like.

## Two kinds of capture, and only one is committed

| | Milestone | Working |
| --- | --- | --- |
| Purpose | The visual evolution record | Iteration and agent-to-agent sharing during a check |
| Lives in | `<screen>/` | `<screen>/work/` |
| Committed | **Yes** | **No** — gitignored |
| Volume | One per drawn screen per wave | As many as the phase needs |
| Lifetime | Permanent | Deleted with the phase |

The split exists because these two goals conflict. A history needs images that persist; a working
loop produces dozens of near-identical captures that would become permanent repository weight for
no lasting value. Committing everything would give an unusable history and a bloated repo;
ignoring everything would leave no history at all.

Judgement for the milestone set: **one capture per drawn screen per wave, taken after the wave's
visual check passed.** That is the "after" state worth keeping. If a screen changed materially
mid-wave and the intermediate state is genuinely instructive, keep that too — but the default is
one.

## Layout

```
docs/visual/screenshots/
  README.md
  <screen>/            one directory per drawn screen: plan, timeline, wind-down,
    notes.md           primitives, tab-bar, notification, …
    <capture>.png      milestone captures, committed
    work/              working captures, gitignored
```

Create a screen directory only when there is something to put in it, and only for screens that
have a drawing — see `03-design-requests.md`. A screen with no drawing cannot be visually checked,
so it has nothing to archive.

## Naming

```
<wave>-<agent>-<timestampZ>-<status>.png
```

for example `wave3-luna1-20260809T2140Z-broken.png`. Status is one of `broken`, `suspect`, `ok`.
The convention exists so agents sharing a worktree can reference each other's captures precisely
in A2A messages without ambiguity about who took what, when, or what they thought of it.

Timestamps are UTC and sortable. Keep captures under 5MB — that is the codex image ceiling, and a
capture Luna cannot ingest is useless.

## notes.md

Each screen directory carries a `notes.md`, appended to and never rewritten. One line per capture:

```
- `wave3-luna1-20260809T2140Z-broken.png` — 2026-08-09 21:40Z — primary action is 56px, spec says 64px
- `wave3-luna1-20260809T2205Z-ok.png` — 2026-08-09 22:05Z — fixed, matches 1c
```

Filename, capture time, and what the agent concluded. The status in the filename gives the verdict
at a glance; the note gives the reason, which is what makes the archive readable a wave later.
Append-only, because the value of a history is that earlier entries stay wrong where they were
wrong.
