# W5-1 — Plan generation stays in Plan and opens curation

## Assignment

Implement in `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0`.
The orchestrator already synchronized this worktree to `main`; dependencies are provisioned.

## Allowed files

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/tabs/PlanTab.tsx`

No other file may be modified.

## Verification baseline

- `npm test`: PASS — 14 test files, 131 tests.
- `npm run typecheck`: PASS, zero errors
- `npm run lint`: known FAIL — 11 errors and 10 warnings. Preserve that exact ceiling; introduce no new findings.
- `npm run build`: PASS (Vite production build; existing large-chunk and stale Browserslist warnings only).
- `git diff --check`: clean

## Requirements

1. Replace the current generate-then-navigate behavior with generation in place. A successful first
   press applies the generated list, keeps the Plan tab active, marks the curation region built, and
   scrolls the embedded picker/tray into view after React has rendered it. Do not call `onPlanReady`
   from generation or regeneration. The existing deterministic target computation and generated
   drink conversion remain unchanged.
2. Present one generation operation under two labels: `Build the night` before the first applied
   plan and `Regenerate` afterwards. Reuse one handler/code path rather than retaining separate
   generation functions or a second Regenerate button. First generation may use a matching cached
   preload; later generation excludes `lastPlanIds`. Both preserve locked drinks and generate only
   the remaining target budget, retaining existing fallback behavior.
3. Pass `planBuilt` to the embedded `DrinksTab`, true after a generated plan is applied or when a
   non-empty existing plan is already present. Extend `PlanTabProps` with
   `swapDrinkId?: string | null` and `onSwapComplete?: () => void`, and pass both through to
   `DrinksTab`; these are the agreed W5-3/Dashboard integration boundary. Do not implement swap logic
   in this file.
4. Keep the four-band target meter static. It may respond to band, duration and user metrics, but
   must not respond to selected drinks. Remove any selected-drink over-target colour/copy from this
   target object. Do not alter BAC, body-water, ethanol or pacing formulas.
5. Only the embedded tray's existing `Done` callback calls `onPlanReady` and advances to Timeline.
   The directly tappable Timeline tab remains ungated. Preserve the Plan/picker one-scroll-surface
   composition and all unrelated venue/scanner navigation.

## What you run, and what you do not

Run exactly these two, from the root of your worktree:

- `npm run typecheck` — the one check that catches your own errors before handback.
- `npx vitest run` — cheap, and confirms you broke nothing that already worked.

**Do not run `npm run lint` or `npm run build`.** They belong to the checker, who runs the full
baseline on the integration branch after review. They are the two most expensive commands in this
repository and the least informative to you: lint is known-failing at a fixed count you cannot
improve, and build tells you nothing typecheck did not. Several implementers run in parallel on a
2-core machine, so an unnecessary build starves every other agent and yourself.

Do not run `npm install` or `npm ci`. Your worktree is already provisioned.
Do not run `git commit`, `git push`, or any `supabase` command. Leave your work uncommitted; the
orchestrator commits the handback.

If a command is still running when you have everything you need, stop it and report. A result you
are waiting on is not worth more than the report.

Browser, Supabase, edge-function, notification and native/Capacitor checks are BLOCKED: that
infrastructure is not available to you. Do not attempt them, and never claim them.

Change only what is required. Do not refactor, rename, reformat, add error
handling, or improve anything you were not asked to change, even if it
looks wrong. Modify only the files named above. If you believe another file
must change, stop and report it instead.

Before reporting back:
- Re-read the spec clause by clause. For each clause, point at the specific
  change that satisfies it. If any clause has no corresponding change,
  you are not finished.
- Run the code. It must execute without syntax or import errors.
- Run the existing test suite. It must pass exactly as it did before.
- Do NOT write new tests. Do NOT modify existing tests. Verification of
  new behaviour is not your job.
- Report what you changed, which clause each change maps to, and anything
  you were unsure about.

## Communication route — transport only

Your assigning agent is the DeepSeek A2A hub
`940a15e0-682c-4a16-807d-82f4a6bfc090`, acting for Codex TUI on ticket `W5-1`. Send every
substantive question, blocker, status update and final handback with
`traycer agent send --to 940a15e0-682c-4a16-807d-82f4a6bfc090`. Include the ticket ID, your full
Traycer agent ID, a unique monotonic message ID, the kind
(`QUESTION | BLOCKER | STATUS | HANDBACK`), whether a reply is needed, and the complete message body.

The hub records messages but does not answer or make decisions; the Codex orchestrator will send
any necessary response back through it. Continue safe independent work while waiting. Do not
weaken or reinterpret the specification because this route exists.
