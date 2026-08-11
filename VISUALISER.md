# Running the git visualiser against DrinkSmart

Live, read-only view of this repository's graph: commits, branches, HEAD, worktrees, and which agent
owns which worktree. Useful during a delegation wave — the `integration` branch appears, worktree
branches merge into it, `main` fast-forwards, the branch vanishes.

The tool lives in `/home/oscar/git_visual_system` and only ever reads this repository.

## Start it

One command, from the tool's root — **never from a worktree**:

```bash
cd /home/oscar/git_visual_system
tools/watch-repo /home/oscar/DrinkSmart          # add --force to replace what is running
```

Open **http://localhost:5173**. It starts both halves detached, and reports how many worktrees it
attributed:

```
watch-repo: ownership OK, 5/5 worktrees attributed
```

**Do not start the two servers by hand.** Started that way they die with the launching session, and the
watcher cannot read agent ownership at all — it draws every worktree as unowned. `tools/watch-repo`
prevents both.

Quick liveness check — all three must be `200`:

```bash
curl -sf -o /dev/null -w "watcher %{http_code}\n" localhost:5174/api/state
curl -sf -o /dev/null -w "vite    %{http_code}\n" localhost:5173/
curl -sf -o /dev/null -w "proxy   %{http_code}\n" localhost:5173/api/state
```

## Everything else

**`/home/oscar/git_visual_system/docs/RUNNING.md`** is authoritative for the tool: its architecture,
why `watch-repo` exists, the renderer-versus-watcher restart rule, ten named troubleshooting cases, and
how to read every mark on screen. It lives beside the code it describes, so it stays correct when that
code changes.

Two DrinkSmart-specific notes worth having here:

- **Worktree cards name the directory; the graph names the branch**, and the two can differ. DrinkSmart's
  `traycer-w1b-vessel-meter` carried the branch `traycer/visual-check` for a while, which reads as a
  mismatch and is not one.
- **A primary checkout shows several agents on one card** — an orchestrator, the relay hub, another
  session — whereas a delegated worktree normally shows one.
