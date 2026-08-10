# DrinkSmart Agent Guide

## Purpose and authority

DrinkSmart is a React, TypeScript, Supabase, and Capacitor application for planning a paced
drinking session around a target blood alcohol concentration (BAC). The deterministic engine owns
all alcohol, body-water, BAC, and pacing calculations. The application model may select catalog
items, but it must never perform or replace that math.

For settled design constraints read `docs/decisions.md`. For the current continuation read
`tasks/next_session_kickoff.md`. The authority order is this file, then locked decisions, then the
current kickoff. `CLAUDE.md` imports this file and adds Claude-specific project history and pitfalls.

Delegated implementation is orchestrated by Traycer, not by client-native subagents. The `writespec`
and `speccheck` skills are the ground truth for how work is handed to and accepted from a delegated
coding agent, whichever vendor or harness runs it.

When a Traycer-launched Codex TUI is the orchestrator, invoke `$codex-tui-relay` before kickoff or
commissioning GUI agents. Oscar creates its persistent OpenCode GUI A2A hub once; Codex creates and
uses the epic's single append-only artifact ledger for spawn/send commands and returned messages.
This is a messaging adapter only; the applicable workflow remains authoritative for the work itself.

## Working rules

- Preserve unrelated changes in a dirty worktree. Never stage, revert, or delete work you did not
  create.
- Plan non-trivial work with acceptance criteria. Record multi-session or multi-agent plans in
  `tasks/todo.md` and check in before broad rewrites or changes spanning roughly 50 lines or several
  files.
- Make the smallest correct change. Reuse existing helpers, state patterns, and components before
  creating another abstraction.
- Verify the changed behavior and inspect the complete diff before reporting completion.
- Delegate through Traycer. Before dispatching an implementer, write the spec with `writespec`;
  after the implementation returns, verify it with `speccheck` before accepting. Keep tiny
  context-cached changes inline when delegation would cost more than the work.
- After an implementation returns, the `speccheck` reviewer owns repairs and their tests, and in
  practice will fix almost everything inline. Never send a correction back merely because the
  original task category belonged to that model. Re-contacting the implementer requires that
  completing the work would mean designing rather than repairing, a substantially wrong approach,
  a scope/authority expansion, or a capability/infrastructure gap; a missing clause alone is not
  enough. State the exception before messaging and obtain confirmation before reusing a warm agent.
  Name inline repairs in the acceptance record — that note is the only signal that a spec is
  routinely under-specifying the work.
- `docs/workflows/agent_selection.md` decides which agent runs which role: Claude Code TUI is the
  default orchestrator; Codex TUI is authorized only while `$codex-tui-relay` is active; DeepSeek V4
  Flash via opencode is the default implementer; and GPT-5.6 Luna via codex is reserved for visual
  input or spatial reasoning. It is the canonical copy of the guide Traycer serves from
  `~/.traycer/agent-selection-guide.md`.
- Every delegation spec states its verification baseline explicitly (see
  `docs/workflows/verification.md`): which commands must pass, which are known-failing and must not
  change, and which are `BLOCKED` on unavailable infrastructure. Write the spec as though the
  implementer cannot ask; a relay route for unforeseen questions never licenses an incomplete
  baseline.
- `docs/workflows/delegation.md` is the canonical fifteen-step path for a single delegation, from
  provisioning through integration. It is built to cost one review pass, one repair loop, and one
  full baseline run per delegation: review the merged tree on an `integration` branch, repair
  inline, verify once after the repairs, and advance `main` only by fast-forward. Delegated
  worktrees and their agents are kept warm and re-synchronized, never deleted after acceptance.
- `docs/workflows/visual_check.md` governs the final visual check of a redesign wave, which is
  Luna's and does **not** run on the delegation path. Halt and wait for Oscar on reaching it. It is
  commissioned by a rough brief rather than a spec, runs several coordinating agents in one shared
  worktree under disjoint file ownership, and treats self-verification by screenshot as the
  mechanism rather than a smell. Checking is casual; integration is not.
- Follow `docs/workflows/change_safety.md` for writes, commits, worktrees, and integration. Follow
  `docs/workflows/verification.md` for evidence and live-backend limitations.
- Never push, deploy Supabase functions, apply migrations to a remote database, rotate secrets, or
  publish mobile builds without an explicit user request.

## Collaboration and isolation

- The root checkout is for user-directed work, planning, inspection, and integration.
- **The orchestrator always writes to the integration target — `/home/oscar/DrinkSmart` on `main` —
  even when Traycer has launched it inside a worktree.** Being placed in a worktree does not make
  that worktree your working tree. Commit orchestration output (decisions, docs, kickoff, specs,
  integration merges) to the root checkout; leave your own worktree untouched and expect it to fall
  behind `main`. An orchestrator that commits into its own worktree invents a merge step before it
  can dispatch anything, and risks handing a stale tree to the next session.
- Run delegated implementations in Traycer-managed worktrees, never against the workspace folder
  itself. Traycer owns worktree creation and per-folder run location; the main checkout stays
  user-owned.
- Codex TUI is an orchestrator only, never an agent-to-agent implementation target. Its authored
  commissions are executed by the artifact relay's DeepSeek GUI hub with `--expect-reply`; native
  replies return to that hub and are appended verbatim to the ledger documented in
  `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md`. Codex implementation agents use the GUI surface.
- Serialize dependency changes, shared dev servers, Supabase-local mutations, and costly benchmarks
  with `tools/agent-lock <scope> -- <command>`. Parallel delegated worktrees still contend for these
  shared resources.
- Do not commit `.env`, keys, tokens, `.claude/settings.local.json`, generated output, or local agent
  lifecycle state.

## Project invariants

- `src/contexts/AppContext.tsx` is the source of truth for deterministic BAC and pacing behavior.
  Do not change its formulas unless the task explicitly places the math in scope.
- The model selects drinks from a supplied catalog. The server recomputes totals and the client keeps
  a deterministic fallback; never trust model arithmetic.
- Anonymous Supabase authentication is required at launch. Account upgrade must preserve `user_id`.
- Use React Query for Supabase-backed state and existing query-key patterns for cross-component
  consistency. The active session remains localStorage-backed and versioned.
- Use Tailwind and shadcn/ui patterns already present. Do not add a state library, styling system,
  backend, or production dependency without approval.
- Keep Row Level Security (RLS) enabled. Derive the acting user from authenticated claims, not request
  bodies, and update generated Supabase types when schema changes.
- Do not refactor `DrinksTab.tsx` or re-enable a light theme unless the task explicitly requires it.

## Commands and verification

- Install: `npm install`
- Development: `npm run dev`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Production build: `npm run build`
- Project verification profiles: `tools/test-project quick|build|full`

Vitest now covers W3-A1 planner budgets, generated-unit normalization, request fingerprints, planning
windows, and fallback behavior. W3-A2 must extend that suite to the session engine itself. Never
describe typechecking or a build as functional verification. Remote Supabase, edge-function,
notification, and mobile checks are `BLOCKED` until their real infrastructure is available.

## Native workflows

Repo-local skills are available to both clients: audit-context, bench, codex-tui-relay,
decision-check, handoff, healthcheck, kickoff, make-bench, skill-writing, speccheck, teacher,
update-decisions, and writespec. `codex-tui-relay` activates only for a Traycer Codex TUI
orchestrator; its mirrored Claude package exists for repository parity and remains inert there.
Codex invokes skills with `$<skill>`; Claude Code invokes them with `/<skill>`. opencode invokes
them by name through its skill tool; its project config registers both skill trees and its
permission rules enforce the change-safety deny list. Shared workflow contracts live under
`docs/workflows/`; the Codex TUI artifact relay adapter lives under `docs/agent_setup/`. Cross-machine
installation is documented in `docs/agent_setup/CROSS_MACHINE_SETUP.md`.
