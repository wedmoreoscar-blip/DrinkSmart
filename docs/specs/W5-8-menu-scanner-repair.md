# W5-8 — Deterministic menu scanner repair

## Assignment

Implement in `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0`.
The orchestrator has synchronized this warm worktree to `main` commit `d83ea07`; dependencies are
provisioned and `package-lock.json` did not change.

## Allowed files

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/supabase/functions/parse-menu/index.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/scanner/types.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/scanner/scanner-model.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/scanner/ScannerReview.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/scanner/copy.ts`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/components/tabs/MenuScannerTab.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/lib/drinkFallbacks.ts` (new)
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0/src/lib/planCatalog.ts`

No test file is in the allowlist: the independent checker writes acceptance tests after handback.
No other file may be modified.

## Settled behavior

### 1. Stable low-cost vision extraction

In `supabase/functions/parse-menu/index.ts`, replace the obsolete
`google/gemini-2.5-flash-preview` model with stable OpenRouter model
`google/gemini-3.1-flash-lite`. Keep `withSupabase({ auth: "user" })`, JWT verification, the
`OPENROUTER_API_KEY` Supabase secret, maximum five images, one model request per image and the
forced `extract_menu_drinks` tool call. The model extracts printed facts only and returns `null`
for unread ABV, price or volume; it never invents fallbacks. Expand the allowed extraction
categories so `soft-drinks`, `no-alcohol`, `low-alcohol`, `alcopops` and `rtd` remain distinct in
addition to the existing beer, cider, wine, spirit, shot and cocktail categories. Reject or skip
malformed tool arguments rather than trusting arbitrary model output.

### 2. Client-owned deterministic normalization

Create `src/lib/drinkFallbacks.ts` as the pure source of truth consumed by both scanner
normalization and `planCatalog.ts`. It must classify from `category` plus `categoryLabel` and expose
helpers for deterministic fallback ABV and serving ml. Missing or non-finite ABV falls back to:

| Classification | ABV |
| --- | ---: |
| beer/cider | 5 |
| wine | 13 |
| spirits/shots | 40 |
| cocktails | 15 |
| explicit soft/no-alcohol | 0 |
| low-alcohol | 1.2 |
| alcopop/RTD | 4 |

Missing serving volume falls back to 568 ml beer/cider, 175 ml wine, 25 ml spirits/shots, and
330 ml cocktails plus soft/no/low/alcopop/RTD. Normalize visible units to absolute ml before
review: ml unchanged; pint 568; half-pint 284; shot 25; glass 175 unless the supplied numeric value
is already an explicit ml amount; oz uses the existing `OZ_ML` constant. Validate finite ranges
(ABV 0–100, positive realistic serving ml, non-negative price); invalid values follow the same
missing-value path. `ParsedDrink` gains `abvEstimated: boolean` and `volumeEstimated: boolean`.
Provide a pure normalizer in `scanner-model.ts` which trims names, applies these rules, preserves
price `null`, and deduplicates exact repeated servings by normalized name + absolute ml + price;
same-name drinks with different volumes or prices remain separate rows.

### 3. Review makes provenance honest

`MenuScannerTab.startParse` must normalize the Edge Function response before placing it in review
state. `ScannerReview` continues to let the user edit ABV, serve ml and price, but visibly labels a
fallback ABV or serving as `estimated`; committing an edit clears the corresponding estimated flag.
An estimated value is usable and therefore is not a missing-value gap. Missing price may remain a
gap and may be saved as `null`. The review must never display a raw `1 pint` as `1 ml` because all
serves reaching it are absolute ml.

### 4. Persistence and active-venue behavior

Saving persists normalized absolute `volume` with `volume_unit: "ml"`, the extracted or fallback
ABV, nullable price, model category and label. Names remain required. Preserve the current flow:
one establishment is created, all reviewed drinks are associated with it, `onSaved(id)` selects it
as the one active `Here now` venue, and Plan categories/catalogue come only from that venue. Do not
add Wetherspoons or static drinks to an empty user venue. Do not deploy the function or apply any
migration.

### 5. Planner uses the same deterministic fallback

Replace `buildCatalogFromDrinks`'s current `abv ?? 0` and universal `databaseVolumeMl ?? 330` with
the helpers from `drinkFallbacks.ts`. This protects legacy establishment rows that were stored with
missing ABV/volume and keeps AI generation aligned with manual picker serving assumptions. Do not
change BAC, ethanol or pacing formulas; the model still selects catalogue ids only.

## Verification baseline

- Base commit: `d83ea07`.
- Vitest baseline: 29 files passed, 174 tests passed.
- Typecheck baseline: PASS with `tsc -b --noEmit`; bare `tsc --noEmit` is a no-op here.
- Lint baseline: known FAIL, exactly 11 errors and 12 warnings. Do not modify unrelated lint findings.
- Build baseline: PASS, 2,221 modules transformed in 16.69 seconds.
- Browser, live Supabase, real OpenRouter, Edge Function and deployment verification are `BLOCKED`.

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
Codex TUI on ticket `W5-8`. Send every substantive question, blocker, status update and final
handback with `traycer agent send --to 940a15e0-682c-4a16-807d-82f4a6bfc090`. Include the ticket ID,
your full Traycer agent ID, a unique monotonic message ID, the kind
(`QUESTION | BLOCKER | STATUS | HANDBACK`), whether a reply is needed, and the complete message body.

The hub records messages but does not answer or make decisions; the Codex orchestrator will send
any necessary response back through it. Continue safe independent work while waiting. Do not
weaken or reinterpret the specification because this route exists.
