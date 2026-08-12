# W4-6 — Menu scanner (designs `4g`, `4h`, `4i`, `4j`, request §E)

You are rebuilding DrinkSmart's menu scanner to match its four Claude Design drawings: capture,
waiting, review and failure. The review screen is the hard one, and the whole answer is the sort
order.

Your worktree: `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_4`
Your branch: `deepseek_agent_4`

## Design authority — read before writing any code

The **active** authority, by absolute path:

```
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4g-scanner-capture.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4g-scanner-capture.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4h-scanner-waiting.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4h-scanner-waiting.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4i-scanner-review.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4i-scanner-review.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4j-scanner-failed.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4j-scanner-failed.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/README.md   (section "§E — Menu scanner (4g, 4h, 4i, 4j)", ~line 358)
```

Also read `screens/1m-sheet-radio-time-toast.html` (the toast) and
`screens/4o-keypad-field-group.html` (the keypad you will call — `4i` is the reason it exists).

**Read the trailing `<script>` blocks of all four.** They carry `SCAN_CAPTURE_COPY`,
`SCAN_WAIT_COPY`, `SCAN_REVIEW_COPY`, `SCAN_FAIL_COPY`, the `WORDS` table and the correction model.
Those strings are exact — use them verbatim, do not paraphrase.

**NEVER** read or use `/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart_depreciated/`.
It is history, not current authority.

## Standing design constraints (LOCKED — `docs/decisions.md`)

- Dark only. The light theme is deliberately unreachable; never reference or re-enable it.
- One accent, no palette. **No red, no green anywhere.**
- 19px (`text-body`) is the floor for anything the user reads. 13px (`text-micro`) carries the unit
  labels under the wells, the reason labels, counts and footnotes only — never an answer.
- Nothing tappable under 56px. **Exactly one 64px primary action per screen.**
- Reach for the token, not the hex. Confirmed classes: `h-tap` (56px), `h-act` (64px),
  `rounded-ctl` (12px), `rounded-lg` (14px),
  `text-micro`/`text-label`/`text-note`/`text-body`/`text-lead`/`text-title`, `bg-field`,
  `text-muted-foreground`, `text-primary`, `text-warning`. `<Button size="act">` is the 64px primary.
- Compose the existing `src/components/ui/*` primitives. Do not fork them, do not add a component
  library, do not add any dependency, do not modify `package.json` or the lockfile.

## Files you may modify

- `src/components/tabs/MenuScannerTab.tsx`
- `src/lib/cameraService.ts`
- Any **new** file you create under `src/components/scanner/` (this directory does not yet exist;
  create it). Prefer putting each of the four states in its own file over growing
  `MenuScannerTab.tsx`, which is already ~713 lines.

**No other file may be created or modified.** In particular:

- **Do not modify `src/components/tabs/PlanTab.tsx`.** It mounts `MenuScannerTab` today, and the
  orchestrator owns the navigation wiring for this wave. `MenuScannerTab`'s existing
  `onNext: () => void` prop must keep working; you may **add** optional props but must not rename or
  remove `onNext`.
- **Do not modify `src/components/tabs/DrinksTab.tsx`** or anything under
  `src/components/establishments/` — other agents are working there concurrently.
- **Do not modify `src/components/ui/keypad-field-group.tsx`.** It already exists on your branch and
  is the `4o` primitive; you are a *caller*, not its author.
- Do not modify `src/hooks/useEstablishments.ts`, `supabase/functions/parse-menu/index.ts`, or
  anything under `src/components/ui/`.

## Clauses

**1. Remove the tab bar from all four states, and say the one thing that prevents most failures.**
**No tab bar on any of the four** — this is a flow entered from the establishments screen and left
by an X, and the tabs would offer a fourth way out of a three-way screen.

Capture (`4g`): corner brackets 34px, 2px `#e9e9ed`, inset 26px, with
`SCAN_CAPTURE_COPY.guidance` at 17px `#e9e9ed` on an `rgba(10,11,18,.72)` pill **inside** the
viewfinder — before the shutter, not after a failure. Then the 64px `SCAN_CAPTURE_COPY.shutter` and
the 56px ghost `SCAN_CAPTURE_COPY.pick`. Keep using the existing `takePhoto` and `pickFromGallery`
from `@/lib/cameraService` (already imported at line 25 of `MenuScannerTab.tsx`); you may edit that
file only if the two states genuinely need a different signature.

**2. Make waiting leavable, and let the result land as a toast.**
The 64px primary is `SCAN_WAIT_COPY.leave` (`Keep planning`) — **waiting is not a wall.** The parse
continues in the background and its result arrives as a `1m` toast reading
`SCAN_WAIT_COPY.doneToast(n)` with the action `Check`. **Do not block the app while parsing.**
If the user is still on this screen when it lands, go straight to the review state.

Motion is a 90° `#9184d9` arc on a 52px `#292b31` ring, **one rotation per 1.8s, linear, no pulse
and no easing bounce** — the only moving thing on the screen. `SCAN_WAIT_COPY.estimate` is replaced
by `SCAN_WAIT_COPY.slowNote` after 20s; a timeout at 45s goes to the failure state.

**3. Build the review screen around the sort order, because that is the whole answer.**
Header: `SCAN_REVIEW_COPY.count(n)` at 28/500 with a gaps tag (`SCAN_REVIEW_COPY.gaps(n)`, 13px
`#d29a51` on `rgba(210,154,81,.14)`, **hidden at zero**), then `SCAN_REVIEW_COPY.lead(n)` at 17px.

**Sort by what is missing, never alphabetically.** Rows with gaps come first and are tall: name
22px, reason at 13px `#75798c` from `SCAN_REVIEW_COPY.reasons`, then the three numbers as separate
56px wells (`%`, `ml`, `£`).

**A gap is an amber well** — `box-shadow: 0 0 0 1px #d29a51` showing `—` in `#d29a51`. **Never an
empty box, never a zero.** Amber is the only colour on the screen and it is a remark, not an alarm.

Everything read cleanly collapses to **one 56px line** — name 19px, `4.0% · 568` at 15px `#75798c`,
price 19px `#b2b6ca` — beneath a `SCAN_REVIEW_COPY.cleanHeader(n)` header after the fading rule.
Still tappable to correct, but costing no height and no attention.

The primary is `SCAN_REVIEW_COPY.cta(n)` (`Save 59 to The Eagle`), and the 13px footnote is
`SCAN_REVIEW_COPY.footnote`.

**4. Wire the wells to the `4o` keypad so submit walks the gaps.**
Tapping a well opens the keypad **on that field**, and submit advances to the next gap — the next
unfilled well in the group, then the next group — so three gaps are three taps and three numbers
with no scrolling back. Import it as:

```ts
import { KeypadFieldGroup } from "@/components/ui/keypad-field-group";
```

Pass the three fields as `abv` (`unit: "%"`), `serve` (`unit: "ml"`, `integer: true`) and `price`
(`unit: "£"`), and pass **`emptyIsAllowed`** — unlike the custom-drink sheet, this screen may be
saved with gaps still in it. Use its `onAdvance` callback to move to the next drink with a gap.

**5. Never discard a partly-wrong parse, and choose the failure title by error class.**
Saving with gaps is allowed. A drink with no strength is **stored**, shows `—` in the picker, and
contributes 0 ml until it is filled. Do not drop such a row and do not substitute a zero.

Failure (`4j`) gets **three ways forward, because failure is common**: 64px
`SCAN_FAIL_COPY.retry` (`Try this photo again` — the **same bytes**, which is the usual fix for a
timeout), 56px `SCAN_FAIL_COPY.reshoot`, and 56px ghost `SCAN_FAIL_COPY.manual`. The photo stays on
screen as a 150px thumbnail with a `your photo` tag and the 13px line `SCAN_FAIL_COPY.kept`.

**The title is chosen by error class, not one generic string.** The four classes are written in
`SCAN_FAIL_COPY`: `timeout`, `offline`, `nothing`, `refused`, each with its own title and body. Map
the real failure to one of them. **No red — and not amber either:** a failed network call is not a
caution about drinking.

## Verification baseline — the numbers

Derived by running them on `main` at `92dd1d1`, 2026-08-12, after Wave 4's first five legs were
integrated. These are the counts your work must not worsen; the block below says which commands
are yours to run.

- `npm test` — **119 tests across 11 files**, all passing. Must not fall. (This rose from 102 when
  the checker added tests for the `4o` keypad and the onboarding preference families — so a spec
  quoting 102 is out of date, not a target.)
- `npm run typecheck` — **0 errors.** Must stay 0.
  **Never use bare `tsc --noEmit` in this repository.** The root `tsconfig.json` is `"files": []`
  plus project references, so bare `tsc --noEmit` compiles **zero files** and always appears to
  pass. The npm script is `tsc -b --noEmit`.
- `npm run lint` — known-failing at exactly **`21 problems (10 errors, 11 warnings)`**, all in
  pre-existing application files. That is the accepted baseline and must not get worse. **Do not
  fix pre-existing lint problems** — out of scope, and it enlarges the diff.
- `npm run build` — passing, about 33s, with an expected `chunks are larger than 500 kB` notice
  that is not a failure.

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
