# CLAUDE.md — DrinkSmart

Notes for future Claude instances working on this codebase. Focused on **non-obvious things** that bit us during the Phase 1 + Phase 2 refactor.

## Project overview

React + Vite + TypeScript + Supabase. Helps users pace drinks to hit a target BAC.

**Three tabs:** Profile (left), Plan (middle, default), Timeline (right). Onboarding modal gates first use. Anonymous Supabase auth on first launch — every user has a `user_id`, the upgrade-to-real-account path preserves it.

**The math engine** (`src/contexts/AppContext.tsx`) is the source of truth for BAC and pacing. **Do not have the LLM do math** — it picks drinks from a catalog; the deterministic engine does everything quantitative.

## Build status (as of last refactor commit)

- `npx tsc --noEmit` passes clean.
- `npm run lint` has not been run; do this before any release.
- No automated tests exist for the new code. The deterministic engine (`calculateDrinkTimeline` in `AppContext.tsx`), `computeTargetEthanolMl`, and `greedyPlanFallback` are the natural unit-test candidates.
- `npm install` reports 17 pre-existing dependency vulnerabilities (8 moderate, 9 high). They predate this refactor; triage with `npm audit` before going to prod.
- The codebase was updated to current Supabase patterns (mid-2026): RLS policies wrap `auth.uid()` in `(select ...)` for ~95% perf gain; the edge function uses `@supabase/server`'s `withSupabase` wrapper; the anonymous-upgrade flow is two-step (email link, then password-reset link); a `db:types` npm script regenerates `types.ts` from the live schema.

---

## Pitfalls & gotchas

### Supabase / backend

1. **Anonymous sign-ins are off by default.** The entire app's auth bootstrap depends on `supabase.auth.signInAnonymously()` succeeding. If a fresh Supabase project is created, you MUST enable anonymous sign-ins in **Authentication → Providers → Anonymous** or every user gets stuck on a blank screen with a silent auth error. There is no in-app affordance to recover.

1a. **Manual identity linking must be enabled** for the anonymous → permanent upgrade flow to work. Toggle it on at **Authentication → Providers → Manual linking**. If it's off, `updateUser({ email })` on `/auth` will return an error. We catch that specific error and surface a toast, but you still have to enable the setting.

2. **`ANTHROPIC_API_KEY` must be a Supabase secret.** Set via `supabase secrets set ANTHROPIC_API_KEY=...`. If missing, the `generate-plan` edge function returns 500 — but `src/lib/generatePlan.ts` catches it and falls back to the greedy generator silently. You'll see "Built offline" toasts and no AI calls. Check the function logs for `ANTHROPIC_API_KEY not configured`.

3. **`types.ts` regeneration is scripted but still manual to run.** `npm run db:types` (project) or `npm run db:types:local` (local CLI) writes `src/integrations/supabase/types.ts` from the current schema. **There is no auto-trigger** — run it manually whenever you apply a migration. The file is committed because devs without the CLI configured still need to typecheck.

4. **The Phase 1 migration in `supabase/migrations/20260518000000_phase1_*.sql` has not been applied to any live DB.** It's been written but not run. First-time setup needs to run it.

5. **Lovable's GitHub sync may or may not auto-apply manually-authored migrations.** This repo originated as a Lovable project (`project_id = "bdgfmcspurftimormevy"`). The user moved off Lovable; if you ever sync back, hand-authored migration files may not run against the live project — Lovable typically only applies migrations it generated itself. Verify before assuming.

6. **`user_sessions` is one row per user (PK = user_id).** Upsert pattern. The trigger `handle_user_sessions_updated_at` keeps `updated_at` fresh.

### Auth flow

7. **Anonymous → real-account upgrade is two-step** per current Supabase docs. The password CANNOT be set in the same call as the email change — the email must be verified first. Our flow on `/auth`:
   - User submits email + username (no password). We call `updateUser({ email })` to link the identity; Supabase sends a verification email.
   - We also call `resetPasswordForEmail(email)` so the user gets a second email with a password-set link they use after verifying.
   - The user clicks the verification link → their email is verified. Then clicks the password-reset link → they set a password.
   - The `user_id` is preserved throughout. Existing profile, sessions, saved drinks all carry over.
   - If you try to call `updateUser({ password })` immediately after `updateUser({ email })` before verification, it'll fail. Don't add that back.

8. **The `/auth` page detects anonymous sessions** and switches into "upgrade" mode. The auth-state effect distinguishes between real and anonymous sessions: real session → redirect to `/dashboard`, anonymous session → stay on `/auth`. If you change the redirect logic, preserve this distinction.

### Hooks & state

9. **Use React Query for any new Supabase-backed hook.** The original `useUserMetrics`, `useSavedDrinks`, `useEstablishments` used `useState` snapshots per instance, which caused cross-tab staleness bugs (changes in Profile didn't propagate to PlanTab). Checkpoint 2.2a refactored all three to React Query. **Do not regress this** — new hooks should use the pattern in `useUserRole.ts`.

10. **`AppContext.state.userMetrics` is glued to `useUserMetrics` via `MetricsSync`** (`src/components/MetricsSync.tsx`). This is a workaround — AppContext was originally fed by UserInfoTab which is now deleted. If you remove or bypass MetricsSync, the BAC math silently runs on empty user metrics and produces no timeline. Long-term cleanup: have AppContext read directly from useUserMetrics.

11. **Each refactored hook still tracks its own `userId` via a local `useState` + `onAuthStateChange` subscription.** Cheap but slightly wasteful. If you centralize auth, update all three hooks together (their query keys depend on `userId`).

12. **Session-only state lives in the React Query cache** under keys `["sessionDrinks"]` and `["sessionEstablishments"]` with `enabled: false` + `initialData` + `staleTime: Infinity`. Mutated only via `setQueryData`. **`queryFn` never runs** for these. Surprising if you're not expecting it.

13. **`lockedDrinkIds` can hold stale ids.** When `state.drinks` changes (e.g., regenerate replaces the array), the ids in `lockedDrinkIds` that no longer exist just become dead entries. Harmless (the includes-check matches nothing) but should be pruned in `updateDrinks` if it ever causes confusion.

### BAC math engine

14. **The math engine is correct — don't touch unless you understand Widmark.** The formula:
    ```
    pure_ethanol_ml = ((BAC_midpoint / 100) + (0.00015 × hours)) × TBW_grams / 0.789
    ```
    BAC is a midpoint of the user-selected buzz band; the `0.00015 × hours` term compensates for liver metabolism over the drinking window.

15. **`adjustedTargetMl` is a feature, not a bug.** When the user's selected drinks exceed 100% of the target, the engine scales the target upward (rather than dropping drinks) so percentages still sum to 100. The Timeline tab shows `(adjusted)`. Don't "fix" this by capping percentages.

16. **0% ABV drinks would break pacing.** They contribute zero ethanol → 0% of target → 0 time allocated → cluster at t=0. This is why "+ Water" was dropped from the quick-add chips. To support non-alcoholic entries as breaks, the engine needs a separate code path.

17. **Eager imports.** `AppContext.tsx` previously had `import("@/data/drinksData").then(...)` dynamic imports inside the hot path of `calculateDrinkTimeline`. These were eager-imported in Checkpoint 1.6. **Don't re-introduce dynamic imports for the catalog or buzz levels** — they're tiny static data files.

### AI generation

18. **The LLM never does math.** `src/supabase/functions/generate-plan/index.ts` gives Claude a pre-computed `target_ethanol_ml` and asks for catalog picks via tool-use (forced structured JSON). The client validates that every returned `catalog_id` exists in the input catalog and drops hallucinated ones.

19. **Anthropic prompt caching depends on identical preamble.** The system prompt + catalog block uses `cache_control: { type: "ephemeral" }`. If the catalog's order or content changes between calls, the cache invalidates and you pay full cost. `Object.entries(drinkCategories)` is stable in V8, but **if you sort/filter the catalog client-side per request, you'll never get cache hits**.

20. **`generatePlan` never throws.** It wraps the edge function call in a 6s timeout race; on any failure it falls back to `greedyPlanFallback`. Callers don't need try/catch. The return type is `GeneratePlanResult` which has a `usedFallback: boolean` flag — surface that to the user if they're suddenly getting deterministic plans.

21. **Greedy fallback's category sweet/strong axes (`CATEGORY_AXES` in `greedyPlanFallback.ts`) are hand-tuned.** If new categories get added to `drinksData.ts`, add entries to that table or scoring defaults will kick in (sweet=0.5, strong=0.5).

22. **The model is pinned at `claude-haiku-4-5-20251001`** in the edge function. To upgrade: change `ANTHROPIC_MODEL` at the top of `generate-plan/index.ts`. Don't switch to Sonnet/Opus without measuring — Haiku is plenty for this task and an order of magnitude cheaper.

23. **The static catalog is Wetherspoons-only.** Future work: merge in user-specific `establishment_drinks` when the user has selected an establishment. The catalog format is already designed for it (`CatalogItem.id` uses `category::name` for static, `est::<id>` would work for establishment-scoped).

23a. **The edge function uses the `@supabase/server` `withSupabase` wrapper** (mid-2026 pattern), not the legacy `serve` + manual `createClient` + manual auth check pattern. `auth: 'user'` mode enforces a valid JWT (including anonymous JWTs) and gives you `ctx.supabase` (RLS-scoped) and `ctx.userClaims`. Dependencies are declared in `supabase/functions/generate-plan/deno.json` using `npm:` specifiers. **Don't revert to `https://esm.sh/` URLs or the std `serve` import** — they're legacy.

23b. **`config.toml` for `generate-plan` has `verify_jwt = true`.** This is required for `auth: 'user'` mode — the platform validates the JWT before the handler runs. Don't switch back to `verify_jwt = false`; anonymous users have valid JWTs and pass this check.

### RLS

23c. **RLS policies wrap `auth.uid()` in `(select ...)`.** `(select auth.uid()) = user_id` instead of `auth.uid() = user_id`. Per Supabase benchmarks this is ~95% faster on RLS-filtered queries because Postgres caches the function result per statement instead of per row. **Do not regress this** in new policies. Same pattern applies to `auth.jwt()` and SECURITY DEFINER helper functions (e.g. `public.has_role`).

23d. **Indexes exist on every `user_id` referenced by a policy** (added in the Phase 1 migration). Foreign keys are NOT auto-indexed in Postgres. If you add a new policy that filters by a column other than `user_id`, add an index for it.

23e. **An event trigger auto-enables RLS on new public-schema tables** (`supabase/migrations/20260518000001_rls_auto_enable_trigger.sql`). New tables don't need an explicit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` — the trigger fires after `CREATE TABLE` and does it for you. You still have to write the actual policies.

### UI

24. **The Onboarding modal's close X is hidden via `[&>button.absolute]:hidden`.** Brittle — relies on the shadcn dialog's auto-rendered Close button being absolutely positioned. If shadcn refactors the dialog, the X reappears and onboarding becomes dismissable. Test after shadcn upgrades.

25. **Tabs don't unmount when inactive (shadcn behavior).** All three tab components stay mounted for the lifetime of the Dashboard. This is why hook staleness mattered (Checkpoint 2.2a) — multiple instances of the same hook coexist.

26. **`DrinksTab.tsx` is 1000+ lines and was deliberately not refactored.** It does drink selection, custom drinks, ABV filters, price extraction, portion splits, and a battery-style pure-alcohol meter. Touch carefully. Its `onNext` prop is fired by the embedded `[Next]` button; in the new 3-tab layout it routes to the Timeline tab.

27. **The Profile tab calls `useNavigate("/auth")` and `useNavigate("/admin/feedback")`.** This leaves the Dashboard. Account.tsx still exists at `/account` as a legacy route — nothing in the app links to it after Phase 1, but it works.

### Capacitor / mobile

28. **Notifications are Capacitor-native already** (`src/lib/notificationService.ts` uses `@capacitor/local-notifications`). Web fallback is via `useWebDrinkReminders` (sonner toasts). Test on actual iOS/Android — `npm run dev` only exercises the web fallback.

29. **`capacitor.config.ts` may need updating** when the Supabase project changes URL. Check before building native bundles.

### localStorage

30. **The localStorage key is versioned: `drinksmart.session.v1`.** If you change the persisted shape, bump to `.v2` and the old key becomes dead but harmless. **Don't migrate silently** — the schema includes Date fields that go through ISO-string serialization.

31. **`sessionStore.saveSession` is debounced 500ms.** A page closed before the debounce fires loses the unsaved changes. Acceptable; not a real-world issue for the drinking-app use case.

---

## Configuration required to run

When setting up a fresh environment:

1. `npm install`
2. Create a new Supabase project (or use the existing one if you have access).
3. Copy URL + publishable key into `.env`:
   ```
   VITE_SUPABASE_URL="https://<project>.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="<anon key>"
   VITE_SUPABASE_PROJECT_ID="<id>"
   ```
4. Update `supabase/config.toml` with the same `project_id`.
5. Enable **Anonymous sign-ins** in the Supabase Auth dashboard.
5a. Enable **Manual identity linking** at Authentication → Providers → Manual linking (required for anon → permanent account upgrade).
6. Run all 11 migrations (the original 9 + the Phase 1 additive migration + the RLS auto-enable trigger).
7. Set the secret: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`.
8. Deploy edge functions: `supabase functions deploy generate-plan parse-menu submit-feedback`.
9. (Optional) Regenerate types from the live schema: `npm run db:types` (reads `VITE_SUPABASE_PROJECT_ID` from your env).
10. `npm run dev`.

---

## Verification still needed (live backend required)

The code is written and typechecks; nothing here has been exercised against a real Supabase project. Walk through these once the backend is set up:

- **Anonymous bootstrap** — first launch should silently create a Supabase anon user. Check `auth.users` for an `is_anonymous = true` row.
- **Onboarding flow** — the modal should appear, write the `profiles` row with stats + preferences, and set `onboarded_at`. Re-launch should skip the modal.
- **localStorage hydration** — set buzz/duration/drinks, refresh the page, confirm state restores.
- **Anonymous → real upgrade** — `/auth` should detect the anon session and switch into upgrade mode. After upgrade, `auth.users.id` must be unchanged; the profile row carries over.
- **`generate-plan`** — fires within ~1s when the API key is set; falls back to greedy with a "Built offline" toast when the key is missing or the function is down.
- **Lock + regenerate** — locked drinks survive, their ethanol is subtracted from the budget passed to the LLM.
- **"Use last night"** — on a returning user, the banner appears with the previous duration/buzz/drinks; tapping it restores them with start = now.
- **Quick-add chips** — appending a drink re-paces the timeline immediately.
- **Theme persistence** — toggle dark mode in Profile; refresh; confirm theme stays (via `profiles.theme` + `next-themes`).
- **Admin gating** — log in as a non-admin and confirm the Profile "Admin" section does not render. Promote to admin via `user_roles`, confirm the section appears.

## Mobile / Capacitor (entirely unverified)

- Notifications: `npx cap sync ios`, build, install on a real device, schedule a plan, confirm a local notification fires at the right time. Same for Android.
- Confirm `capacitor.config.ts` references the right Supabase URL after any project changes.

---

## Known follow-ups (deliberately out of scope)

- Drop the dependency of `AppContext.state.userMetrics` on `MetricsSync` — read directly from `useUserMetrics`.
- Merge `establishment_drinks` into the AI catalog when an establishment is selected.
- Auto-prune stale `lockedDrinkIds` when drinks change.
- Add a "break" entry type to the engine to support water / non-alcoholic chips.
- Delete `src/pages/Account.tsx` (orphaned by the 3-tab restructure) and remove the `/account` route.
- Delete `src/components/settings/GraphicsSheet.tsx` (orphaned).
- Decide whether to centralize the per-hook `userId` auth subscriptions into a single `useAuthUser` hook.
- Auto-regenerate `src/integrations/supabase/types.ts` via the Supabase CLI rather than hand-maintaining it.
- Write unit tests for `calculateDrinkTimeline`, `computeTargetEthanolMl`, and `greedyPlanFallback`. The math engine and the fallback are deterministic and easy to cover.
- Run `npm audit` and decide which dependency vulnerabilities to address.
- Run `npm run lint` and clean any warnings/errors.

---

## File map (Phase 1 + Phase 2 additions)

```
src/lib/
  anonymousAuth.ts       Anonymous Supabase session bootstrap
  sessionStore.ts        localStorage for the active drinking session
  preferences.ts         PreferenceData type + parser + category helpers
  planCatalog.ts         Static catalog from drinksData + id parsing
  generatePlan.ts        Client wrapper around generate-plan edge fn + fallback
  greedyPlanFallback.ts  Deterministic offline-safe drink picker

src/components/onboarding/
  OnboardingModal.tsx    Two-step (stats → preferences) gated by onboarded_at
  StatsForm.tsx          Reusable stats form
  PreferencesPicker.tsx  Sweet/strong sliders + like/avoid chips

src/components/MetricsSync.tsx   Bridges useUserMetrics → AppContext

src/hooks/
  useLastSession.ts      user_sessions row + upsert
  useUserMetrics.ts      Refactored to React Query (2.2a)
  useSavedDrinks.ts      Refactored to React Query (2.2a)
  useEstablishments.ts   Refactored to React Query (2.2a)

src/pages/
  Profile.tsx            New 3-tab Profile content (was Account-style page)

src/components/tabs/
  PlanTab.tsx            Renamed/repurposed from InebriationLevelTab

supabase/functions/generate-plan/index.ts
supabase/migrations/20260518000000_phase1_profile_preferences_and_session.sql
```
