# HANDOFF — 2026-08-08 22:24 BST

Current state of the repo. The continuation lives in `tasks/next_session_kickoff.md`; this file is
the summary. Authority order: `AGENTS.md`, then `docs/decisions.md`, then the kickoff.

## Where things stand

**Wave 1 of the whole-app redesign is integrated and verified.** The redesign was rescoped this
session from a screen-by-screen sequence to a global, whole-app change. `tasks/todo.md`'s step
numbering is superseded by `docs/visual/02-planned-changes.md`.

10 commits, `47d5970..fe112cd`. `main` is ~22 commits ahead of `origin/main`, deliberately unpushed.

| Area | State |
| --- | --- |
| Primitives (`button`, `card`, `badge`, `slider`) | Restyled to design 1k, merged `afa6c5e` |
| Vessel meter | New `ui/vessel-meter.tsx`, battery meter gone, merged `eff7f94` |
| Chrome (bottom tab bar) | Not started — Wave 2 |
| Form controls to 56px | **Deferred**, blocked on undrawn designs |
| Undesigned screens | **Blocked** — no drawings exist |

**The last red and green are out of the product.** Three of the five recorded visual violations in
`docs/visual/01-current-state.md` are now fixed.

## The finding that matters most

**`npx tsc --noEmit` was a no-op for the entire life of this project.** The root `tsconfig.json` is
`"files": []` plus project references; without `-b` it compiles zero files and exits 0. Every
recorded "typecheck PASS" was evidence of nothing.

It concealed four real errors — `preferences` and `drinks` cast to `Record<string, unknown>` where
the generated Supabase client expects `Json`, mistyping every write to `profiles` and
`user_sessions` — and it passed a delegated diff that had introduced four more.

`npm run typecheck` is now `tsc -b --noEmit`, proven by injecting a deliberate error and confirming
it was caught. The general rule is now locked in `docs/decisions.md`: **a green check is only
evidence if the command has been shown capable of going red.**

## Verification, confirmed on `main`

- `npm run typecheck` (`tsc -b --noEmit`) — **PASS, 0 errors**
- `npm run lint` — **known FAIL, exactly 9 errors / 12 warnings.** Must not get worse.
- `npm run build` — **PASS** (~16–26s)
- `npm audit` — 18 vulnerabilities (3 moderate, 15 high). Not addressed.
- Browser, Supabase, edge-function, native — **BLOCKED**.

**Nothing has been rendered in a browser.** Wave 1 is typechecked and built, never seen. This is the
largest unverified area and is a deliberate choice, not an oversight.

## Unresolved risks

1. **Half the app has no design entity.** The 2026-08-08 Claude Design export brought **no new
   design ids** — still only 1b–1k. The brief in `docs/visual/03-design-requests.md` is unanswered,
   so W1-C and Wave 4 stay blocked. Everything else in Wave 2 can proceed without it.
2. **Wave 1 changed shared primitives globally**, so screens with no redesign step of their own
   (`Auth`, `MenuScannerTab`, `StatsForm`, `DrinkFilterPopover`, admin) now mix 56px buttons with
   40px inputs. Accepted cost, closes when §A is drawn.
3. **A design export can silently regress in-repo amendments.** This export deleted both 2026-08-06
   README amendments (level-7 cap, four-band table, hidden nudge pair) because they were never sent
   upstream. Restored this session. Check for this on every future export.
4. The `entries` reduce in `DrinksTab` duplicates the volume/ABV computation near
   `DrinksTab.tsx:198–235`, and `VesselMeter` recomputes `plannedMl` independently of
   `pureAlcoholChosen`. They agree today; they could drift.
5. Button `sm`/`lg` are aliases of `tap`. Call sites should migrate to explicit `tap`/`act`.

## Process changes made this session

- **Specs go in `docs/specs/` and are committed.** Traycer artifacts are epic-scoped and vanish
  with the session; they are a review surface only, useful because `traycer comments` gives anchored
  feedback threads no repo file can.
- **Claude Design entities are ground truth**, ranked: `tokens/` → `screens/*.html` → `*.png` →
  README prose → `tasks/todo.md` → implementer judgement. Prose has lost every conflict so far.
- **Read prototype `<script>` blocks** — they carry copy and formatting rules, not just markup.
- **The orchestrator pre-installs each worktree.** `agent-lock` uses `flock -n` and fails fast, so
  parallel implementers must not run their own `npm install`.
- `writespec-guard` now passes messages marked `[no-spec]` — pings and stand-downs, never real work.
- Specs that remove a variant or prop key must name the affected call sites: that is a breaking API
  change, not a visual one, and `speccheck` caught it only because the diff was read clause by clause.

## Two implementers are alive and warm

Reuse rather than respawn — both worktrees are merged, clean, and already have `node_modules`.

- DeepSeek `a0b2fcaa-5bbb-4076-97e5-680928a1e542` — opencode, `traycer-redesign-step2-primitives`
- Luna `da47f88c-30cb-4b0e-ae9a-ac0b4d15ed74` — codex, `traycer-w1b-vessel-meter`

Codex quota was ~80% for the week. `screens/*.html` is plain text, so DeepSeek can implement
designed screens without visual input; reserve Luna for genuine appearance judgement.

## Next step

Wave 2 — bottom tab bar, Plan/buzz picker (1c), Timeline (1d). Three specs, disjoint file sets,
parallelisable. Full continuation and prompt in `tasks/next_session_kickoff.md`.
