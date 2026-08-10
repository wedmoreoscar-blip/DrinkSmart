# Running the git visualiser against DrinkSmart

Live, read-only view of this repository's graph: commits, branches, HEAD, worktrees, and which
agent owns which worktree. Useful during a delegation wave — the `integration` branch appears,
worktree branches merge into it, `main` fast-forwards, the branch vanishes.

The tool lives in `/home/oscar/git_visual_system`. It only ever reads this repository.

## Start it

Two servers, both from the repository root — **not from a worktree**:

```bash
cd /home/oscar/git_visual_system
tools/agent-lock watcher    -- npm run serve -- /home/oscar/DrinkSmart   # :5174
tools/agent-lock dev-server -- npm run dev                               # :5173
```

Then open **http://localhost:5173**.

Run each in its own terminal, or background them — they are long-lived and stop when their process
does.

## Why it is shaped like this

- **Two servers, not one.** The watcher (`server/`) shells out to git plumbing and publishes state
  over `/api`; the renderer (`src/`) draws it and never touches git. Neither alone shows anything
  useful — a renderer with a dead `/api/stream` is exercising its own reconnect path. Vite proxies
  `/api` to `:5174` so the browser sees one origin.
- **Separate lock scopes.** `watcher` and `dev-server` are distinct because one `flock` is
  exclusive; sharing a scope makes the second server exit 75 instead of starting.
- **Root, not a worktree.** Vite serves whichever tree it was started from. Starting it in a
  worktree while editing the root produces a stale page and a green result that means nothing.

## Checks if it looks wrong

```bash
curl -s localhost:5174/api/state | head -c 200   # watcher alive?
curl -s localhost:5173/api/state | head -c 200   # proxy alive? (should match)
```

- **Graph frozen / never updates** — the watcher tracks `.git` with an inode-bound `fs.watch`. If
  the directory it was watching was deleted and recreated, the handle is dead and Linux reports it
  as `IN_IGNORED` rather than an error, so nothing is logged. Restart the watcher.
- **Every worktree says "unowned"** — `traycer agent list` failed or was slow. Ownership is cached
  and refreshes in the background, so it should fill in; a warning is printed on stderr.
- **Only old commits visible** — the view follows the newest end of the graph, but only while you
  are already near it. Scroll right to resume following.
