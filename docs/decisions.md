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

## SUPERSEDED — Native subagent routing (2026-08-07)

- The planner/implementer/mechanical-worker/reviewer roster, the `route`/`unroute` switch,
  `tasks/route_state.md`, the `docs/agent_workflow.md` lifecycle state machine, and
  `tools/agent-worktree` write leases are superseded by Traycer-orchestrated delegation above.
  Their history remains in Git before this entry's commit.

## PENDING

- Live Supabase migration, auth, RLS, and edge-function verification.
- Real iOS and Android notification/build verification.
- Unit coverage for the deterministic engine, `computeTargetEthanolMl`, and greedy fallback.
- A test runner (vitest is the natural fit for Vite) so `speccheck`'s spec-derived tests are
  runnable; adding it needs explicit approval as a new dev dependency.
