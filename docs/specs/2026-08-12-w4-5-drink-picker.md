# W4-5 — Drink picker (designs `4d`, `4e`, `4f`, request §D)

You are rebuilding DrinkSmart's drink picker to match its Claude Design drawings: a root screen of
categories, a category screen using the same list component with a different filter, and a custom
drink sheet. The design calls this **progressive disclosure that reshapes what is there** — no new
navigation container and no new state container.

Your worktree: `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_5`
Your branch: `deepseek_agent_5`

## Design authority — read before writing any code

The **active** authority, by absolute path:

```
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4d-picker-categories.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4d-picker-categories.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4e-picker-category.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4e-picker-category.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4f-picker-custom-sheet.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4f-picker-custom-sheet.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/README.md   (section "§D — Drink picker (4d, 4e, 4f)", ~line 321)
```

Also read `screens/1l-form-primitives.html` (popover trigger, text input, inline error),
`screens/1m-sheet-radio-time-toast.html` (the sheet) and
`screens/4o-keypad-field-group.html` (the keypad you will call).

**Read the trailing `<script>` blocks of `4d`, `4e` and `4f`.** They carry `PICKER_COPY`,
`CATEGORY_COPY`, `CUSTOM_COPY`, `CUSTOM_ERRORS`, the `money`/`fmtMl` formatters and the pure-alcohol
arithmetic. Those strings and formulas are exact — use them verbatim, do not paraphrase.

**NEVER** read or use `/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart_depreciated/`.
It is history, not current authority.

## Standing design constraints (LOCKED — `docs/decisions.md`)

- Dark only. The light theme is deliberately unreachable; never reference or re-enable it.
- One accent, no palette. **No red, no green anywhere.** Amber `#d29a51` is a remark, not an alarm.
- 19px (`text-body`) is the floor for anything the user reads. 13px (`text-micro`) carries unit
  prices, sub-labels and footnotes only — never an answer.
- Nothing tappable under 56px. **Exactly one 64px primary action per screen**, and it is the tray's.
- Reach for the token, not the hex. Confirmed classes: `h-tap` (56px), `h-act` (64px),
  `rounded-ctl` (12px), `rounded-lg` (14px), `rounded-sheet` (20px),
  `text-micro`/`text-label`/`text-note`/`text-body`/`text-lead`/`text-title`, `bg-field`,
  `text-muted-foreground`, `text-primary`. `<Button size="act">` is the 64px primary.
- Compose the existing `src/components/ui/*` primitives. Do not fork them, do not add a component
  library, do not add any dependency, do not modify `package.json` or the lockfile.

## Files you may modify

- `src/components/tabs/DrinksTab.tsx`
- `src/components/DrinkFilterPopover.tsx`
- Any **new** file you create under `src/components/picker/` (this directory does not yet exist;
  create it). Prefer moving the category list, the drink row and the custom sheet into files there
  over growing `DrinksTab.tsx`, which is already ~956 lines.

**No other file may be created or modified.** In particular:

- **Do not modify `src/components/tabs/PlanTab.tsx`.** It mounts `DrinksTab` today, and the
  orchestrator owns the navigation wiring for this wave. `DrinksTab`'s existing `onNext: () => void`
  prop must keep working; you may **add** optional props but must not rename or remove `onNext`.
- **Do not modify `src/components/tabs/MenuScannerTab.tsx`** or anything under
  `src/components/establishments/` — other agents are working there concurrently.
- **Do not modify `src/components/ui/keypad-field-group.tsx`.** It already exists on your branch and
  is the `4o` primitive; you are a *caller*, not its author.
- Do not modify `src/hooks/useEstablishments.ts`, `src/hooks/useSavedDrinks.ts`,
  `src/contexts/AppContext.tsx`, or anything else under `src/components/ui/`.

**`AGENTS.md` normally forbids refactoring `DrinksTab.tsx`. This spec explicitly places its §D
surface work in scope, and nothing beyond it.** Do not take the opportunity to tidy unrelated parts
of that file.

## Clauses

**1. Build the root screen as a venue row plus category rows, with no toolbar.**
Root = one venue row (venue name, with `PICKER_COPY.venueSub(n)` → `"<n> drinks"`) followed by
category rows. Category rows are 72px, `#232532`, radius 14, with
`PICKER_COPY.categorySub(n, minPrice)` → `"<n> · from £4.55"` beneath the name. A final row uses
`PICKER_COPY.customCategory`: `Something not listed` / `added to this venue`.

**Nothing filters at the root** — there is nothing to filter yet, so there is no toolbar and no
search field on this screen.

The venue row must call a new **optional** prop `onOpenVenues?: () => void` when tapped. Add that
prop to `DrinksTab`; do not import or render any establishments component — the orchestrator wires
it.

**2. Build the category screen from the same list component, and put its chips inside the list.**
Inside a category, two 56px chips sit at the **top of the list and scroll away with it**, not in a
fixed toolbar: an ABV chip (`CATEGORY_COPY.abvChip(lo, hi)` → `ABV 4–6%`, active state
`box-shadow: 0 0 0 2px #9184d9` with the range in `#b5abfc`) and a sort chip whose options are
exactly `CATEGORY_COPY.sort` = `["Cheapest first", "Strongest first", "Least alcohol first"]`. Both
are `1l` popover triggers — reuse `src/components/DrinkFilterPopover.tsx` for this rather than
writing a second popover.

Drink rows are 72px, `#232532`, radius 14. **Price lives on the row**, right-aligned, 19px/500
tabular `#e9e9ed`. Strength, portion and ml sit under the name at 15px `#b2b6ca`, formatted with
`CATEGORY_COPY.rowSubSingle(abv, portion, ml)`.

**3. Make quantity change the selected row and nothing else.**
A selected row takes `box-shadow: 0 0 0 2px #9184d9` and grows a 56px control strip: 56 × 56
steppers either side of a 28px tabular numeral, then the half/pint segment.

At quantity > 1, exactly three things change and nothing else: the numeral, the price (which becomes
the total via `CATEGORY_COPY.priceTotal(p, n)` with the unit price beneath at 13px `#75798c` via
`CATEGORY_COPY.priceUnit(p, n)` → `2 × £4.55`), and a 17px summary line
`CATEGORY_COPY.selectedSummary(n, portion, ml)` → `2 pints · 45 ml pure alcohol`. The word `each`
appears in the row sub **only** at quantity > 1 (`CATEGORY_COPY.rowSub`).

**The row never splits into n rows here** — the timeline does that.

Pure alcohol is `ml = volume_ml * abv / 100` (ethanol **volume**, not grams). A half is
`volume / 2` with ml **recomputed from the halved volume**, never halved from an already-rounded
number.

**4. Fix the tray above the tab bar, and keep pending selections hollow.**
The tray is fixed above the tab bar: `#1c1e2c`, 1px `#292b31` top rule, padding `12px 20px`. It
holds a 26 × 60 vessel (radius 7, 1px `#3f424d` — reuse the existing
`VesselMeter` from `@/components/ui/vessel-meter`, already imported in `DrinksTab.tsx` at line 3),
the reading at 22px tabular via `PICKER_COPY.trayReading(ml, target)`, a 15px sub via
`PICKER_COPY.traySub(n)`, and the screen's one 64px action.

**The committed plan is solid `#9184d9`; the pending selection is `rgba(145,132,217,.22)` with a 1px
`#9184d9` top edge**, and the reading becomes the `22 + 45 ml` form. **Nothing is solid until `Add`
is tapped.** With nothing selected the action reads `PICKER_COPY.trayIdle` (`Done`); with a pending
selection it reads `PICKER_COPY.trayPending(n)` (`Add 2`). The tray must never cover the tab bar.

**5. Make custom entry a `1m` sheet over the catalog, using the `4o` keypad.**
A sheet, not a screen: radius `20px 20px 0 0`, padding `10px 20px 20px`, a 44 × 4 `#3f424d` grab
handle, and **backdrop tap and swipe-down both live** — that is what distinguishes a sheet from the
non-dismissable dialog.

Contents in order: name, then strength and serve in a 2-column grid, then price, then a
`CUSTOM_COPY.keepIt` checkbox with the venue name interpolated (unchecked means a one-off that is
not saved), then a live 17px line `CUSTOM_COPY.computed(ml, pct)` →
`18.5 ml pure alcohol — 19% of tonight`. **That computed line is the only thing on the sheet that
moves** — nothing else animates. It recomputes as `ml = serve * abv / 100` and
`pct = ml / target * 100`, rounded.

Strength, serve and price use the `4o` keypad, imported as:

```ts
import { KeypadFieldGroup } from "@/components/ui/keypad-field-group";
```

Pass `emptyIsAllowed={false}` — unlike the scanner, this sheet starts empty and submit walks the
fields left to right. Validation failures render as the `1l` inline error using `CUSTOM_ERRORS`
verbatim; note that `CUSTOM_ERRORS.price` is `Leave it blank if you didn't pay`, so **a blank price
is valid**. The primary is `CUSTOM_COPY.cta` (`Add to plan`).

## Verification baseline — derived live on `main` at `1f25436`, 2026-08-12

Run these from the root of **your** worktree. Note the test count is stated as of that commit; if
`main` has advanced when you start, the rule is that the count must not *fall*.

- `npm test` — **PASS, 102 tests across 9 files.** It must still report at least 102 passing.
- `npm run typecheck` — **PASS, 0 errors.** It must stay 0.
  **Never run bare `tsc --noEmit` in this repository.** The root `tsconfig.json` is `"files": []`
  plus project references, so bare `tsc --noEmit` compiles **zero files** and always appears to
  pass. Use `npm run typecheck`, which is `tsc -b --noEmit`.
- `npm run lint` — **KNOWN FAILING, and that is expected.** It reports exactly
  `✖ 21 problems (10 errors, 11 warnings)` in pre-existing application files. That is the accepted
  baseline; it must not get worse. **Do not fix pre-existing lint problems** — out of scope, and it
  enlarges the diff.
- `npm run build` — **PASS, about 29s.** The `chunks are larger than 500 kB` notice is expected and
  is not a failure.
- Browser, Supabase, edge-function, notification and native/Capacitor checks are **BLOCKED**: that
  infrastructure is not available to you. You cannot reach a real database, so you cannot see real
  venues, drinks or prices. Do not attempt these and do not claim them.

Do not run `npm install` or `npm ci`. Your worktree is already provisioned with 430 packages.
Do not run `git commit`, `git push`, or any `supabase` command. Leave your work **uncommitted** in
the worktree — the orchestrator commits the handback.

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
