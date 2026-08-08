# W2-B — Plan screen and four-band buzz picker

## Context and authority

Replace the old 1–10 slider/timing cards with the paired 1n/1o Plan design. Build from
`/home/oscar/DrinkSmart/design_handoff_drinksmart/screens/1n-buzz-picker-four-band.html` and
`1o-buzz-picker-heavy.html`; they supersede 1c. Preserve the deterministic engine and the existing
generate/fallback/persistence flows. This task owns only Plan presentation and buzz-level data.

## Allowed files

- `/home/oscar/DrinkSmart/src/components/tabs/PlanTab.tsx`
- `/home/oscar/DrinkSmart/src/data/buzzLevels.ts`

## Requirements

1. Delete buzz levels 8–10 from `buzzLevels`; levels 1–7 retain their existing BAC values so no BAC
   formula changes. Make the deleted persisted values 8–10 safely resolve to level 7 during
   hydration through `getBACForLevel`, while still rejecting genuinely invalid/non-finite levels.
   In PlanTab normalize any current state above 7 to 7 and clamp `lastSession.buzz_level` before
   calling `updateInebriationLevel`; do not change `AppContext`, `useLastSession`, the Supabase
   schema, or the `drinksmart.session.v1` key/version.
2. Replace the slider, numeral, gradients, and warning with four 72px-min cards at 10px gaps:
   Light 1–2 / “warm, unchanged” / 0.01–0.06%; Social 3–4 / “talkative, still sharp” /
   0.06–0.12%; Loose 5–6 / “clumsy by the end” / 0.12–0.20%; Heavy 7 / “gaps in the night” /
   0.20–0.25%. Cards use 14px 18px padding, card ground, radius 14; selection is only a 2px accent
   ring. A band tap selects its lower level by default. For the two-level bands, show 56px
   `softer`/`stronger` controls that select the lower/upper level; remove that row from the DOM for
   Heavy. Heavy has no amber, warning, confirmation, or exceptional styling.
3. Match the paired-frame geometry: 402x874 reference padding is 22px 20px 0; the fading rule has
   10px top/8px bottom margins; the nudge row has 10px top margin; the duration block has 14px top
   margin; the spacer above the target card is `margin-top:auto`. In both Social and Heavy states
   the target card begins at y=610 and `Build the night` begins at y=738. The removed 66px Heavy
   nudge row is absorbed entirely by the spacer, so the 64px primary action never jumps.
4. Replace the timing slider/presets with the drawn `OVER` block: tabular 44px duration, 19px
   start→finish line, and two 56x56 radius-12 minus/plus buttons. Use 30-minute increments over an
   inclusive 1h–8h range while preserving the existing start/target Date updates. Put the fading
   rule and centred 13px text `the scale ends here` directly under Heavy. Remove the rapid-danger
   warning and every red/green/orange gradient class.
5. Add the 1n/1o 38x88 mini vessel target card inside PlanTab using current deterministic
   `targetEthanolMl`: neutral 1px edge, radius 12, accent fill at .85 opacity, target line at 78%,
   and 900ms liquid transition; card ground is `#1c1e2c`, radius 14, padding 14px 18px. Keep the ml
   figure and derived plain-language note connected to live state, with amber text only when the
   plan exceeds target. The 64px outlined action says `Build the night` and invokes the existing
   generate/apply/fallback flow. Preserve “Use last night,” regeneration, menu scanning, and the
   embedded DrinksTab behavior without refactoring DrinksTab or trusting model arithmetic.

## Verification baseline

- `npm run typecheck` (`tsc -b --noEmit`) must PASS with 0 errors. Never use bare `tsc --noEmit`.
- `npm run lint` is a known FAIL at exactly 9 errors and 12 warnings; it must not get worse.
- `npm run build` must PASS.
- Browser verification—including the exact y=610/y=738 paired-frame comparison—is BLOCKED.
  Supabase persistence verification is BLOCKED. Static checks are not functional verification.


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
