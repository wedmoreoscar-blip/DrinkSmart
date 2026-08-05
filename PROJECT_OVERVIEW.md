# DrinkSmart — Project Overview

> Read this first. It frames the codebase and tells you how I'd like you to help.

## What this app does

DrinkSmart helps people **plan a night out so they hit a target buzz** without overshooting. The user picks a target inebriation level (1–10) and a drinking duration; the app computes how much pure ethanol they need based on body composition (Watson TBW or FFM method), then either lets them pick drinks manually or has an AI (Claude Haiku) select drinks from a catalog. The output is a paced timeline showing what to drink and when.

It is **not** a calorie or sobriety tracker. It is forward-planning: input → drinks + schedule.

## Tech stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind + shadcn-ui
- **State:** React Context (for the math engine) + React Query (for Supabase-backed data) + localStorage (for the active drinking session)
- **Backend:** Supabase — Postgres + Auth (anonymous-first) + Storage + Deno edge functions
- **AI:** Anthropic Claude Haiku 4.5, called from a Supabase edge function with prompt caching on the catalog + tool-use for structured output
- **Mobile:** Capacitor (notifications already use `@capacitor/local-notifications`)

## Current state

A large two-phase refactor was completed recently:

- **Phase 1** — anonymous Supabase auth bootstrap, one-time onboarding (stats + drink preferences), localStorage-backed session that survives refresh, 3-tab IA (Profile / Plan / Timeline), schema additions (`profiles.preferences/theme/onboarded_at` + new `user_sessions` table).
- **Phase 2** — AI plan generation edge function with greedy deterministic fallback, locked-drink toggle, "use last night" restore, quick-add chips.

The code typechecks clean (`npx tsc --noEmit`) and is committed/pushed. **What's NOT done is live verification** — the backend (new Supabase project, anonymous-auth toggle, API key as secret, edge function deploy) hasn't been wired up yet, so nothing has been exercised against a real DB.

See `CLAUDE.md` for the detailed pitfalls list and known follow-ups.

## How I want you to help

- **Default to minimal changes.** This refactor was big and I want stability before adding more. If a fix is two lines, give me two lines, not a rewrite.
- **Respect the math engine.** `calculateDrinkTimeline` in `src/contexts/AppContext.tsx` is correct and shouldn't be touched without me asking. The Widmark/TBW formula is intentional.
- **Don't have the LLM do math.** The AI selects drinks from a catalog. The deterministic engine handles every quantitative thing. Any suggestion that the LLM compute BAC or pacing is wrong.
- **Be honest about uncertainty.** If you don't know whether a hook update will cascade-break things, say so before suggesting it. Especially around `AppContext` and the React Query hooks.
- **Prefer reusing what's there.** The codebase already has helpers (`computeTargetEthanolMl`, `getCategoryDefaultUnit`, `parsePreferences`, the React Query hook pattern from `useUserRole.ts`). Look before inventing.
- **Stay in the existing patterns.** Tailwind + shadcn for UI, React Query for any new Supabase-backed hook, edge functions in `supabase/functions/` following the `parse-menu` style. Don't pull in a new state library, a new styling system, or a new backend without asking.

## What I do NOT want unsolicited

- A redesign of `DrinksTab.tsx`. It's 1000+ lines and works; I left it alone for a reason.
- A migration off Supabase to something else.
- Adding Redux / Zustand / Jotai.
- Reverting to dynamic imports in `AppContext.tsx` (we explicitly removed those).
- Tests written for the sake of coverage. If you write a test, the unit should be either the deterministic engine or the greedy fallback.
- Changes to `bun.lockb` — the lockfile should not be manually edited.

## Things I will commonly ask about

- Supabase setup / RLS / migrations / edge function deployment
- The AI generation flow (the edge function, prompt caching, fallback behaviour)
- Mobile / Capacitor integration (notifications, build, deploy)
- The 3-tab UI and onboarding flow
- React Query patterns and hook staleness
- Performance and bundle size (eager vs. dynamic imports)
- Adding small features (a new preference, a new quick-add chip, a tweak to the math display)

## Project conventions worth knowing

- **Anonymous Supabase auth is required on launch.** Every user has a `user_id` from the start; "signing up" upgrades the anonymous account preserving the id.
- **Granular checkpoints.** When changing more than ~50 lines or touching multiple files, pause and let me review before pushing on. Don't batch a "refactor everything" into one blob.
- **Types file is hand-maintained** (`src/integrations/supabase/types.ts`). If a schema change happens, update it manually or regenerate with `supabase gen types typescript`.
- **The session shape in localStorage is versioned** (`drinksmart.session.v1`). Bump the version if you change the shape; don't silently migrate.

## Where to look first

- Architecture overview: `CLAUDE.md`
- Math engine: `src/contexts/AppContext.tsx` → `calculateDrinkTimeline`
- Schema: `src/integrations/supabase/types.ts`
- AI flow: `src/lib/generatePlan.ts` → `supabase/functions/generate-plan/index.ts` → `src/lib/greedyPlanFallback.ts`
- 3 tabs: `src/pages/Dashboard.tsx` → `Profile.tsx` / `PlanTab.tsx` / `TimelineTab.tsx`
- Auth flow: `src/lib/anonymousAuth.ts` + `src/pages/Auth.tsx`
