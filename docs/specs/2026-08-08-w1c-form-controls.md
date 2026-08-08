# W1-C — form-control primitives from designs 1l and 1m

## Context and authority

Bring the reusable form vocabulary onto DrinkSmart's global 56px touch scale. Build from
`/home/oscar/DrinkSmart/design_handoff_drinksmart/screens/1l-form-primitives.html` and
`/home/oscar/DrinkSmart/design_handoff_drinksmart/screens/1m-sheet-radio-time-toast.html`.
The literal markup values outrank README prose. Preserve the existing public component exports and
Radix behavior; this is a global primitive restyle, not a redesign of the screens that consume them.

## Allowed files

- `/home/oscar/DrinkSmart/src/index.css`
- `/home/oscar/DrinkSmart/tailwind.config.ts`
- `/home/oscar/DrinkSmart/src/components/ui/input.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/label.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/select.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/textarea.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/checkbox.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/switch.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/radio-group.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/dialog.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/sheet.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/popover.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/clock-time-picker.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/toast.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/toaster.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/sonner.tsx`
- `/home/oscar/DrinkSmart/src/components/onboarding/PreferencesPicker.tsx`

## Requirements

1. Add design 1l's token diff once in `src/index.css` and expose useful Tailwind mappings without
   changing existing token meanings: note type 17px/1.4; control/sheet/chip radii 12/20/8px;
   28px inner controls; 64x36 switches; `rgba(10,11,18,.72)` scrim; and the raised-card field
   ground `#1c1e2c` (`232 18% 14%`). Use these tokens throughout rather than scattering raw values.
2. Restyle Input, Label, Select, and Textarea to the 1l states: fields are at least 56px high,
   radius 12, field ground, 1px neutral edge, 16px horizontal padding, 19px body text and muted
   placeholders; focus is a 2px accent ring with no offset; invalid/error state uses amber, never
   red. Select items and scrolling controls retain Radix keyboard behavior and have 56px rows;
   Textarea is at least 132px with 14px/16px padding and 19px/1.45 text. Do not remove or rename any
   existing export or prop.
3. Restyle Checkbox, Switch, and RadioGroupItem to the drawn inner geometry while preserving their
   existing APIs: checkbox and radio wells are 28px, selected radio dot 14px, switch 64x36 with a
   28px thumb, and focus/disabled states remain accessible. The primitive itself must not shrink a
   consuming row below the 56px global touch floor. Update PreferencesPicker's Sweet and Strong
   controls to the 1m five-stop treatment: selected word at 22px, a 56px stop rail, 20px selected
   dot with 5px halo, 11px inactive dots, and only the two endpoint words at 13px; preserve its
   current numeric values and callbacks.
4. Restyle the overlay primitives without collapsing their behavioral differences. Dialog uses the
   1l centred 20px-radius card, 24px padding, large edge/ambient shadow, and .72 scrim; keep the
   existing close affordance available for dismissable callers so OnboardingModal's existing
   no-close override still works. Sheet keeps every current `side` option, but its bottom variant
   follows 1m: bottom anchored, top corners 20px, 10px 20px 20px padding, 44x4 grab handle, backdrop
   dismissal and swipe/down Radix behavior; do not force current explicit left/right callers to
   become bottom sheets. Popover uses a 14px card, 18px padding, neutral edge plus medium ambient
   shadow, and no 40px-scale descendants introduced by the primitive.
5. Finish the remaining 1m primitives without changing application state ownership. ClockTimePicker
   uses two 56px-row columns, 15-minute stops only, a fixed 56px accent selection band, 22px adjacent
   values, 28px selected values, and a one-tap 56px `Now` control while retaining its `value`,
   `onChange`, and `className` contract. Radix toast and Sonner toast both render in the 20px gutters,
   12px above the bottom tab bar, as 64px-min cards with 19px copy and one 56px reversal action;
   default auto-dismiss is 5 seconds, and the amber variant changes only edge/text, never the
   ground. Remove red/destructive toast styling. Do not redesign Onboarding, Profile, Auth,
   DrinksTab, MenuScanner, or any other consumer in this task.

## Verification baseline

- `npm run typecheck` (`tsc -b --noEmit`) must PASS with 0 errors. Never use bare `tsc --noEmit`.
- `npm run lint` is a known FAIL at exactly 9 errors and 12 warnings; it must not get worse.
- `npm run build` must PASS.
- Browser, Supabase, edge-function, notification, and native verification are BLOCKED. Do not call
  static or bundle checks functional verification.


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
