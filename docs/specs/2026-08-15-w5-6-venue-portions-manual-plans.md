# W5-6 — Active venue, real portions, and optional AI plans

## Assignment

Implement in `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0`.
The orchestrator already synchronized this worktree to `main`; dependencies are provisioned and
`package-lock.json` did not change.

## Allowed files

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/tabs/PlanTab.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/tabs/DrinksTab.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/tabs/plan-navigation.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/establishments/EstablishmentsScreen.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/picker/CategoryScreen.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/picker/DrinkRow.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/picker/picker-model.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/picker/picker-copy.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/picker/wave5-picker.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/hooks/useEstablishments.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/contexts/AppContext.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/lib/planCatalog.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/lib/generatePlan.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/lib/planGenerationContracts.ts`

No test file is in the allowlist: the independent checker writes acceptance tests after handback.
No other file may be modified.

## Verification baseline

- `npm test`: PASS — 23 test files, 151 tests.
- `npm run typecheck`: PASS — zero errors.
- `npm run lint`: known FAIL — exactly 11 errors and 10 warnings (21 problems). Preserve that exact
  ceiling and introduce no new finding.
- `npm run build`: PASS — Vite built 2,219 modules in 50.20s (52.87s wall time), with only the
  existing stale-Browserslist and large-chunk warnings.
- `git diff --check`: clean.
- Environment trap for the checker-owned baseline: this worktree has no `.env`. The checker loads
  the root environment into its shell without printing, copying, editing, staging, or committing
  the environment file or its values.

## Requirements

1. **One persisted active venue supplies both manual and generated catalogues.** Resolve the active
   venue after `useEstablishments` finishes: retain a persisted id only while it still exists;
   otherwise select the global establishment whose name is exactly `Wetherspoons` (falling back to
   the first global venue only if that seed is genuinely absent). Persist an explicit selection in
   localStorage so it survives reloads. Wetherspoons must therefore show `HERE NOW` and feed Plan on
   first use without a click. Selecting a user/session bar immediately makes it `HERE NOW`, switches
   all Plan categories, rows, filters and AI generation to only that venue, and persists it. If that
   venue later disappears, fall back to Wetherspoons. Build `GeneratePlanInput.catalog` from the
   active establishment rows with stable ids, names, categories, ABVs and database serving volumes;
   the existing static Wetherspoons catalogue may be used only while that active seed's database
   rows are temporarily unavailable, never as bleed-through into a selected custom venue.

2. **Replace the two-value `Portion` fiction with real per-drink serving choices.** Keep the picker
   category order but rename `Spirits & mixers` to `Spirits` throughout its copy and classification.
   Beer/cider choices are Half pint 284 ml, Pint 568 ml and Custom; spirit choices are Single 25 ml,
   Double 50 ml and Custom; wine choices are 125 ml, 175 ml, 250 ml and Custom. Cocktails and bottled
   low/no/soft drinks offer Database volume, Standard 330 ml and Custom: convert a usable database
   `volume`/`volume_unit` to ml, use 330 ml when it is absent, and still render Database and Standard
   as separate selectable choices when their numeric values happen to match. Unknown/fallback rows
   must remain usable with Database/Standard/Custom rather than losing quantity controls. Every
   drink has a visible `Custom` control beside the minus/plus controls; a valid positive custom ml
   amount becomes that pending selection's serving and quantity increment.

3. **The selected serving controls the committed entry and deterministic arithmetic.** Minus and
   plus change the count of the currently selected serving; all row summaries, pending tray fill,
   ceiling eligibility, prices, swaps and committed entries use `servingMl × count`, with pure
   ethanol always `servingMl × count × ABV / 100`. Commit the actual chosen volume, not a cosmetic
   label over the old 330 ml value. Use collision-safe ids and append every Add as a new source
   entry: adding two pints and later one half-pint must remain two distinct entries through Plan,
   Timeline and consumption history. A user-created mixed drink remains supported, is stored and
   grouped as a custom cocktail, and uses its entered serving ml and ABV. Do not change the
   deterministic BAC/body-water/pacing formulae or the existing +20% hard ceiling.

4. **Manual planning and AI-generation state are independent.** Remove the debounced/background
   `generatePlan` preload: opening or returning to Plan must not call AI, apply a plan, change the
   button to loading, or mutate existing drinks. A manual Add must immediately appear in the
   selected-drinks panel with its existing lock/delete actions even before any generation, but
   `addUnplannedDrink` must no longer auto-lock it. Track whether generation has actually succeeded
   separately from whether drinks exist: the action stays `Build the night` for any fully manual
   plan; only a successful explicit first generation changes it to `Regenerate`. First Build,
   Regenerate and the existing Timeline `Re-plan the rest` share one retention rule: consumed/past
   source drinks and explicitly locked current/future source drinks survive; all other current/future
   drinks are replaceable. Subtract all protected ethanol once from the deterministic generation
   budget and generate around those retained entries.

5. **Done never requires AI or locks, and consumption remains a separate lifecycle.** The tray's
   existing `Done` action must advance a completely manual plan directly to Timeline even when no
   drink is locked and AI has never been invoked. Returning to Plan shows the current plan unchanged
   and triggers nothing. A lock means only `do not replace me` for an unconsumed current/future
   drink; it must not acquire any new movement/swap/edit restriction. A drink recorded with `Had it`
   is immutable past history until End session, independently of lock state, and must never be
   removed by Plan Build/Regenerate. Preserve the existing current/future action suite, past-row
   action removal, Timeline clock behavior, formulas, filters, scanner flow, RLS and session-end
   lifecycle.

## What you run, and what you do not

**Oscar's post-commission process override: run no verification.** Do not run typecheck, Vitest or
other tests, lint, build, browser, visual, Supabase, or native checks, and do not write or modify
tests. Finish the production implementation, map the five clauses, and hand back immediately. The
Codex checker owns all non-visual verification after handback; Oscar owns visual checking. This
override supersedes the original commission's verification instructions.

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
- Do NOT write new tests. Do NOT modify existing tests. Verification of
  new behaviour is not your job.
- Report what you changed, which clause each change maps to, and anything
  you were unsure about.

## Communication route — transport only

Your assigning agent is the DeepSeek A2A hub `940a15e0-682c-4a16-807d-82f4a6bfc090`, acting for
Codex TUI on ticket `W5-6`. Send every substantive question, blocker, status update and final
handback with `traycer agent send --to 940a15e0-682c-4a16-807d-82f4a6bfc090`. Include the ticket ID,
your full Traycer agent ID, a unique monotonic message ID, the kind
(`QUESTION | BLOCKER | STATUS | HANDBACK`), whether a reply is needed, and the complete message body.

The hub records messages but does not answer or make decisions; the Codex orchestrator will send any
necessary response back through it. Continue safe independent work while waiting. Do not weaken or
reinterpret the specification because this route exists.
