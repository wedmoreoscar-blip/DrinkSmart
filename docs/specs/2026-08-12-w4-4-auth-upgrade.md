# W4-4 — Anonymous account upgrade (designs `4m` and `4n`, request §G)

You are restyling DrinkSmart's `/auth` page so that its **anonymous-to-permanent upgrade** path
matches its Claude Design drawings. The two-email flow already works; the drawings explain it
*before* the field instead of springing the second email on the user, and add a waiting state that
reads back the user's position in the flow.

Your worktree: `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_3`
Your branch: `deepseek_agent_3`

## Design authority — read before writing any code

The **active** authority, by absolute path:

```
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4m-auth-email.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4m-auth-email.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4n-auth-waiting.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4n-auth-waiting.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/README.md   (section "§G — Account upgrade (4m, 4n)", ~line 425)
```

Also read `screens/1l-form-primitives.html` for the text input and its four states, and
`screens/1m-sheet-radio-time-toast.html` for the radio geometry the read-only step strip reuses.

**Read the trailing `<script>` blocks of `4m` and `4n`.** They carry the literal copy objects
`AUTH_COPY` and `AUTH_WAIT_COPY`, including the step labels, the cooldown formatter, and the
"why two emails" line. Those strings are exact — use them verbatim, do not paraphrase.

**NEVER** read or use `/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart_depreciated/`.
It is history, not current authority.

## Standing design constraints (LOCKED — `docs/decisions.md`)

- Dark only. The light theme is deliberately unreachable; never reference or re-enable it.
- One accent, no palette. **No red, no green anywhere.** Amber `#d29a51` is the error colour and is
  a remark, not an alarm.
- 19px (`text-body`) is the floor for anything the user reads. 13px (`text-micro`) carries the
  section headers, the cooldown and footnotes only — never an answer.
- Nothing tappable under 56px. **Exactly one 64px primary action per state** — `Send the first link`
  on `4m`, `Back to tonight` on `4n`.
- Reach for the token, not the hex. Confirmed classes: `h-tap` (56px), `h-act` (64px),
  `rounded-ctl` (12px), `rounded-lg` (14px),
  `text-micro`/`text-label`/`text-note`/`text-body`/`text-lead`/`text-title`, `bg-field`,
  `text-muted-foreground`, `text-primary`. `<Button size="act">` is the 64px primary.
- Compose the existing `src/components/ui/*` primitives. Do not fork them, do not add a component
  library, do not add any dependency, do not modify `package.json` or the lockfile.

## Files you may modify

- `src/pages/Auth.tsx`
- Any **new** file you create under `src/components/auth/` (this directory does not yet exist;
  create it). Put the "what comes with you" card and the step strip in their own files there.

**No other file may be created or modified.** In particular, do not modify `src/pages/Profile.tsx`
(another agent is rewriting it concurrently in this same wave and will keep its existing
`navigate("/auth")` call), `src/pages/ResetPassword.tsx`, `src/lib/anonymousAuth.ts`,
`src/App.tsx`, or anything under `src/components/ui/`.

## Clauses

**1. Restyle only the upgrade branch; leave sign-in, sign-up and forgot-password alone.**
`Auth.tsx` already distinguishes these with `isUpgrade`, `isSignUp` and `isForgotPassword` state,
set by the auth-state effect at ~line 40 which detects an anonymous session via
`isAnonymousSession(session)` and keeps the user on `/auth` instead of redirecting to `/dashboard`.
**Preserve that distinction exactly** — a real session must still redirect to `/dashboard`, an
anonymous one must still stay.

`4m` and `4n` draw the **upgrade** branch only. Restyle that branch to the drawings. The
non-upgrade branches must keep working; you may leave their markup as it is.

**2. Build the `4m` email state: explanation before the field, never after.**
Top bar: a 56px row with a 22px back chevron and the 19px word `Account`. Then the 28px/500 title
and 17px body from `AUTH_COPY`.

Then the **`What comes with you`** card (`#232532`, radius 14, padding 18): a 13px/0.09em uppercase
header, then up to three columns, each a 28px/500 tabular figure over a 15px `#b2b6ca` label —
`nights planned`, `bars scanned`, `your stats` (the user's weight, e.g. `82 kg`).

**These are real counts, and a column whose count is zero drops out entirely.** Read them from data
already available to the page. **The sentence "your data is safe" must appear nowhere** — three
figures the user recognises do that job, and asserting safety does not.

Then the **`It takes two emails`** step strip: three read-only rows, each 56px, with a 28px disc
(1.5px `#383a46` ring, 15px numeral `#75798c`) and a 19px label, using `AUTH_COPY.steps` verbatim.
Step 3 is written as a *consequence* of step 2, so the second email is expected rather than sprung.
Beneath it, the 13px line `AUTH_COPY.why`.

Then the `1l` email input with its 15px uppercase label, then the 64px primary
`AUTH_COPY.cta`, then the 13px centred `AUTH_COPY.footnote`.

**3. Add the `4n` waiting state as a progress reading of the same three steps.**
After the first link is sent, the page shows the waiting state: title `Check <email>` at 28/500
(`AUTH_WAIT_COPY.title`), the 17px body, then a `Where you are` strip reusing **the same three
rows in the same order**, now marked:

| Mark | Treatment |
| --- | --- |
| done | filled `#9184d9` disc with a `#161826` tick |
| current | 1.5px `#9184d9` ring, `#b5abfc` numeral, plus a `waiting` tag (13px `#b5abfc` on `#2b2741`, radius 8) |
| pending | 1.5px `#383a46` ring, `#75798c` numeral and label |

Then a fading rule, then a `#232532` card carrying `AUTH_WAIT_COPY.notPaused` at 19px.

**Nothing nags and nothing blocks.** The 64px primary is `Back to tonight` and navigates to
`/dashboard`. Below it, two 56px controls side by side: `Send it again`, which carries its cooldown
as a 13px line inside the control (`AUTH_WAIT_COPY.resendCooldown`, formatted `in 0:42`) **rather
than being disabled with no explanation**, and `Another email`, which returns to the `4m` state.

This state can last days. It is reachable from Profile and must be mentioned nowhere else.

**4. Do not change the two-step Supabase upgrade mechanism.**
The existing sequence is correct and load-bearing, and is documented in `CLAUDE.md`:

1. `supabase.auth.updateUser({ email })` links the identity and sends a verification email;
2. `supabase.auth.resetPasswordForEmail(email, ...)` sends the second, password-setting link.

**The password cannot be set in the same call as the email change** — the email must be verified
first. Do not add a `updateUser({ password })` call immediately after the email change, do not
collapse the two emails into one, and do not add a password field to the upgrade form. Keep the
existing error handling for the manual-identity-linking failure and its toast.

The `user_id` must be preserved throughout; nothing in your change may sign the user out, call
`signOut`, or create a new session.

**5. Keep the upgrade form's real inputs and validation working.**
The upgrade branch collects an email and a username. Keep both, keep the existing `errors` state and
its validation, and render failures as the `1l` inline error: 17px `#d29a51`, 20px warning glyph,
10px gap, with the field taking `box-shadow: 0 0 0 1px #d29a51` and its label in `#d29a51`. **An
error names what is needed, never what the user did wrong** — for example `Needs a domain —
oscar@example.com`, not "invalid email".

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
  infrastructure is not available to you. You cannot send a real verification email, cannot verify
  an address, and cannot exercise the upgrade against a live project. Do not attempt these and do
  not claim them. Say so plainly in your report.

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
