# W4-3 AMENDMENT 1 — the six chips in `4c` are families, not raw category keys

This amends the spec you are already working from
(`docs/specs/2026-08-12-w4-3-onboarding.md`). **Everything else in that spec stands unchanged.**
Only clause 4's first paragraph is replaced.

You are right that the data and the drawing disagree, and the spec was wrong to imply otherwise.

## The defect

Clause 4 said "Six 56px category chips … from `preferenceCategoryKeys` in `src/lib/preferences.ts`".
Those two things are not the same. `preferenceCategoryKeys` is
`Object.keys(drinkCategories).filter(key => key !== "custom")`, which yields **18** fine-grained
keys: `beer_pint`, `beer_bottle`, `cocktails`, `spritz`, `wine_red`, `wine_white`, `wine_rose`,
`wine_sparkling`, `cider`, `alcopops`, `gin`, `vodka`, `rum`, `whiskey`, `tequila`, `liqueurs`,
`brandy`, `shots`.

`4c` draws **six** chips: `Beer`, `Wine`, `Spirits`, `Cider`, `Cocktails`, `Low & no`. Those are
display families that group the 18 keys. Do not render 18 chips, and do not silently drop 12 keys.

## Replacement for clause 4, first paragraph

**4a. Render exactly the six drawn chips, as families over the existing keys.**
Six 56px chips in a 2-column grid, gap 10. Selected is `box-shadow: 0 0 0 2px #9184d9` with a 15px
accent tick; unselected is `0 0 0 1px #383a46`. Selecting a family selects **every key it covers**,
so what is written to `PreferenceData.categories_liked` remains the existing fine-grained keys and
nothing downstream has to change:

| Chip | Keys it covers |
| --- | --- |
| `Beer` | `beer_pint`, `beer_bottle` |
| `Wine` | `wine_red`, `wine_white`, `wine_rose`, `wine_sparkling` |
| `Spirits` | `gin`, `vodka`, `rum`, `whiskey`, `tequila`, `brandy`, `liqueurs`, `shots` |
| `Cider` | `cider` |
| `Cocktails` | `cocktails`, `spritz` |
| `Low & no` | **no keys — see 4b** |

Define that mapping as a single exported constant inside your own new file under
`src/components/onboarding/`. **Do not add it to `src/lib/preferences.ts`** — that file is outside
your allowlist and remains so.

A chip reads as selected when **any** of its keys is in `categories_liked`; deselecting it removes
all of them. This keeps the round trip lossless for a user who onboarded before this change.

**4b. `Low & no` sets strength, not a category, because no such category exists.**
There is deliberately no non-alcoholic category in `drinkCategories`, and one must not be added:
a 0% ABV entry contributes no ethanol, takes 0% of the target and 0 minutes, and would cluster at
`t=0`. Supporting it needs a separate entry type in the engine, which is **out of scope for Wave 4**.

So `Low & no` covers no keys. Instead, selecting it sets `PreferenceData.strong` to its lowest stop
(`0`), which is the existing engine input that already means exactly this. Deselecting it returns
`strong` to its previous value. This is honest — it records the preference the user expressed, using
a field the planner already reads — and it keeps the drawn 2 × 3 grid intact.

Do not add a key, a category, a migration, or a new field to `PreferenceData` for this.

## Everything else is unchanged

The word-stops, the `I have no preferences` ghost row, the completion path, the file allowlist, the
verification baseline and the scope rules in the original spec all stand exactly as written. In
particular you still may not modify `src/lib/preferences.ts`, `src/pages/Profile.tsx`, or anything
under `src/components/ui/`.

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
