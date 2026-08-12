# W4-3 — Onboarding, two steps (designs `4b` and `4c`, request §C)

You are rebuilding DrinkSmart's first-run onboarding to match its Claude Design drawings. Today it
is a single scrolling dialog that shows both forms at once. The drawings make it **two sequential
steps** in a bottom-anchored, non-dismissable dialog.

Your worktree: `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_2`
Your branch: `deepseek_agent_2`

## Design authority — read before writing any code

The **active** authority, by absolute path:

```
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4b-onboarding-stats.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4b-onboarding-stats.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4c-onboarding-taste.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4c-onboarding-taste.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/README.md   (section "§C — Onboarding, two steps (4b, 4c)", ~line 291)
```

Also read `screens/1l-form-primitives.html` (dialog, text input, numeric + unit toggle, select) and
`screens/1m-sheet-radio-time-toast.html` (word-stops).

**Read the trailing `<script>` blocks of `4b` and `4c`.** They carry the literal copy objects
`ONBOARD1_COPY`, `ONBOARD1_ERRORS`, `ONBOARD2_COPY` and `ONBOARD2_STOPS`. Those strings are exact
and authoritative — use them verbatim, do not paraphrase them.

**NEVER** read or use `/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart_depreciated/`.
It is history, not current authority.

## Standing design constraints (LOCKED — `docs/decisions.md`)

- Dark only. The light theme is deliberately unreachable; never reference or re-enable it.
- One accent, no palette. **No red, no green anywhere.** Amber `#d29a51` is the error colour and is
  a remark, not an alarm.
- 19px (`text-body`) is the floor for anything the user reads. 13px (`text-micro`) carries the step
  indicator, footnote and unit labels only — never an answer.
- Nothing tappable under 56px. **Exactly one 64px primary action per step** (`Continue`, then
  `Start`).
- Reach for the token, not the hex. Confirmed classes: `h-tap` (56px), `h-act` (64px),
  `rounded-ctl` (12px), `rounded-lg` (14px), `rounded-sheet` (20px),
  `text-micro`/`text-label`/`text-note`/`text-body`/`text-lead`/`text-title`, `bg-field`,
  `text-muted-foreground`, `text-primary`. `<Button size="act">` is the 64px primary.
- Compose the existing `src/components/ui/*` primitives. Do not fork them, do not add a component
  library, do not add any dependency, do not modify `package.json` or the lockfile.

## Files you may modify

- `src/components/onboarding/OnboardingModal.tsx`
- `src/components/onboarding/StatsForm.tsx`
- `src/components/onboarding/PreferencesPicker.tsx`
- Any **new** file you create under `src/components/onboarding/`.

**No other file may be created or modified.** In particular:

- **Do not modify `src/pages/Profile.tsx`.** Another agent is rewriting it concurrently in this
  same wave. It currently imports `StatsForm` and `PreferencesPicker`; by the end of this wave it
  will import only `PreferencesPicker`.
- **`PreferencesPicker`'s exported props are a fixed contract you must not break:** `initial`,
  `onChange`, `onSubmit`, `submitLabel`, `submitting`, typed as they are today. You may change the
  component's internals and appearance freely, and you may **add** optional props, but you must not
  rename, remove, or change the type of an existing one. `Profile.tsx` renders it as
  `<PreferencesPicker initial={preferences} onChange={handlePreferencesChange} />` and that call
  must keep compiling.
- `StatsForm` has no such constraint after this wave — the Profile agent is removing its import —
  so you may reshape it freely for the dialog. Keep it exported by the same name from the same path.
- Do not modify `src/hooks/useUserMetrics.ts`, `src/lib/preferences.ts`, `src/pages/Dashboard.tsx`,
  or anything under `src/components/ui/`.

## Clauses

**1. Turn the modal into two sequential steps in the `1l` dialog shell.**
The dialog is **bottom-anchored with 16px margins** over an `rgba(10,11,18,.72)` scrim: panel
`#232532`, radius 20, padding 24, box-shadow
`0 0 0 1px rgba(147,151,171,.5), 0 16px 40px rgba(8,9,14,.65)`.

It is **non-dismissable: no X, no cancel, no backdrop tap, no Escape.** The current file already
achieves this with `onPointerDownOutside`/`onEscapeKeyDown` preventers and the
`[&>button.absolute]:hidden` class that hides shadcn's auto-rendered Close button — **keep that
class**; it is brittle and deliberate, and removing it makes onboarding dismissable.

Each step renders a 13px/0.09em uppercase step indicator (`1 of 2`, then `2 of 2`), a 28px/500
title, and a 19px `#b2b6ca` body, using the exact strings from `ONBOARD1_COPY` / `ONBOARD2_COPY`.
Step 1's primary advances to step 2; step 2's primary completes onboarding.

**2. Build step 1 as exactly four fields — and no fifth.**
Weight and height each use the `1l` **numeric + unit** pattern: a 22px tabular value field beside a
segmented unit control of two 60 × 56 halves in one `1px #383a46` pill, radius 12, the active half
`#2b2741` with a `#b5abfc` 500-weight label. Weight toggles `kg` / `lb`; height toggles `cm` / `ft`.

Age and sex sit side by side in a 2-column grid, gap 10. **Sex is the `1l` select, not a segmented
pair** — the list is expected to grow, and a two-option segment reads as a preference rather than a
fact about the body.

**There is no fifth field, and body fat is never asked about or mentioned in first-run.** Do not add
a body-fat input, an estimate, or a default. It belongs only to the FFMI path in Profile.

Below the primary, the 13px centred footnote from `ONBOARD1_COPY.footnote`.

**3. Keep `Continue` enabled and validate on tap.**
The 64px primary **stays enabled at all times** — a dead primary in a bar is a dead end. On tap it
validates; when a field fails, show the `1l` inline error beneath it: 17px `#d29a51` with a 20px
warning glyph, 10px gap, and the field takes `box-shadow: 0 0 0 1px #d29a51` with its label in
`#d29a51`.

Error strings come verbatim from `ONBOARD1_ERRORS`: weight `Between 40 and 250 kg`, height
`Between 120 and 220 cm`, age `18 or over`. **An error names what is needed, never what the user
did wrong.** This replaces the current behaviour, where the button is `disabled={!statsValid}`.

**4. Build step 2 as six chips, the word-stops, and a real way out.**
Six 56px category chips in a 2-column grid, gap 10, from `preferenceCategoryKeys` in
`src/lib/preferences.ts`. Selected is `box-shadow: 0 0 0 2px #9184d9` with a 15px accent tick;
unselected is `0 0 0 1px #383a46`.

Then the `1m` sweetness word-stops: five stops, **only the chosen word rendered**, at 22px above the
track, with 13px `#75798c` anchors `dry` and `sweet` at the ends. The five words are exactly
`ONBOARD2_STOPS` = `["dry","dry-ish","middling","sweet-ish","sweet"]`. The existing `WordStopRail`
in `PreferencesPicker.tsx` (~line 38) already implements this geometry — reuse it rather than
writing a second one.

Beneath the 64px `Start`, a 56px ghost row reading exactly `I have no preferences` — **not "Skip"**,
because skipping implies something was owed. It writes taste as null and `categories_liked: []` and
then completes onboarding by the same path as `Start`.

**5. Preserve the completion path and its guards exactly.**
Completion still calls `completeOnboarding(stats, prefs)` from `useUserMetrics()`, still checks
`isLoggedIn` first and surfaces the existing "Not signed in" toast when the anonymous session has
not bootstrapped, still calls the `onComplete` prop on success, and still surfaces the existing
failure toast. Do not change `OnboardingModal`'s own props (`open`, `onComplete`) — `Dashboard.tsx`
renders it and you may not modify that file.

## Verification baseline — derived live on `main` at `1f25436`, 2026-08-12

Run these from the root of **your** worktree.

- `npm test` — **PASS, 102 tests across 9 files.** It must still report exactly 102 passing.
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
  infrastructure is not available to you. You cannot reach a real database, so you cannot verify
  that onboarding actually persists. Do not attempt these and do not claim them.

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
