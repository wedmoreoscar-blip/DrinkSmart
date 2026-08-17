# Session handoff — pricing rebuilt per base unit, and the picker rebuilt around it

Written 2026-08-17 by normal handoff. Substantively identical to `HANDOFF.md`.

`main` is at `51eb844`, clean apart from Oscar's unstaged `package.json` / `package-lock.json`
(Supabase CLI devDependency) which must be preserved.

## What this session was

It began as the recorded continuation — test Wave 6, then workstream A. Testing found five bugs, one
of which (a £25 price reading back as £2.50) was not a bug but a broken model. Fixing it properly
became a whole redesign: **price is per base unit, never a total**.

## Completed

**The Wave 6 test pass** (artifact `wave-6-runtime-test`), all five findings closed:

- **F5, the big one.** `crypto.randomUUID()` is secure-context only. On `http://172.28.72.242:8080`
  it is `undefined`, so `Add 1` threw inside a click handler and did nothing, silently. The same call
  sat in `AppContext` and `generatePlan`, so **AI generation shared the fault**. It worked on
  localhost and failed everywhere else — i.e. on every phone test. `src/lib/uuid.ts`.
- **F2.** Sign-in was unreachable by *every* user: all users hold an anonymous session, so
  `Auth.tsx` always early-returned the upgrade screen. Nobody could open an existing account.
- **F3.** `isAnonymousSession(null)` is `false`, so an unloaded session read as signed in and the
  profile flashed the account card. Confirmed fixed by Oscar.
- **F1.** Re-requesting a verification link failed; `Resend` ran the same path. Fixed, then **dropped
  by Oscar** — the dead end came from a broken `localhost`, and reworking Supabase auth is not worth
  it.
- **F4.** Superseded entirely by the rework below.

**Wave 7 — price per base unit.** Spine, schema, read path and volume backfill built inline; the UI
delegated as two legs to warm agents (`W7-1`, `W7-2`), merged with zero conflicts, 8/9 clauses clean,
two repairs inline. Then a long correction pass driven by Oscar testing it.

- `basePricing.ts`, `user_drink_prices` keyed `(user, drink, serving_ml)`, the read path off the
  moving denominator, and volumes backfilled onto 237 seeded rows.
- **Prices deliberately left null** — no defensible source exists (see the ledger).
- The picker rebuilt: one row per drink, selector only, options independent, a price per priced
  serving in the corner.
- **Add stages, Apply commits.** The tray is a basket, not a mirror.
- Decomposition built and removed the same day.
- The model can no longer invent a serving volume.

## Verification at handoff

Re-derived on `51eb844`. **Never quote these — run them.**

- `npm run typecheck` (`tsc -b --noEmit`) — passed. Never use bare `tsc --noEmit`; the root config is
  `"files": []` plus references, so without `-b` it checks nothing and reports success.
- `npx vitest run` — **347 passed, 50 files.**
- `npm run lint` — **23 problems (11 errors, 12 warnings)**, the known baseline, held all session.
- `npm run build` — passed.
- Live: both migrations (`20260817000200`, `20260817000300`) applied by Oscar; `db:types` regenerated
  and **byte-identical** to the hand-added table.

**Do not stage `package.json` / `package-lock.json`.**

## Runtime state — Oscar's verdict

**Oscar tested the `Add` / `Apply` staging model after the handoff was first written and reports it
working. His words: the app is "basically fully functioning now".** That was the last piece with no
runtime evidence, so the web app is now considered functional end to end.

Not a claim that every path is exercised. Untested specifics remain: three prices crowding a long
name on a narrow screen, the leave warning's `Continue` branch, and the scanner's rung write.

Carried risks, stated rather than buried:

- **The `ml` constraint on the model is unmeasured** and expected to cost admission-gate pass rate.
- **`or_bench` does not exist** anywhere in the repo, `/home/oscar`, or git history, though
  `CLAUDE.md` requires re-running it before changing hosts.
- **The basket warning fires on the category back arrow only.** Leaving by tab drops it silently.
- **Edge functions are inspection-checked only** — outside the tsc project, Deno absent.
- **`generate-plan` has committed but undeployed changes** — the `ml` constraint is not live.

---

# NEXT SESSION — native conversion, iOS and Android

Oscar's instruction: the web app is functioning, so the next stage is **conversion to Android and
iOS**.

Read first: `AGENTS.md`; `docs/decisions.md` (the 2026-08-17 entries); `CLAUDE.md`'s Capacitor
section — but note it **overstates readiness**, corrected below.

## The actual native state, checked 2026-08-17

`CLAUDE.md` says "notifications are Capacitor-native already", which is true of the *code* and
misleading about the *project*. Nothing has ever been built natively.

| Thing | State |
| --- | --- |
| `@capacitor/core`, `camera`, `local-notifications` | Installed |
| **`@capacitor/cli`** | **Missing** |
| **`@capacitor/ios`, `@capacitor/android`** | **Missing** |
| **`ios/` and `android/` folders** | **Do not exist** — platforms never added |
| `capacitor.config.ts` | Carries an unresolved `TODO` and `cleartext: true` |

So this is a from-zero platform bring-up, not a sync-and-build.

## Two constraints that shape the whole stage

- **iOS cannot be built on this machine.** It needs Xcode, which is macOS-only, and Oscar is on
  Windows/WSL2. The iOS half is `BLOCKED` on hardware — write the config and the plan, but do not
  claim an iOS build. Say so early rather than discovering it at the build step.
- **Adding platform packages is a dependency change.** `AGENTS.md` requires approval for production
  dependencies and serialization through `tools/agent-lock` for dependency work. Ask before
  installing.

## What the native surfaces actually are

- **Local notifications** (`src/lib/notificationService.ts`) — the web path is a sonner-toast
  fallback, so scheduling has never fired a real notification.
- **Camera** — the menu scanner. Untested natively.
- **`cleartext: true`** allows plain HTTP and should not ship; resolve the `TODO` rather than
  carrying it into a bundle.

One relevant note from this session: the `crypto.randomUUID` bug (F5) would **not** have appeared in
a Capacitor build, because a native webview serves from a secure origin. It only bit over LAN HTTP.
The fix stands, but do not expect that class of failure natively.

## PROMPT

```text
Continue DrinkSmart. The web app is functioning — Oscar has tested the Add/Apply staging model and
reports it working — so this session is the native conversion to Android and iOS.

Read docs/decisions.md's 2026-08-17 entries first for the pricing model, then check the native state
yourself rather than trusting CLAUDE.md, which overstates it. As of 2026-08-17: @capacitor/core,
camera and local-notifications are installed, but @capacitor/cli, @capacitor/ios and
@capacitor/android are NOT, there are no ios/ or android/ folders, and capacitor.config.ts still
carries an unresolved TODO and cleartext: true. This is a from-zero platform bring-up.

Raise two things with Oscar before doing anything. First, iOS needs Xcode and therefore macOS; he is
on Windows/WSL2, so the iOS half is blocked on hardware and only the config and plan can be
prepared here — say this up front rather than at the build step. Second, adding @capacitor/cli and
the platform packages is a production dependency change, which AGENTS.md requires approval for and
serialization through tools/agent-lock.

Then: resolve capacitor.config.ts (cleartext: true must not ship, and the TODO about a production
URL needs settling — a bundled app ships dist and needs no server.url at all), add the Android
platform, build, sync, and get it running on a device or emulator. The two native surfaces that have
never executed are local notifications (src/lib/notificationService.ts — the web path is a sonner
toast fallback, so no real notification has ever fired) and the camera used by the menu scanner.

Carry these: the ±10% ethanol admission gate stays the single hard rejection. A price applies to the
volume it was set for and is never derived, scaled, rounded or summed out of smaller rungs. The
picker selects and never edits the plan; Add fills a basket and Apply commits it. The model may not
invent a serving volume, and that constraint is unmeasured — expect more falls back to the greedy
generator and do not treat it as a new bug without measuring. Do not re-run the benchmark: it is
deferred because every catalogue price is still null, and or_bench does not exist in the repo
despite CLAUDE.md requiring it. Do not stage, revert or delete the unstaged package.json /
package-lock.json.

Two loose ends worth closing if the native work stalls: the basket warning fires on the category
back arrow but not on switching tabs, so leaving by tab drops a basket silently; and the Custom
drink sheet still commits straight to the plan because it opens from the plan root where no Apply
exists — decide whether that asymmetry stands.

Verification baseline, re-derive rather than quote: npm run typecheck PASSES; npx vitest run is 347
tests across 50 files; npm run build PASSES; npm run lint is known-failing at exactly 11 errors and
12 warnings and must not get worse. Edge functions sit outside the tsc project and Deno is absent, so
supabase/functions/**/*.ts is inspection-checked only. Deployed function logs are BLOCKED, and so is
anything requiring a physical iOS device.

Commit locally when the baseline holds. Never push, deploy an edge function, rotate secrets, apply a
migration to the remote database, or publish a mobile build without asking. generate-plan has
UNDEPLOYED changes: the ml-override constraint is committed but not live.
```
