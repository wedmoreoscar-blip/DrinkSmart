# W5-7 — Account session history and reusable plan snapshots

## Assignment

Implement in `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0`.
The orchestrator has synchronized this warm worktree to `main` commit `a4d7939`; dependencies are
provisioned, the ignored root `.env` is linked for local tooling, and `package-lock.json` did not
change.

## Allowed files

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/supabase/migrations/20260815000000_user_session_history.sql` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/integrations/supabase/types.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/hooks/useLastSession.ts` (replace/delete as needed)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/hooks/useSessionHistory.ts` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/contexts/AppContext.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/tabs/PlanTab.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/tabs/TimelineTab.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/tabs/WindDownScreen.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/profile/SessionHistory.tsx` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/pages/Profile.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/pages/Dashboard.tsx`

No test file is in the allowlist: the independent checker writes acceptance tests after handback.
No other file may be modified.

## Verification baseline

- `npm test`: PASS — 26 test files, 165 tests.
- `npm run typecheck`: PASS — zero errors.
- `npm run lint`: known FAIL — exactly 11 errors and 12 warnings (23 problems). Preserve that exact
  ceiling and introduce no new finding.
- `npm run build`: PASS — Vite built 2,219 modules in 35.27s (36.81s wall), with only the existing
  stale-Browserslist and large-chunk warnings.
- `git diff --check`: clean.
- Browser, live Supabase, migration application, RLS, notification and native/Capacitor checks are
  BLOCKED. The checker will verify deterministic/static behavior without deploying anything.

## Requirements

1. **Create an immutable, UUID-keyed, account-owned history table.** Add a new
   `public.user_session_history` table; do not widen, rename, seed from, drop or otherwise mutate the
   legacy one-row `public.user_sessions` table. Each row has `id uuid PRIMARY KEY DEFAULT
   gen_random_uuid()`, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, positive
   `duration_minutes`, `buzz_level` constrained to the app's 1–7 range, `drinks jsonb NOT NULL`, and
   `completed_at timestamptz NOT NULL DEFAULT now()`. Enable RLS. Permanent authenticated users may
   select, insert and delete only their own rows; snapshots are immutable, so add no update policy.
   Add an index ordered for newest-first reads by user and a database trigger/function that, after
   every insert, deletes that same user's rows beyond the newest 30, using `completed_at DESC` and
   UUID as a stable tie-break. Update the checked-in generated Supabase types exactly for the new
   table. Do not deploy or apply the migration.

2. **Replace draft-oriented last-night persistence with an account-only history hook.** Replace
   `useLastSession` with `useSessionHistory` and shared snapshot/drink types. Track the current auth
   session and use `isAnonymousSession` from `src/lib/anonymousAuth.ts`: an anonymous Supabase user
   is not an account and must neither query nor insert history. For a permanent account, query at
   most 30 `user_session_history` rows newest-first and expose `sessions`, `lastSession` (exactly
   `sessions[0]`), `loading`, `isAccount`, and an async `saveSessionSnapshot` operation. That
   operation inserts a new immutable row rather than upserting. Invalidate the same React Query key
   after success. Remove every production read/write of legacy `user_sessions`.

3. **Capture the completed plan exactly once at End session, before reset.** In Timeline's winding-
   down exit, create the snapshot from the still-live state: the selected duration in minutes, the
   selected 1–7 buzz level, and every real chosen drink with all existing serving/portion fields.
   Skip the history request for anonymous users. For a permanent account, attempt the insert before
   calling the existing `endSession`, so reset can never erase the snapshot inputs. Prevent a double
   click while completion is in flight. Whether saving succeeds or fails, finish the existing reset,
   cancel pending notifications and return to Plan; on failure show a restrained toast explaining
   that the session ended but history could not be saved. Do not change BAC, body-water, ethanol,
   pacing, consumption or notification calculations.

4. **Make every history row a clean, editable Plan prefill.** Add one AppContext operation that
   loads a snapshot as a new draft. It must replace—not merge with—the current drinks; clone every
   drink with a collision-safe new source id; set the saved buzz level and target BAC through the
   existing deterministic lookup; clear locks, breaks, consumption, delays, timeline and derived
   calculations; and rebase the saved duration from the supplied current time. The resulting draft
   has no consumed/past/locked state and behaves exactly like manually selected items: the user may
   edit time, band, scale and drinks, press Done without AI, or explicitly Build/Regenerate. Loading
   a snapshot never records a new history row. Keep local Plan duration synchronized when a snapshot
   is loaded while Plan is already mounted.

5. **Expose newest and older snapshots in the two settled entry points.** In Plan, replace
   `Repeat last night?` with `Repeat last session?`, replace `Use last night` with `Use last
   session`, source it from `lastSession`, and update its toast/copy to say session rather than night.
   In Profile, add a `Session history` section immediately after `AccountCard`; render it only for a
   permanent account. Show up to 30 compact newest-first rows in a git-commit-like list: completion
   date/time, a short visible UUID, duration, buzz level, and the chosen drink names/quantities.
   Empty permanent accounts get a quiet `No completed sessions yet` state. Clicking any row loads it
   through the shared AppContext operation and switches Dashboard directly to Plan, where the
   prefilled draft is immediately editable. Preserve Profile's existing account, admin, feedback,
   saved-drink and dark-theme behavior.

## Communication route — transport only

Your assigning agent is the DeepSeek A2A hub `940a15e0-682c-4a16-807d-82f4a6bfc090`, acting for
Codex TUI on ticket `W5-7`. Send every substantive question, blocker, status update and final
handback with `traycer agent send --to 940a15e0-682c-4a16-807d-82f4a6bfc090`. Include the ticket ID,
your full Traycer agent ID, a unique monotonic message ID, the kind
(`QUESTION | BLOCKER | STATUS | HANDBACK`), whether a reply is needed, and the complete message body.

The hub records messages but does not answer or make decisions; the Codex orchestrator will send any
necessary response back through it. Continue safe independent work while waiting. Do not weaken or
reinterpret the specification because this route exists.

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
looks wrong. Modify only the files named above. If you believe another
file must change, stop and report it instead.

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

## Explicit zero-verification override

Oscar explicitly supersedes the two standard implementer checks above for this commission. Run no
verification at all: no typecheck, Vitest or other tests, lint, build, browser, visual, Supabase,
migration, notification or native checks. Do not write or modify tests. Finish the production
implementation, map the five clauses, and hand back immediately. The Codex checker owns all
non-visual verification after handback; Oscar owns visual checking.
