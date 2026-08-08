# Project Decisions

This is the durable design ledger. Agents may add entries only through the `update-decisions`
workflow. Keep history: supersede an entry instead of deleting it.

## LOCKED — Deterministic BAC and pacing engine

- `src/contexts/AppContext.tsx` owns BAC, total body water, ethanol, and pacing calculations.
- The application model selects catalog items only. It never replaces deterministic math.
- `adjustedTargetMl` intentionally scales the displayed target when selected drinks exceed it.

## LOCKED — Anonymous-first identity

- Every launch requires a valid Supabase session; create an anonymous session when none exists.
- Upgrading to a permanent account preserves the existing Supabase `user_id`.
- Manual identity linking and the two-step email verification then password-reset flow are required.

## LOCKED — State ownership

- React Context owns the deterministic session/math engine.
- React Query owns Supabase-backed state and shared session-only hook caches.
- `drinksmart.session.v1` owns persisted active-session state. Change its version when its shape
  changes; do not silently reinterpret incompatible data.

## LOCKED — AI plan boundary

- `generate-plan` currently uses `deepseek/deepseek-v4-flash-0731` through OpenRouter.
- The server validates catalog identifiers and recomputes actual ethanol totals.
- The client uses a deterministic greedy fallback and tops up material underfills.
- API keys remain Supabase secrets and never enter the client bundle or repository.

## LOCKED — Supabase and frontend conventions

- Use `@supabase/server` `withSupabase` for edge functions and preserve JWT verification.
- Keep Row Level Security enabled; use RLS-scoped clients unless an explicitly reviewed admin action
  requires otherwise.
- Use React Query for new Supabase-backed hooks, Tailwind plus shadcn/ui for interface work, and the
  established component patterns.
- Do not introduce another state library, styling system, backend, or production dependency without
  explicit approval.

## LOCKED — Verification language

- Typecheck, lint, build, automated tests, live Supabase verification, browser verification, and
  native-device verification are distinct evidence categories.
- Missing infrastructure is `BLOCKED`, never `PASS`.

## LOCKED — Traycer-orchestrated delegation (2026-08-07)

- Traycer orchestrates all delegated implementation. Client-native subagent roles are retired; the
  spec, not shared session context, is the only channel to a delegated agent.
- `writespec` commissions every delegation: full paths and exact signatures, scope stated in both
  directions, checkable acceptance criteria, an explicit verification baseline, and the fixed
  scope/closing blocks appended verbatim.
- `speccheck` gates acceptance: enumerate clauses before reading the diff, map clauses to hunks and
  hunks to clauses, derive tests from the spec rather than the code, fix small failures inline, and
  hand back only for a missing clause or a wrong approach.
- The implementer never writes or modifies tests; the checker owns test authorship.
- Delegated runs use Traycer-managed worktrees, never the workspace folder itself.
- **Precedence over bundled Traycer skills.** The bundled `traycer-*` skills carry their own
  delegation flow that does not reference these two skills. Where they overlap, `writespec` and
  `speccheck` win: no delegation is commissioned except by a `writespec` spec, and none is accepted
  except through a `speccheck` pass, whatever a bundled skill's own procedure says.
- **Artifact structure remains Traycer's.** The `traycer-*` skills stay authoritative for artifact
  shape and lifecycle — the `spec`/`ticket`/`review`/`story` kinds, `status` transitions, nesting,
  and epic layout. The split is deliberate: Traycer owns transport, isolation, and durable structure;
  `writespec`/`speccheck` own the content contract and the acceptance gate.
- **Commissioning is machine-enforced (2026-08-08).** `tools/writespec-guard`, registered as a
  `PreToolUse`/`Bash` hook in `.claude/settings.json`, denies any `traycer agent send` whose spec
  lacks the verbatim `scope.md` + `closing.md` blocks. Replies (`--response-id`) are exempt. Nothing
  else in this workflow is mechanically enforced: spec quality, the honesty of a verification
  baseline, and whether `speccheck` runs at all remain agent-side discipline.
- The guard matches `traycer agent send` only. Delegation driven outside Traycer — `codex exec`,
  `deepseek -p` — bypasses it, and the matcher must be widened before either becomes a real route.

## LOCKED — Multi-harness delegation and permission parity (2026-08-08)

Verified empirically; each point cost attempts to discover.

- **Agent-to-agent messaging on `--surface tui` is Claude-Code-only.** `codex` and `opencode` both
  fail `agent.create` with `TARGET_TUI_UNSUPPORTED — harness cannot participate in agent-to-agent
  messaging`. Non-Claude implementers must use `--surface gui`.
- **Custom harness providers do reach Traycer.** A provider defined in `opencode.json` /
  `~/.config/opencode/` appears in `traycer agent list-harness-models opencode` and is accepted by
  `--model`. Traycer is not restricted to its own curated list.
- **Model ids are `provider:model` with a colon**, not a slash: `deepseek:deepseek-v4-flash`.
  A slash returns `model ... is not available for harness`.
- Working recipe: `traycer worktree create` → `traycer agent create --harness opencode --model
  deepseek:deepseek-v4-flash --reasoning-effort max --surface gui --cwd <worktree>` →
  `traycer agent send --expect-reply` with a `writespec` spec → `speccheck` → `worktree delete`.
- **Traycer infra is per-agent, not per-surface.** Epic membership, a2a, artifacts, and managed
  worktrees hold in both `tui` and `gui` whenever Traycer spawns the agent. They are forfeited only
  by driving a model outside Traycer (`codex exec`, `deepseek -p`). `traycer config env` is
  machine-global with no per-agent scope, so an env-level model re-point cannot be confined to
  implementers.
- **`tui` agents pin their worktree**; deleting one from the sidebar leaves its process, bash child,
  and `traycer monitor` running, and the lease blocks `worktree delete` until they are killed.
  `gui` agents release when idle. There is no CLI command to terminate an agent.
- **Permission parity is enforced per harness, in each harness's own layer.** `opencode.json` denies
  `git commit`/`git push`/`supabase db push`/`supabase functions deploy` and `.env` reads for
  implementers. `.claude/settings.json` uses `permissions.ask` — not `deny` — for `git push`,
  `supabase db push`, `supabase functions deploy`, `supabase secrets set`, and `supabase migration
  up`. The asymmetry is deliberate: an implementer must never perform these, while the orchestrator
  may on an explicit user request, which `ask` forces into a prompt. `git commit` is deliberately
  not gated for the orchestrator.

## SUPERSEDED — Native subagent routing (2026-08-07)

- The planner/implementer/mechanical-worker/reviewer roster, the `route`/`unroute` switch,
  `tasks/route_state.md`, the `docs/agent_workflow.md` lifecycle state machine, and
  `tools/agent-worktree` write leases are superseded by Traycer-orchestrated delegation above.
  Their history remains in Git before this entry's commit.

## LOCKED — Frontend redesign source of truth (2026-08-07)

- `design_handoff_drinksmart/` is the authority for the frontend redesign. `README.md` is the spec
  and is self-sufficient; `screens/*.png` are the ground truth for appearance; `screens/*.html` are
  inline-styled prototypes to port into React, never to paste in; `tokens/` alone is production code.
- Do not read or parse `DrinkSmart-design-reference.html` (1.3 MB compiled output, for a human).
- Design output reaches the repo by **Share → Export → Handoff to Claude Code** from Claude Design,
  unpacked into the repo. `/design-sync` cannot deliver it: the DesignSync tool is filtered to
  design-system projects, and the redesign lives in a regular project.
- Two in-repo amendments to the bundled README (2026-08-06) are part of the spec and must be honoured
  over the unamended prose above them.

## LOCKED — Dark-only, light theme wired but unreachable (2026-08-07)

- The shipped aesthetic is the handoff's dark palette, applied verbatim in `.dark` in `src/index.css`.
- The spec called for `.dark` to be identical to `:root`. We deviated deliberately: `:root` carries a
  **derived** light palette so a Claude-Design-drawn light theme can drop in later without re-plumbing.
- Light is unreachable at runtime by two independent guards, and both must stay until a real light
  theme is drawn: `forcedTheme="dark"` on the `ThemeProvider` in `src/main.tsx`, and
  `LIGHT_THEME_AVAILABLE = false` in `src/pages/Profile.tsx`, which hides the Appearance card and
  short-circuits the `profiles.theme` sync effect.
- Non-colour tokens (type, spacing, touch, motion) are theme-independent and declared once in `:root`.
- Inter is self-hosted via `@fontsource/inter` (400, 500) imported in `src/main.tsx`. No CDN font.

## LOCKED — Buzz ceiling is level 7, in four bands (2026-08-06)

- Levels **8–10 are removed**, not rendered as forbidden. `buzzLevels.ts` still contains them; deleting
  them is part of the 1c work and is not yet done.
- Four bands: Light (1–2), Social (3–4), Loose (5–6), Heavy (7 alone). The fourth card is styled
  exactly like the other three — no warning colour, no red, no extra affordance.
- Because the scale ends at a reachable level, the danger warning in `PlanTab.tsx` is deleted, and a
  fading rule reading *"the scale ends here"* sits beneath the last card.
- With a single-level band selected, the `softer` / `stronger` nudge pair is **hidden, not disabled**.

## PENDING

- Band names and subtitles for the four-band picker are proposed, not drawn. Confirm the wording or
  ask Claude Design to render the four-card variant.
- Light theme values in `:root` are derived, not designed. Replace wholesale on the next export.
- Timeline layout 1e (proportional time axis) is an option, not a requirement. Ship 1d unless the whole
  night is guaranteed to fit without scrolling.
- Meter form: 1h continuous is recommended for the Plan target card, 1j mid-session for the Timeline.
  Pick one object and use it everywhere.
- Nothing in the redesign has been rendered in a browser. `npm run dev` has not been run since the
  token layer landed.
- Live Supabase migration, auth, RLS, and edge-function verification.
- Real iOS and Android notification/build verification.
- Unit coverage for the deterministic engine, `computeTargetEthanolMl`, and greedy fallback.
- A test runner (vitest is the natural fit for Vite) so `speccheck`'s spec-derived tests are
  runnable; adding it needs explicit approval as a new dev dependency.
