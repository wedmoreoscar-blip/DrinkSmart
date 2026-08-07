# Session Handoff — 2026-08-07, design handoff intake and token layer

Mode: **normal**. Canonical continuation is `tasks/next_session_kickoff.md`; this session's copy is
archived at `tasks/kickoff_history/2026-08-07_2320.md`.

## What this session did

**Design delivery route, established empirically.** `/design-sync` cannot deliver the redesign: the
DesignSync tool is hard-filtered to design-system projects, and the work lives in a regular Claude
Design project. Delivery is **Share → Export → Handoff to Claude Code**, unpacked into the repo.

**Handoff bundle intake.** `design_handoff_drinksmart/` committed as delivered (`9a48a02`), then
amended twice in-repo (`1e4efb8`, `ed7ecc0`): the buzz ceiling is level 7 rather than 6, and level 7
gets a fourth band of its own ("Heavy") rather than being folded into "Loose". `.env` was untracked
with `git rm --cached` — adding it to `.gitignore` alone does not untrack an already-tracked file —
and `*:Zone.Identifier` was ignored, since Windows→WSL downloads regenerate those on every unpack.

**Token layer applied** (`b46de81`). `tokens/index.css` and `tokens/tailwind.config.ts` replaced
`src/index.css` and `tailwind.config.ts`. The new `:root` is a strict superset of the old variable
set, so no existing call site broke.

**Dark-only shipped** (`d1d2be8`), with one deliberate deviation from the spec. The spec called for
`.dark` to be identical to `:root`; instead `:root` carries a derived light palette so a
Claude-Design-drawn light theme drops in later without re-plumbing, and light is made unreachable by
two independent guards. Two things surfaced while doing this: Inter was never actually loaded (now
self-hosted via `@fontsource/inter`), and `Profile.tsx`'s `profiles.theme` sync effect would have
exposed the provisional light palette to existing users whose stored theme was `light`.

Outside the redesign, unrelated to the code: the local credential-directory deny hook was hardened
and tested, and Claude Code's context-window resolution was traced to a fallback constant that
`CLAUDE_CODE_MAX_CONTEXT_TOKENS` overrides for non-`claude-` models.

## Files changed by this handoff

| File | Change |
| --- | --- |
| `docs/decisions.md` | Three new `LOCKED` entries (redesign source of truth, dark-only, buzz ceiling) and five new `PENDING` items |
| `tasks/todo.md` | Replaced the empty template with the full step 2–8 plan and per-step acceptance criteria |
| `tasks/next_session_kickoff.md` | Replaced the baseline "ask the user what to work on" prompt with the step-2 continuation |
| `tasks/kickoff_history/2026-08-07_2320.md` | New, identical to the kickoff above |
| `HANDOFF.md` | This file |

No source file was modified by the handoff itself.

## Git state

Working tree was clean at handoff start; the only changes are the five records above. `main` is
**2 commits ahead of `origin/main`** (`ec68ea5`, `3d661c4`) — unpushed deliberately; nothing is
pushed without an explicit request. The merged `redesign/token-layer` branch still exists and is
stale.

## Verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | **PASS** (exit 0, run this session) |
| `npm run lint` | **FAIL** at the known baseline — 9 errors, 12 warnings, all pre-existing. Unchanged. |
| `npm run build` | PASS at last run; not re-run this session |
| Browser | **BLOCKED** — `npm run dev` has not been run since the token layer landed |
| Supabase / native | **BLOCKED** — no live infrastructure exercised |

The redesign is verified statically only. Typecheck and build say nothing about whether a visual
change looks right, and nothing in `design_handoff_drinksmart/` has been seen rendered.

## Unresolved risks

1. **Nothing rendered.** The token layer changed every colour, every type size, and the spacing scale
   across the whole app, verified only by `tsc` and a bundle. Run `npm run dev` and look before
   building on top of it.
2. **`buzzLevels.ts` still contains levels 8–10.** The level-7 ceiling is settled in the spec and in
   `docs/decisions.md` but not in code. Deleting them is part of step 4, and `getBACForLevel` throws
   on an unknown level — a persisted session or `profiles` row pointing at 8–10 must be clamped, not
   left to throw.
3. **Step 7 has no way to be verified.** The engine work needs deterministic tests; no test runner
   exists, and adding vitest is a new dev dependency requiring explicit approval. Raise it before
   starting, not during.
4. **Band names and subtitles are proposed, not drawn.** Confirm the wording or ask Claude Design for
   the four-card variant before building 1c.
5. **The `:root` light palette is derived, not designed.** It is unreachable today; if either guard is
   removed before a real light theme exists, users see values that never went through Claude Design.

## Next task

Step 2 of `tasks/todo.md` — restyle the shadcn primitives to design 1k. The exact prompt is in the
`## PROMPT` block of `tasks/next_session_kickoff.md`.
