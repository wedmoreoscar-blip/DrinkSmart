# W5-9 — Reusable saved custom drinks in Plan

## Assignment

Implement in `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1`.
The orchestrator has synchronized this warm worktree to `main` commit `d83ea07`; dependencies are
provisioned and `package-lock.json` did not change.

## Allowed files

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/supabase/migrations/20260815000001_saved_custom_drink_serving_ml.sql` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/src/integrations/supabase/types.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/src/hooks/useSavedDrinks.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/src/components/picker/CustomDrinkSheet.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/src/components/picker/picker-copy.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_1/src/components/tabs/DrinksTab.tsx`

No test file is in the allowlist: the independent checker writes acceptance tests after handback.
No other file may be modified.

## Settled behavior

### 1. Add serving volume to account-owned saved drinks

Create the additive migration `20260815000001_saved_custom_drink_serving_ml.sql`. Add nullable
`serving_ml numeric` to `public.saved_custom_drinks` with a check allowing null for legacy rows and
otherwise requiring a positive value no greater than 5000. Add an UPDATE RLS policy scoped to
`auth.uid() = user_id` in both `USING` and `WITH CHECK`; preserve existing RLS and the
`(user_id, drink_name)` unique index. Update generated Supabase Row/Insert/Update types manually to
match. Do not apply the migration remotely.

### 2. Account hook stores reusable name, ABV and serve

Extend exported `SavedDrink` with `serving_ml: number | null`. Keep anonymous sessions excluded from
account saving. Replace the positional save API with
`saveDrink(input: { drinkName: string; abv: number; servingMl: number }): Promise<boolean>`.
Persist with an upsert on the existing `user_id,drink_name` conflict target so selecting a saved
drink, editing ABV/serve and checking Save updates that account record rather than producing an
"already saved" dead end. Invalidate the existing React Query key after success. Price is never
stored in `saved_custom_drinks`. Existing legacy records with null serving remain readable.

### 3. Custom drink opens empty and Name is an editable saved-drink selector

Every opening of `CustomDrinkSheet` resets name, ABV, serve and price to blank/null and resets both
checkboxes unchecked; remove the Punk IPA/5.6/330/5.9 sample defaults. Extend its props with the
account's `savedDrinks`. The Name control remains a normal editable text input, with a dropdown
affordance only when saved account drinks exist. Opening it lists saved drinks; selecting one fills
name and ABV, fills serve when `serving_ml` exists, leaves serve blank for a legacy null row, always
clears price, closes the list and still permits editing every populated field. Dropdown rows show
the saved name plus ABV and either its ml serving or `serve not saved`. Do not add a dependency;
reuse existing shadcn primitives.

### 4. The two save destinations are independent and singular

Keep exactly two checkboxes. `Keep it on <venue>` refers only to the one active venue currently
shown as `Here now`; it never opens a venue selector and never writes to another establishment.
`Save drink to account` is enabled only for a permanent account and stores current name/ABV/serve
through the hook above. Either, both or neither may be checked; adding to the active plan always
occurs after valid name/ABV/serve input. Price is stored only on the active plan/current-venue row,
never on the account drink.

### 5. Plan wiring and legacy behavior

`DrinksTab` passes `savedDrinks` and permanent-account eligibility into `CustomDrinkSheet`, uses the
new save signature, and retains the existing +20% tray ceiling. A selected saved drink is just a
prefill: the resulting plan entry remains a normal editable custom entry. Current-venue persistence
continues to use `activeVenue`; do not create global cross-venue saved menu rows. Profile and Account
continue to list/delete saved drinks without UI redesign.

## Verification baseline

- Base commit: `d83ea07`.
- Vitest baseline: 29 files passed, 174 tests passed.
- Typecheck baseline: PASS with `tsc -b --noEmit`; bare `tsc --noEmit` is a no-op here.
- Lint baseline: known FAIL, exactly 11 errors and 12 warnings. Do not modify unrelated lint findings.
- Build baseline: PASS, 2,221 modules transformed in 16.69 seconds.
- Browser, live Supabase, auth/RLS and migration verification are `BLOCKED`.

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

## Communication route — transport only

Your assigning agent is the DeepSeek A2A hub `940a15e0-682c-4a16-807d-82f4a6bfc090`, acting for
Codex TUI on ticket `W5-9`. Send every substantive question, blocker, status update and final
handback with `traycer agent send --to 940a15e0-682c-4a16-807d-82f4a6bfc090`. Include the ticket ID,
your full Traycer agent ID, a unique monotonic message ID, the kind
(`QUESTION | BLOCKER | STATUS | HANDBACK`), whether a reply is needed, and the complete message body.

The hub records messages but does not answer or make decisions; the Codex orchestrator will send
any necessary response back through it. Continue safe independent work while waiting. Do not
weaken or reinterpret the specification because this route exists.
