# Session handoff — Wave 6 shipped; A stage is next, and it is a testing session

Written 2026-08-16 21:56 BST by normal handoff. Substantively identical to
`tasks/next_session_kickoff.md`.

`main` is at `672f3df`, clean apart from Oscar's unstaged `package.json` / `package-lock.json`
(Supabase CLI devDependency) which must be preserved.

## Completed

The price / budget / account plan is built except workstream **A**. Seven commits, one four-way
delegated wave, and three fixes from Oscar testing the result.

- `55e3545` — **D: the night's budget range.** Two-handle slider on the Plan tab, whole pounds, top
  stop means *no limit*. Session state, not user state: `PreferenceData` untouched. localStorage key
  stayed `.v1` (fields are additive; a bump would discard in-progress sessions for nothing). Two
  nullable columns on `user_session_history` so `use last night` carries it.
- `e057f02`, `9b2aa3c` — **the spine, built inline before dispatch.** `user_drink_overrides` table,
  the pure resolver `src/lib/drinkOverrides.ts`, `useDrinkOverrides`, the anonymous override store,
  and `getEstablishmentDrinks` returning `ResolvedDrink`. Also fixed an anonymous leak: scanned
  venues were being written to Postgres for anonymous users.
- `3ca16ef`, `8147449`, `a2b25f2`, `68acbc0` — **Wave 6, four disjoint legs** (G, B-UI+C, F, E),
  merged with zero conflicts.
- `17a16fa` — **speccheck repairs.** 20/20 clauses satisfied, 0 handed back, 7 repairs inline.
- `2387a34` — spend ledger rows.
- `fb891ed`, `50a3143`, `672f3df` — **Oscar's three findings**, all confirmed fixed by him except
  where noted below.

## Verification at handoff

Re-derived on `672f3df`. **Never quote these — run them.**

- `npm run typecheck` (`tsc -b --noEmit`) — passed.
- `npx vitest run` — **312 passed, 48 files.**
- `npm run lint` — **23 problems (11 errors, 12 warnings)**, the known baseline, held all session.
- `npm run build` — passed.
- Live: `20260817000000` and `20260817000100` applied by Oscar; `db:types` regenerated.

**Do not stage `package.json` / `package-lock.json`.**

## What is NOT verified

Everything runtime. No override write, no scan against a real menu, no generation carrying a budget
has ever executed. Oscar confirmed by hand only: the custom-ml field, the `Apply` button, and that
the earlier bugs are gone. The stats-change confirmation dialog has **never been clicked**.

Two open risks carried from the review, both stated rather than buried:

- **The dead 250 ml button was fixed defensively, not reproduced.** `withServings` silently returns
  the entry unchanged below one serving, which would trap a row permanently; `setPlannedServingMl`
  now floors the count at one. If it recurs, it was something else.
- **Leg 4 made `CatalogItem.price` optional** where the clause said nullable. Weaker typing, no
  runtime effect, accepted rather than churned.

---

# NEXT SESSION — test what was built, then workstream A

Oscar's instruction: **testing first, then the A stage.** Nothing in the price/budget/account work
has been exercised against a running app beyond three spot checks, and A is the stage that makes
most of it observable — every seeded price is null until it lands.

## Part 1 — testing

Walk the built surfaces. These are the ones with no runtime evidence at all:

| Surface | What to look for |
| --- | --- |
| Budget slider (Plan tab) | Reads `£0 – no limit` fresh; narrows; survives a reload; `use last night` brings it back |
| Price control (drink row) | Types freely; commits on blur; the value does not drift when reopened on a different serving |
| Remembered serve | Commit a custom ml, leave, return — the row opens on Custom with that ml pre-filled |
| Tray / plan cost | Absent entirely when nothing is priced — never `£0` |
| Stats-change dialog | Fires only with drinks planned; `Keep my plan` cancels the save outright |
| Scanner | Re-scan the same menu — one venue, updated rows, no duplicate |

## Part 2 — workstream A, its own stage

**A carries the benchmark re-run.** This is locked and deliberate: E shipped un-benchmarked, and the
re-run measures the real catalogue with real prices once, rather than once now and again after the
backfill. Until this stage completes, E's plans are unvalidated against the ±10% gate and
`Cheapest first` is inert.

**The one open decision is A's price list source**, and it cannot be resolved from inside the repo.
Ask Oscar: draft an approximate list for him to correct, or scan a real menu with the app's own
scanner. Whatever is used needs a stated source and date, or it becomes another 330 ml.

Read first: `AGENTS.md`; `docs/decisions.md` (the 2026-08-16 entries, especially the three added at
the end this session); the artifacts `price-and-account-value` and its `wave-6-partition`;
`src/lib/drinkOverrides.ts`; `src/lib/budget.ts`.

## PROMPT

```text
Continue the DrinkSmart price / budget / account work. Two parts, in this order — Oscar's
instruction is to test first and do the A stage next.

PART 1 — test what Wave 6 built. None of it has runtime evidence beyond three spot checks Oscar
made by hand. Walk these with him and fix what is broken: the budget slider on the Plan tab (fresh
session reads £0 – no limit, narrows, survives a reload, and `use last night` restores it); the
price control on a drink row (types freely, commits on blur, and the value does not drift when the
row is reopened on a different serving); the remembered serve (commit a custom ml, leave, return —
the row should open on Custom with that ml already filled); the tray and plan cost readouts (absent
entirely when nothing is priced, never £0); the stats-change confirmation dialog, which has never
been clicked (it must fire only when drinks are planned, and `Keep my plan` must cancel the save
outright rather than saving stats against a stale plan); and the menu scanner re-scanning the same
menu (one venue, rows updated, no duplicate).

PART 2 — workstream A, as its own stage, carrying the benchmark re-run. Read the Traycer artifact
`price-and-account-value` first; §4.A is the step and `wave-6-partition` §7 records why A moved to
the end. Backfill real Wetherspoons prices and volumes into the 237 seeded establishment_drinks rows
by UPDATE within the Wetherspoons establishment, then re-run the 30-trial-per-provider benchmark
against the shipping prompt. Do not run the benchmark before the backfill — the whole point of the
resequencing is that one re-run measures a catalogue that has real prices in it.

A's one open decision is its price list source, and it cannot be settled from inside the repo. Ask
Oscar whether to draft an approximate list for him to correct or to scan a real menu with the app's
own scanner. Do not invent prices silently. Whatever is used needs a stated source and date.

Carry these: the ±10% ethanol admission gate stays the single hard rejection and budget never
justifies underfilling it. Do not re-pin the AI provider to DeepSeek — a CN jurisdiction guardrail
makes that endpoint permanently unreachable from this OpenRouter account — and do not change
DEEPSEEK_MODEL, the only/order routing arrays, allow_fallbacks, the reasoning setting or the tool
definitions except as the benchmark itself directs. Do not stage, revert or delete the unstaged
package.json / package-lock.json; those are Oscar's Supabase CLI devDependency.

Two loose ends from last session, both stated rather than buried. The dead 250 ml serving button was
fixed defensively via setPlannedServingMl flooring the serving count at one, but never reproduced —
if it recurs it was something else. And leg 4 made CatalogItem.price optional where the spec said
nullable; weaker typing, no runtime effect, accepted rather than churned.

If delegating, note two provisioning lessons now in docs/decisions.md: .env is gitignored and does
not come with a worktree, so copy it in or five suites fail to load rather than fail; and partition
specs by file ownership, not by workstream letter, paying any shared spine inline first.

Verification baseline, re-derive rather than quote: `npm run typecheck` PASSES; `npx vitest run` is
312 tests across 48 files; `npm run build` PASSES; `npm run lint` is known-failing at exactly 11
errors and 12 warnings and must not get worse. Edge functions sit outside the tsc project and Deno
is absent, so supabase/functions/**/*.ts can only be inspection-checked. Deployed function logs are
BLOCKED.

Commit locally when the baseline holds. Never push, deploy, rotate secrets, or apply a migration to
the remote database without asking — Oscar applies migrations himself.
```
