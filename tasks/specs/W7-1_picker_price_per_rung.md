# W7-1 — The picker prices per base unit, and says which unit

## Context you need

A price in this app is **the price of one base unit** — one shot, one pint, one 175 ml glass — and
never a total. The user types the price of the serving in front of them; the app multiplies.

This was rebuilt in `src/lib/basePricing.ts` (read it first; it is short and fully commented). The
read path is already migrated. **Your job is the picker UI on top of it.**

`resolvePrice(volumeMl, rungs)` returns one of three states, and the distinction drives this ticket:

- `{ status: "priced", total, parts, exact }` — the money, and how it was made up.
- `{ status: "needs-price", volumeMl }` — this drink **has** prices but none can build this volume
  (60 ml against 25 ml and 50 ml rungs). The UI must **ask for a price**.
- `{ status: "unpriced" }` — nothing is priced for this drink at all. The UI must say **nothing**.
  Price is optional everywhere and an unpriced drink is never nagged.

Use `servingPriceFor(drink, servingId, customMl)` in `src/components/picker/picker-model.ts`, which
wraps that for a drink and a selected serving.

## Files you may modify

Only these four:

- `src/components/picker/DrinkRow.tsx`
- `src/components/picker/CategoryScreen.tsx`
- `src/components/picker/picker-copy.ts`
- `src/components/tabs/DrinksTab.tsx`

**No other file may be changed.** If you believe another file needs changing, stop and report it
rather than doing it. In particular do not modify `src/lib/basePricing.ts`,
`src/components/picker/picker-model.ts`, `src/lib/drinkOverrides.ts`, `src/hooks/useDrinkOverrides.ts`,
`src/components/picker/PickerTray.tsx` or `src/components/tabs/PlanTab.tsx` — the last two belong to
another agent working in parallel.

## Clauses

### 1. The price field is labelled with the unit it prices

`DrinkRow.tsx` renders a price `Input` (currently `aria-label="Price"`, placeholder `"£"`). It must
state which serving the number applies to, so `25` is never ambiguous between "£25 per shot" and
"£25 for all ten".

- The label reads **per the currently selected serving**: `per pint`, `per 25 ml`, `per 250 ml`.
  Use the serving option's `label` when it has one, else `fmtMl` from `picker-copy.ts`.
- Put the copy in `picker-copy.ts` beside the existing `CATEGORY_COPY` entries, not inline in the
  component.
- Accepted when: with a Spirits row open on Single, the price field is visibly labelled as pricing a
  25 ml single; switching that row to Double changes the label to the 50 ml double.

### 2. The row shows the per-unit price, and the three states are distinct

The row currently renders `money(perUnitPrice)` when `perUnitPrice != null`. Replace that with the
resolution from `servingPriceFor`:

- `priced` → show the money for **one** serving of the selected serving, as now.
- `needs-price` → show a short, non-scolding invitation to price this serving. Not an error, not red.
- `unpriced` → show nothing at all. **Never `£0`.**

The existing `selected && quantity > 1` behaviour stays: the large figure is the total for the
selected quantity and the small figure beneath is the per-unit price. Both come from the resolution.

Accepted when: a Spirits row with a priced 25 ml single and a priced 50 ml double, opened on Custom
at 60 ml, shows the invitation rather than a number or a blank.

### 3. A typed custom volume that matches a rung collapses into it

`picker-model.ts` exports `servingOptionForVolume(drink, volumeMl)`, which returns the serving option
of that exact volume or null. Use it.

- When the committed custom volume equals an existing serving option, switch the row to that serving
  option and clear the custom value, so Custom turns off.
- **This must happen on commit (blur), never on change.** Typing `250` passes through `25`; switching
  the moment the box reads `25` hijacks the user mid-entry. `DrinkRow.tsx` already keeps a
  `serveDraft` string for exactly this class of problem — follow that pattern.
- Accepted when: on a Beer row, typing `568` into Custom and blurring leaves the row on the **Pint**
  rung with Custom off; typing `400` and blurring leaves it on Custom at 400.

### 4. The commit contract is already in place — wire it, do not redesign it

`DrinkRow`'s `onPriceCommit` is `(price: number | null, volumeMl: number | null) => void`, and
`DrinksTab` already routes it to `setDrinkPrice(drinkId, volumeMl, price)`. A price is stored against
the volume it was typed against, with **no conversion**. Do not reintroduce any scaling of a price
between servings — that was the defect this design removes.

Accepted when: typing `25` against a Custom 250 ml serving stores 25 against 250 ml, and reopening
the row on that serving reads back exactly `25`.

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
