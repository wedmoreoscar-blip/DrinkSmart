# W5-4 — Onboarding Strength rail

## Assignment

Implement in `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_3`.
The orchestrator already synchronized this worktree to `main`; dependencies are provisioned.

## Allowed files

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_3/src/components/onboarding/PreferencesPicker.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_3/src/components/onboarding/preferenceFamilies.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_3/src/components/onboarding/onboardingCopy.ts`

No other file may be modified.

## Verification baseline

- `npm test`: PASS — 14 test files, 131 tests.
- `npm run typecheck`: PASS, zero errors
- `npm run lint`: known FAIL — 11 errors and 10 warnings. Preserve that exact ceiling; introduce no new findings.
- `npm run build`: PASS (Vite production build; existing large-chunk and stale Browserslist warnings only).
- `git diff --check`: clean

## Requirements

1. Onboarding step 2 has one `Taste` section containing sibling compact Sweetness and Strength
   rails. Strength is a taste preference influencing which catalog drinks are selected, not a
   quantity/count or buzz-intensity control. Use the existing five values and exact labels from
   `STRONG_WORDS`: `Light · Mild · Medium · Strong · Very strong`. Do not add a sixth or an
   alcohol-free stop and do not reuse the buzz-band vocabulary as state copy beyond the existing
   `Light` taste label.
2. Compact both five-stop rails to fit the existing card: 15px row label with the selected 22px word
   right-aligned on the same line, 56px track row, and 13px end words inline beside the track. Keep
   one `Taste` heading over both; `Strength` is a row label, not a separate section heading.
3. Add exactly one 13px explanatory sentence beneath Strength:
   `Which drinks get picked, not how many.` Do not add the rejected second sentence about how drunk
   the user gets and do not describe the deterministic fewer/stronger outcome.
4. Change the category grid from six chips to five: `Beer & cider`, `Wine`, `Spirits`, `Cocktails`,
   and `Low & no`. Merge cider keys into Beer & cider; retain every existing catalog preference key
   exactly once across the alcoholic families, including alcopops under Cocktails. Keep `Low & no`
   and its existing preference behavior; do not absorb it into the Strength rail.
5. Keep onboarding's existing body copy, Start/skip behavior, persistence callbacks and five-value
   sweetness semantics. Do not edit Profile's Taste sheet; the orchestrator owns the matching
   Profile treatment and initial-state bug fix inline.

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
