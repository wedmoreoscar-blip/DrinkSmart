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
- Every delegation spec states its verification baseline explicitly (see
  `docs/workflows/verification.md`): which commands must pass, which are known-failing and must not
  change, and which are `BLOCKED` on unavailable infrastructure. The implementer cannot ask.
- Follow `docs/workflows/change_safety.md` for writes, commits, worktrees, and integration. Follow
  `docs/workflows/verification.md` for evidence and live-backend limitations.
- Never push, deploy Supabase functions, apply migrations to a remote database, rotate secrets, or
  publish mobile builds without an explicit user request.

## Collaboration and isolation

- The root checkout is for user-directed work, planning, inspection, and integration.
- Run delegated implementations in Traycer-managed worktrees, never against the workspace folder
  itself. Traycer owns worktree creation and per-folder run location; the main checkout stays
  user-owned.
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

No automated unit suite currently covers the new deterministic engine. Never describe typechecking or
a build as functional verification. Remote Supabase, edge-function, notification, and mobile checks are
`BLOCKED` until their real infrastructure is available.

## Native workflows

Repo-local skills are available to both clients: audit-context, bench, decision-check, handoff,
healthcheck, kickoff, make-bench, skill-writing, speccheck, teacher, update-decisions, and
writespec. Codex invokes them with `$<skill>`; Claude Code invokes them with `/<skill>`. opencode
invokes them by name through its skill tool; its project config registers both skill trees and its
permission rules enforce the change-safety deny list. Their shared contracts
live under `docs/workflows/`, and cross-machine installation is documented in
`docs/agent_setup/CROSS_MACHINE_SETUP.md`.
