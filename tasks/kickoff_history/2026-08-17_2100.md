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

## What is NOT verified

**Everything from `51eb844` backwards to roughly `787f32d` has had no runtime test.** Oscar tested
each fix as it landed up to the ladder-price display; the staging model (`Add` → basket → `Apply`),
the live tray price, and the leave warning have **never been exercised**.

Carried risks, stated rather than buried:

- **The `ml` constraint on the model is unmeasured** and expected to cost admission-gate pass rate.
- **`or_bench` does not exist** anywhere in the repo, `/home/oscar`, or git history, though
  `CLAUDE.md` requires re-running it before changing hosts.
- **The basket warning fires on the category back arrow only.** Leaving by tab drops it silently.
- **Three prices in a card corner may crowd** a long drink name on a narrow screen. Untested on a
  phone.
- **Edge functions are inspection-checked only** — outside the tsc project, Deno absent.

---

# NEXT SESSION — test the staging model, then decide what is actually left

Read first: `AGENTS.md`; `docs/decisions.md` (every 2026-08-17 entry, especially the four at the
end); the artifacts `price-per-base-unit` and `wave-6-runtime-test`; `src/lib/basePricing.ts`.

## PROMPT

```text
Continue DrinkSmart. The pricing model was rebuilt this session — price is per base unit, never a
total — and the picker was rebuilt around it. Start by reading docs/decisions.md's 2026-08-17
entries and the Traycer artifact price-per-base-unit; the design moved several times in one day and
the ledger records the reversals deliberately.

FIRST, runtime-test what has never been exercised. Oscar tested each fix as it landed, but the last
three changes have no runtime evidence at all: (1) Add fills a basket and Apply commits it — select a
priced drink and leave without Add, the tray must drop its price; add three shots and back out, the
warning must offer Apply and Continue; nothing must reach the Plan tab without Apply; (2) the tray
follows a price as it is typed, without needing to tap out of the field; (3) the card corner shows
one figure per priced serving, white only on the serving in use and only while the row is open.

Reset between attempts with localStorage.clear(); sessionStorage.clear(); location.reload() in the
browser console — Oscar reaches the app at http://172.28.72.242:8080, and localhost and the LAN IP
are different origins with different storage.

Known gaps to fix or decide, in the order they will bite: the basket warning fires on the category
back arrow but not on switching tabs, so leaving by tab drops a basket silently; three prices in a
card corner may crowd a long name on a narrow screen; and the Custom drink sheet still commits
straight to the plan because it opens from the plan root where no Apply exists — decide whether that
asymmetry stands.

Do NOT re-run the benchmark. It is deferred and its trigger changed: workstream A backfilled volumes
rather than prices, so every catalogue price is still null and a re-run would measure the empty
price column it was sequenced to avoid. The trigger is now real prices existing at all, from any
source. Note also that or_bench does not exist in the repo, in /home/oscar, or in git history,
despite CLAUDE.md requiring it — resolve that before any future run.

Carry these: the ±10% ethanol admission gate stays the single hard rejection and budget never
justifies underfilling it. A price applies to the volume it was set for and is never derived,
scaled, rounded or summed out of smaller rungs. The picker selects and never edits the plan. The
model may not invent a serving volume, and that constraint is unmeasured — expect more falls back to
the greedy generator and do not treat that as a new bug without measuring. Do not re-pin the AI
provider to DeepSeek, and do not change DEEPSEEK_MODEL, the routing arrays, allow_fallbacks or the
reasoning setting. Do not stage, revert or delete the unstaged package.json / package-lock.json.

Verification baseline, re-derive rather than quote: npm run typecheck PASSES; npx vitest run is 347
tests across 50 files; npm run build PASSES; npm run lint is known-failing at exactly 11 errors and
12 warnings and must not get worse. Edge functions sit outside the tsc project and Deno is absent, so
supabase/functions/**/*.ts is inspection-checked only. Deployed function logs are BLOCKED.

Commit locally when the baseline holds. Never push, deploy an edge function, rotate secrets, or
apply a migration to the remote database without asking — Oscar applies migrations himself. Note
that generate-plan has UNDEPLOYED changes: the ml-override constraint is committed but not live.
```
