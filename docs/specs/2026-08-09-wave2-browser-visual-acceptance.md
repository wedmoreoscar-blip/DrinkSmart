# Wave 2 browser visual acceptance and correction

## Context and evidence

Wave 2 is integrated on `main` at commit `91b88a6`. This is the first real browser acceptance pass;
the prior verification was typecheck/build/static only. Use Luna visual input and spatial judgement,
not an implementation-only reading of the HTML.

Compare the application against these authoritative reference pairs at a **402×874 CSS-pixel
viewport with device scale factor 2**:

- `/home/oscar/DrinkSmart/design_handoff_drinksmart/screens/1n-buzz-picker-four-band.png` and `.html`
- `/home/oscar/DrinkSmart/design_handoff_drinksmart/screens/1o-buzz-picker-heavy.png` and `.html`
- `/home/oscar/DrinkSmart/design_handoff_drinksmart/screens/1d-timeline.png` and `.html`
- `/home/oscar/DrinkSmart/design_handoff_drinksmart/screens/1l-form-primitives.png` and `.html`
- `/home/oscar/DrinkSmart/design_handoff_drinksmart/screens/1m-sheet-radio-time-toast.png` and `.html`

The root orchestrator's first captured application renders are available at:

- `/tmp/drinksmart-visual/plan-default.png`
- `/tmp/drinksmart-visual/plan-heavy.png`

Those renders already prove the app shell is 402×874 with a 58px bar at y=816 and the Plan primary
action is 362×64 at x=20/y=740 in both default and Heavy states. They also exposed a real browser
failure: with a populated profile, `MetricsSync` repeatedly calls an unstable
`updateUserMetrics` dependency and React reports `Maximum update depth exceeded`. Fix that blocker
before trusting later interaction screenshots.

Do not call the real Supabase project. Intercept/mock auth and REST responses in the browser runner.
The runner may be temporary and must not become a project dependency or tracked fixture.

## Allowed files

Only these application files may change:

- `/home/oscar/DrinkSmart/src/contexts/AppContext.tsx`
- `/home/oscar/DrinkSmart/src/components/MetricsSync.tsx`
- `/home/oscar/DrinkSmart/src/pages/Dashboard.tsx`
- `/home/oscar/DrinkSmart/src/components/tabs/PlanTab.tsx`
- `/home/oscar/DrinkSmart/src/components/tabs/TimelineTab.tsx`
- `/home/oscar/DrinkSmart/src/components/tabs/SortableTimelineItem.tsx`
- `/home/oscar/DrinkSmart/src/components/onboarding/PreferencesPicker.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/button.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/checkbox.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/clock-time-picker.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/dialog.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/input.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/label.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/popover.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/radio-group.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/select.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/sheet.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/sonner.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/switch.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/tabs.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/textarea.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/toast.tsx`
- `/home/oscar/DrinkSmart/src/components/ui/toaster.tsx`
- `/home/oscar/DrinkSmart/src/index.css`
- `/home/oscar/DrinkSmart/tailwind.config.ts`

No other file may change. Temporary browser scripts, screenshots, and a primitive showcase must live
under `/tmp/drinksmart-luna-visual-review` and be removed after the assigning agent accepts the
review. Do not alter the design handoff files.

## Requirements

1. **Make browser review reliable.** Fix the populated-profile `MetricsSync` update loop with the
   smallest semantic change. Render through the real Dashboard and AppProvider using mocked network
   responses. The accepted browser run has no React maximum-depth warning, uncaught page error,
   horizontal overflow, or document/body overflow beyond 402×874; each tab remains reachable.

2. **Accept and correct Plan plus chrome against 1n/1o.** Capture a level-4 Social/stronger frame
   and a Heavy frame at 402×874. Compare overlays or measured coordinates as well as appearance.
   The nudge pair is absent for Heavy; the target card and 64px action remain at the same y in both
   frames; the action is the drawn accent outline/text, not white; the bottom bar is 58px at the
   viewport bottom with correct icon fill/labels. Fix every objective mismatch in allowed files,
   but do not tune user-dependent target numbers or clock values to screenshot literals.

3. **Accept and correct Timeline against 1d.** Seed deterministic local session/profile data and
   capture the real Timeline tab with past/current/future/locked rows. Verify the hero stays fixed
   while only the spine scrolls, the now rule and x=97 spine align, current/locked/past/future/break
   treatments match the design vocabulary, footer actions are 56px, and the bottom tab bar remains
   visible. Exercise tab switching, timeline scroll, the lock control, and keyboard/pointer DnD for
   an eligible future row. Do not invent `Had it` or `+15` engine behavior.

4. **Accept and correct W1-C primitives against 1l/1m.** Use an untracked temporary showcase that
   imports the real primitives. Render resting/focused/filled/error fields, open Select, textarea,
   checkbox/switch/radio states, Dialog, bottom Sheet including drag-down dismissal, Popover,
   ClockTimePicker including cyclic neighbours, Preferences word-stop rails, Radix toast and Sonner
   toast. Measure 56px touch targets and drawn inner geometry. Correct only objective differences
   supported by the PNG/HTML; preserve public APIs and Radix behavior.

5. **Return visual evidence, not assertions alone.** Put final screenshots and a concise measurements
   JSON under `/tmp/drinksmart-luna-visual-review/final/`. Report before/after mismatches, changed
   files, interactions exercised, console/page errors, and any remaining difference that is caused
   by dynamic data rather than layout. Browser checking is required for this task; Supabase/live
   backend, notification delivery, and native hardware remain BLOCKED.

## Verification baseline

- `npm run typecheck` (`tsc -b --noEmit`) must PASS with 0 errors. Never use bare `tsc --noEmit`.
- `npm run lint` is a known FAIL at exactly 9 errors / 12 warnings; it must not get worse.
- `npm run build` must PASS.
- `git diff --check` must PASS.
- No dependency or lockfile changes.


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
