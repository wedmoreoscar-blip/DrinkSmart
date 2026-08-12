# W4-1 — Numeric keypad field group primitive (design `4o`)

You are implementing one new, self-contained React primitive for the DrinkSmart frontend
redesign. It has **no existing call sites** and you must not add any. Two other agents are
concurrently building the screens that will consume it; your only job is the component itself.

Your worktree: `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_0`
Your branch: `deepseek_agent_0`

## Design authority — read before writing any code

The **active** authority is, by absolute path:

```
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4o-keypad-field-group.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/README.md   (section "New primitive — numeric keypad field group (4o)", ~line 450)
```

Read the trailing `<script>` block of `4o-keypad-field-group.html`. It is not decoration — it
carries the literal rules (`KEYPAD_RULES`), the action-label function, the gap glyph, the decimal
rule and the clamp table.

**NEVER** read or use `/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart_depreciated/`.
That bundle is retained only as history and is not current authority.

## Standing design constraints (LOCKED — `docs/decisions.md`)

- Dark only. The light theme is deliberately unreachable; never re-enable or reference it.
- One accent, no palette. **No red, no green anywhere.** Amber `#d29a51` is a remark, not an alarm.
- 19px (`text-body`) is the floor for anything the user reads. 13px (`text-micro`) carries units
  and labels only — never an answer.
- Nothing tappable under 56px.
- Reach for the existing token, not a raw hex. Confirmed available Tailwind classes in this repo:
  `h-tap` (56px), `h-act` (64px), `w-tap`, `rounded-ctl` (12px), `rounded-lg` (14px),
  `text-micro` (13px), `text-label` (15px), `text-note` (17px), `text-body` (19px),
  `text-lead` (22px), `text-title` (28px), `bg-field`, `bg-card`, `text-primary`,
  `text-muted-foreground`, `border-primary`, `text-warning`, `border-warning`.
  Raw hex is acceptable **only** for the design's named one-offs: `#1c1e2c`, `#75798c`, `#d29a51`,
  `#383a46`, `#9184d9`, `#b5abfc`, `#b2b6ca`, `#e9e9ed`, `#232532`.
- Do not add any dependency, and do not modify `package.json` or `package-lock.json`.

## Files you may modify

Create exactly one new file:

- `src/components/ui/keypad-field-group.tsx`

**No other file may be created or modified.** Do not add a call site, do not import this component
anywhere, do not touch `src/components/ui/index` barrels (there are none), and do not edit any
existing screen.

## Clauses

**1. Export the exact API from `4o`'s script block.**
Export a named `KeypadFieldGroup` React component and a named `KeypadField` type. The props are
exactly:

```ts
export type KeypadField = {
  key: string;
  unit: string;              // "%", "ml", "£"
  value: number | null;      // null renders the amber gap well
  max?: number;
  integer?: boolean;
};

export type KeypadFieldGroupProps = {
  fields: KeypadField[];
  onCommit: (key: string, value: number | null) => void;
  onAdvance?: () => void;    // called on submit when no gap remains in this group
  emptyIsAllowed?: boolean;  // 4i saves with gaps left; 4f does not
  title?: string;            // group card heading, e.g. "Camden Hells"
  note?: string;             // 13px right-aligned status, e.g. "price unread"
  className?: string;
};
```

Follow the repository's existing primitive style: `React.forwardRef` is not required, but use
`cn()` from `@/lib/utils` for class composition exactly as `src/components/ui/button.tsx` and
`src/components/ui/input.tsx` do.

**2. Render the well row to the drawn geometry.**
A group card (`#232532`, radius 14, padding `14px 16px 16px`) containing an optional title row —
title 22px `#e9e9ed` on the left, `note` 13px `#75798c` on the right — then one row of wells with
`gap: 8px`, then a row of unit labels with `gap: 8px` and `margin-top: 6px`.

Each well is min-height 56px, radius 12, ground `#1c1e2c`, value 19px tabular
(`font-variant-numeric: tabular-nums`), centred. Exactly three well states, and they are mutually
exclusive:

| State | Treatment |
| --- | --- |
| Resting (has a value, not focused) | `box-shadow: 0 0 0 1px #383a46`, value `#e9e9ed` |
| Gap (`value === null`, not focused) | `box-shadow: 0 0 0 1px #d29a51`, renders the em dash `—` in `#d29a51` |
| Focused | `box-shadow: 0 0 0 2px #9184d9` plus a 2px × 24px `#9184d9` caret element after the value |

A gap well **renders `—`, never an empty box and never `0`.** Unit labels are 13px `#75798c`,
centred under their own well.

**3. Render the keypad to the drawn geometry, and make it the only input route.**
Below the wells: a 3-column grid, `gap: 8px`, keys `1 2 3 4 5 6 7 8 9 . 0 ⌫` in that order. Every
key is min-height **64px** (not 56px — `4o` states this is deliberate), radius 12, `#1c1e2c`,
`box-shadow: 0 0 0 1px #383a46`, 28px tabular; the backspace glyph is `#b2b6ca`. There are no
letters.

Beneath the keypad, one action key: min-height 64px, radius 14, `1px solid #9184d9`, 22px/500
`#b5abfc`.

The wells must not be native `<input>` elements and must not raise the OS keyboard — this keypad
replaces it. Wells are `<button type="button">`; tapping one focuses it.

**4. Implement the group behaviours, which are the reason this is a primitive.**
- The `.` key is suppressed for a field with `integer: true` (`4o`'s `allowDecimal` rule makes `ml`
  an integer). Render it disabled rather than removing it, so the grid keeps its shape.
- Digits append to the focused well's working string; `⌫` removes the last character. When the
  working string becomes empty, the value returns to `null` and the well returns to the gap state.
- Clamp on commit using `4o`'s table: `abv [0, 60]`, `serve [25, 1000]`, `price [0, 999]`, matched
  on `field.key`. A `max` prop, when given, overrides the table's upper bound. A key not in the
  table and with no `max` is not clamped.
- Call `onCommit(key, value)` whenever the focused well's value changes.
- **Submit means "next gap".** The action key advances focus to the next well whose value is
  `null`, searching from the focused well forward and then wrapping to the start of the group. When
  the group has no remaining gap, the action key calls `onAdvance` instead.
- The action key's label is `4o`'s `actionLabel`: **`Next gap`** while a gap remains in the group,
  **`Done`** when none does. When `emptyIsAllowed` is false, `Done` is still shown and still calls
  `onAdvance` — this component does not block submission; its consumer decides.

**5. Keep it presentational and accessible.**
No data fetching, no Supabase, no React Query, no router, no toast. State is local `useState`
only. Give each well `aria-label` combining the field key and its unit, and mark the focused well
`aria-current="true"`. Keys get `type="button"` so they never submit a surrounding form.

## Verification baseline — derived live on `main` at `1f25436`, 2026-08-12

Run these from the root of **your** worktree.

- `npm test` — **PASS, 102 tests across 9 files.** It must still report exactly 102 passing.
- `npm run typecheck` — **PASS, 0 errors.** It must stay 0.
  **Never run bare `tsc --noEmit` in this repository.** The root `tsconfig.json` is `"files": []`
  plus project references, so bare `tsc --noEmit` compiles **zero files** and always appears to
  pass. Use `npm run typecheck`, which is `tsc -b --noEmit`.
- `npm run lint` — **KNOWN FAILING, and that is expected.** It reports exactly
  `✖ 21 problems (10 errors, 11 warnings)` in pre-existing application files. This is the accepted
  baseline. It must not get worse. **Do not fix pre-existing lint problems** — that is out of scope
  and enlarges the diff.
- `npm run build` — **PASS, about 29s.** The `chunks are larger than 500 kB` notice is expected and
  is not a failure.
- Browser, Supabase, edge-function, notification and native/Capacitor checks are **BLOCKED**: that
  infrastructure is not available to you. Do not attempt them and do not claim them.

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
