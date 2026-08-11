# W1-C primitives browser visual acceptance and correction

## Context and authority

Visually accept the existing uncommitted W1-C primitives implementation in the assigned worktree:

`/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives`

That worktree is intentionally warm and contains the DeepSeek implementation being reviewed. Do
not reset, rebase, merge, fast-forward, commit, or replace it. Preserve its current changes and make
only browser-evidence-backed corrections within the allowed files below.

The authoritative references are:

- `/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/1l-form-primitives.png`
- `/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/1l-form-primitives.html`
- `/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/1m-sheet-radio-time-toast.png`
- `/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/1m-sheet-radio-time-toast.html`

The HTML owns literal values and the PNG owns appearance. Use GPT-5.6 Luna visual input and spatial
judgement, not an implementation-only reading of the markup. This is only the W1-C primitive pass.
Another Luna owns `AppContext.tsx`, `PlanTab.tsx`, `TimelineTab.tsx`,
`SortableTimelineItem.tsx`, the 402×874 app evidence, and the final whole-app rerun. Do not inspect
or edit those files, and do not attempt the final app rerun.

Playwright 1.55 and Chromium are already provisioned. From temporary scripts import Playwright via
the absolute module path `/home/oscar/DrinkSmart/node_modules/playwright`; Chromium is cached under
`/home/oscar/.cache/ms-playwright`. Do not install dependencies or change package/lock files.

## Allowed files

Only these application files may change:

- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/onboarding/PreferencesPicker.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/checkbox.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/clock-time-picker.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/dialog.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/input.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/label.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/popover.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/radio-group.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/select.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/sheet.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/sonner.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/switch.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/textarea.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/toast.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/components/ui/toaster.tsx`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/src/index.css`
- `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/traycer-redesign-step2-primitives/tailwind.config.ts`

Do not modify `button.tsx`, `tabs.tsx`, any app screen/state file, the design handoff, dependencies,
or any other tracked file. All temporary runners, showcase source, measurements, and screenshots
must live under `/tmp/drinksmart-luna-visual-review/primitives-a0b2/`; nothing temporary may enter the
repository. The two currently untracked `tsconfig.app.tsbuildinfo` and `tsconfig.node.tsbuildinfo`
files are generated verification output; remove those two files before reporting and create no other
repository artifacts.

## Requirements

1. **Build a reliable isolated showcase.** Create an untracked temporary showcase that imports the
   real worktree primitives and renders at an approximately 1180px-wide desktop reference frame
   with device scale factor 2. Exercise real component state and Radix portals; do not reproduce
   the design with static imitation markup. Capture console errors, page errors, horizontal
   overflow, and measured bounding boxes. Do not call Supabase or any live backend.

2. **Accept and correct the 1l primitive states.** Render and compare resting, focused, filled and
   amber-error Input states; Label; open Select with selected/focused rows; Textarea; checked and
   unchecked Checkbox; on/off Switch; Dialog; and Popover. Verify the literal typography, colours,
   56px row/touch floor, 28px control wells, 64×36 switch, radii, borders/rings, shadows, padding,
   chevrons/checkmarks, overlay and focus behavior against the 1l PNG/HTML. Use browser measurements
   and visual comparison, then correct every objective mismatch within the allowed files while
   preserving exports, props, keyboard behavior, focus behavior and Radix semantics.

3. **Accept and correct the 1m composite states.** Render and compare RadioGroup states,
   PreferencesPicker word-stop rails, ClockTimePicker with selected and cyclic neighbouring values,
   bottom Sheet geometry plus backdrop dismissal and swipe-down dismissal, Radix Toast and Sonner
   Toast including amber warning treatment. Verify the 56px picker rows and actions, 168px clock
   window, 44×4 sheet handle, bottom-sheet radii/padding/shadow/scrim, toast geometry and offset, and
   selected/inactive text and marker treatments against 1m. Exercise interactions rather than
   asserting class names alone. Preserve the existing public APIs and controlled/uncontrolled Radix
   behavior.

4. **Return visual evidence and a reviewable correction diff.** Put final screenshots and concise
   measurements JSON under `/tmp/drinksmart-luna-visual-review/primitives-a0b2/final/`, including
   at least one complete 1l state board, one complete 1m state board, the open Select, open Dialog,
   open and dismissed bottom Sheet evidence, ClockTimePicker, both toast systems, and the
   Preferences rails. Report reference-versus-browser mismatches, corrections, exact files changed,
   interactions exercised, console/page errors, overflow, and any remaining dynamic or
   browser-rendering difference. Do not claim a visual pass without screenshot and measurement
   evidence.

## Verification baseline

- `npm run typecheck` (`tsc -b --noEmit`) must PASS with 0 errors. Never use bare `tsc --noEmit`.
- `npm run lint` is a known FAIL at exactly 9 errors / 12 warnings; it must not get worse.
- `npm run build` must PASS.
- `git diff --check` must PASS.
- No test script or automated test files exist; report automated tests as unavailable, not PASS.
- Live Supabase/backend, notification delivery and native-device verification remain `BLOCKED`.
- No dependency, package, lockfile, design-handoff or tracked showcase changes.

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
