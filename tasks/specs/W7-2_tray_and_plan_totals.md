# W7-2 — The tray sums, and the Plan tab says Total price

## Context you need

A price in this app is **the price of one base unit** — one shot, one pint, one 175 ml glass — never
a total. The picker shows per-unit prices. **The two places a total belongs are yours:** the tray's
running sum and the Plan tab's night total.

The rule that makes this readable to a user: *the picker card shows the unit price, the tray shows
the running sum.* Ten taps of `+` on a £3 pint move the tray to £30 while the card still reads £3.

`src/lib/basePricing.ts` holds the money helpers — read it first, it is short and fully commented.
`sumPrices(values)` sums an array of `number | null`, returning **null when nothing was priced** and
a number when anything was. Use it rather than writing another accumulator.

## Files you may modify

Only these two:

- `src/components/picker/PickerTray.tsx`
- `src/components/tabs/PlanTab.tsx`

**No other file may be changed.** If you believe another file needs changing, stop and report it
rather than doing it. In particular do not modify `src/lib/basePricing.ts`,
`src/components/picker/DrinkRow.tsx`, `src/components/picker/CategoryScreen.tsx`,
`src/components/picker/picker-model.ts` or `src/components/tabs/DrinksTab.tsx` — the last two belong
to another agent working in parallel. `DrinksTab` already passes `PickerTray` its `cost` prop; treat
that prop as given and render it, do not change where it comes from.

## Clauses

### 1. The tray's sum is a total, and reads as one

`PickerTray.tsx` currently renders `· £{cost.toFixed(2)}` beside the tray reading (around line 60).

- The figure must read unambiguously as the **running total for everything selected**, not as a
  drink's price. Give it a short label rather than leaving a bare number appended to the reading.
- When `cost` is `null` — nothing selected carries a price — render **nothing at all**. Never `£0`,
  and never an empty label with no figure.
- Keep the existing layout and type scale. This is a labelling and null-handling change, not a
  redesign.

Accepted when: with two priced drinks selected the tray shows their combined total under a label
that says it is a total; with nothing priced, no money appears anywhere in the tray.

### 2. The Plan tab's total is labelled `Total price`

`PlanTab.tsx` computes `nightCost` (around line 271) as `pricePerUnit × entryServingCount` summed
over `state.drinks`, and renders it under a label currently reading `Total` (around line 615).

- The label must read **`Total price`**.
- Rewrite the accumulation to use `sumPrices` from `src/lib/basePricing.ts`. The existing loop is
  correct in behaviour — an entry with a null `pricePerUnit` is skipped, and the result is null when
  nothing was priced — so this is a substitution, not a change of meaning. Keep the
  `pricePerUnit × entryServingCount` multiplication exactly as it is.
- The block must stay absent entirely when the result is null. It is already guarded by
  `nightCost != null`; keep that.

Accepted when: a plan with one priced drink at 2 servings and one unpriced drink shows `Total price`
above the priced drink's unit price doubled, and a plan with no priced drinks shows no total block.

### 3. Do not introduce a zero

Across both files, an absent price and a genuine £0 are different things. `null` means *nothing was
priced* and must render nothing. Only an actual zero price may ever display as `£0`.

Accepted when: no code path in either file substitutes `0` for a null price, and no `?? 0` is added
to a money value before it is displayed.

## Verification baseline

Derived by running the commands on `main` at `a598f6a`, immediately before this spec was written:

- `npm run typecheck` (`tsc -b --noEmit`) — **passes, 0 errors.** Never use bare `tsc --noEmit` in
  this repository: the root `tsconfig.json` is `"files": []` plus project references, so without
  `-b` it compiles zero files and reports success having checked nothing.
- `npx vitest run` — **344 tests across 50 files, all passing.**
- `npm run lint` — known-failing at **exactly 23 problems (11 errors, 12 warnings)** in pre-existing
  application files. This is the accepted baseline and must not get worse.
- `npm run build` — passes.
- Remote Supabase, edge-function, notification and mobile checks are **BLOCKED** — no live
  infrastructure is available to you. Do not attempt them.

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
