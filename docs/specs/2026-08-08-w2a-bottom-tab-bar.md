# W2-A — bottom tab bar and header removal

## Context and authority

Replace Dashboard's centred title/top tabs with the persistent three-item bottom navigation drawn
throughout the handoff, especially designs 1d, 1m, 1n, and 1o. Literal values come from those HTML
files and `/home/oscar/DrinkSmart/design_handoff_drinksmart/README.md` section “Chrome common to all
screens.” Preserve the controlled Radix tab state and the current mount behavior of all tab panels.

## Allowed files

- `/home/oscar/DrinkSmart/src/pages/Dashboard.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/tabs.tsx`

## Requirements

1. Remove the `DrinkSmart` heading, tagline, and top tab strip. Make Dashboard/Tabs a mobile-first
   full-height flex column: the selected panel occupies and scrolls within the area above the
   navigation, while the bottom bar remains visible and flush to the viewport bottom. Keep the
   existing max-width behavior sensible on larger screens and do not duplicate the body's existing
   safe-area padding.
2. Restyle TabsList as the bottom bar: full width, three equal columns, minimum height 58px, no
   pill/background inset, no rounded container, no padding, and a 1px `#292b31`/secondary top rule.
   Restyle TabsTrigger as a column with a 22px icon, 13px label, 5px gap, and no filled tab surface
   or shadow. Inactive is `#75798c` at weight 400; active is `#b5abfc` at weight 500 with the icon's
   meaningful interior filled where shown in the prototype.
3. Render Profile, Plan, and Timeline in that order with appropriate existing Lucide icons and the
   exact labels. Preserve `plan` as the initial tab, the controlled `activeTab` flow, and
   `PlanTab.onPlanReady` switching to Timeline. Pass TimelineTab's existing optional `onNext` prop a
   callback that returns to Plan so its redesigned footer can navigate without adding a new shared
   interface.
4. Preserve keyboard tab activation, focus-visible treatment, disabled behavior, aria semantics,
   and the three existing TabsContent nodes. Do not conditionally render panels or introduce React
   keys that reset their local state. TabsContent must contribute no obsolete top-tab margin.
5. Do not change Profile, PlanTab, TimelineTab, onboarding, global CSS, or any other file. Do not add
   a header, floating navigation, new route, dependency, palette color, red, green, or filled
   primary surface.

## Verification baseline

- `npm run typecheck` (`tsc -b --noEmit`) must PASS with 0 errors. Never use bare `tsc --noEmit`.
- `npm run lint` is a known FAIL at exactly 9 errors and 12 warnings; it must not get worse.
- `npm run build` must PASS.
- Browser verification is BLOCKED, so the fixed-bottom/scroll relationship remains visually
  unverified. Supabase and native verification are also BLOCKED.


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
