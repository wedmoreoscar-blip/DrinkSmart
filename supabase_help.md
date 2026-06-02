# Supabase in DrinkSmart — complete reference

> Last reviewed against official docs: mid-2026 (`@supabase/server` `withSupabase`, `(select auth.uid())` RLS pattern, two-step anonymous upgrade). Update this file whenever Supabase ships a relevant change.

## What we use Supabase for

DrinkSmart leans on five Supabase products. Each is mapped to a specific need in the app.

| Supabase product | What it does for us | Where in the code |
|---|---|---|
| **Postgres database** | Stores profiles, drinking-session history, saved custom drinks, establishment menus (incl. Wetherspoons), feedback, admin role grants | `supabase/migrations/`, `src/integrations/supabase/types.ts` |
| **Auth** | Anonymous sessions on launch, optional upgrade to email/password, password reset, role-based admin gating | `src/lib/anonymousAuth.ts`, `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx`, `src/hooks/useUserRole.ts` |
| **Edge Functions (Deno)** | Server-side AI calls so the API key never leaves the server: `generate-plan` (Anthropic Claude Haiku, plan generation), `parse-menu` (Anthropic Claude Haiku vision, menu OCR), `submit-feedback` (rate-limited insert) | `supabase/functions/*` |
| **Storage** | User avatar images | `src/pages/Auth.tsx` `uploadAvatar()` |
| **TypeScript client** (`@supabase/supabase-js@2`) | All client-side database, auth, function-invoke, storage calls | `src/integrations/supabase/client.ts` + every hook |

What we deliberately **don't** use: Realtime, pg_cron / Cron, Queues, Vector (pgvector), Foreign Data Wrappers, Logflare/Analytics, Branching, GraphQL. The app's data model is straightforward CRUD; none of those add value yet.

---

## 1. Database schema

Eleven migrations live in `supabase/migrations/`. They split into three groups:

| Migration | Purpose |
|---|---|
| `20251202155912_*.sql` → `20260126194344_*.sql` (9 files) | **Lovable-generated origin layer.** Created the `profiles`, `user_roles`, `feedback`, `establishments`, `establishment_drinks`, `saved_custom_drinks` tables, the `app_role` enum, the `has_role()` SECURITY DEFINER helper, and admin SELECT policies. |
| `20260518000000_phase1_profile_preferences_and_session.sql` | **Phase 1 additive.** Adds `preferences/theme/onboarded_at` columns to `profiles`; creates `user_sessions` table + RLS + `updated_at` trigger; adds explicit indexes on `user_id` columns; uses the modern `(select auth.uid())` RLS pattern. |
| `20260518000001_rls_auto_enable_trigger.sql` | **Belt-and-braces RLS.** Installs a Postgres event trigger so any future `CREATE TABLE` in `public` auto-runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. |

### Tables (current schema)

`public.profiles` — one row per Supabase user; created lazily on first profile write (sign-up or onboarding).
- `id uuid PK`, `user_id uuid` (FK to `auth.users`), `username text`, `avatar_url text`
- Body stats: `height_cm/ft/in`, `weight`, `weight_unit`, `height_unit`, `body_fat`, `age`, `sex`, `metric_type` (`'bmi' | 'ffmi'`)
- Added in Phase 1: `preferences jsonb` (`{ sweet, strong, categories_liked, categories_avoided }`), `theme text` (`'light'|'dark'|'system'`), `onboarded_at timestamptz`
- `created_at`, `updated_at`
- **RLS:** users SELECT/INSERT/UPDATE own row; admins SELECT all.

`public.user_sessions` — one row per user, upsert-only. Stores the user's most recent accepted plan for the "Use last night" feature.
- `user_id uuid PK` (FK to `auth.users` with ON DELETE CASCADE)
- `duration_minutes int` (check: > 0), `buzz_level int` (check: 1–10), `drinks jsonb`
- `updated_at timestamptz` (auto-bumped by `handle_user_sessions_updated_at` trigger)
- **RLS:** own row only; admins SELECT all.

`public.saved_custom_drinks` — user library of custom drinks.
- `id uuid PK`, `user_id uuid`, `drink_name text`, `abv numeric`, `created_at timestamptz`
- UNIQUE(`user_id`, `drink_name`)
- **RLS:** own rows only; admins SELECT all.

`public.establishments` — drink venues. NULL `user_id` = global (Wetherspoons); non-NULL = user's own scanned-menu establishment.
- `id uuid PK`, `name text UNIQUE`, `user_id uuid NULL`, `created_at`
- **RLS:** read global + own; write own only; admins SELECT all.

`public.establishment_drinks` — drinks within an establishment. Includes the Wetherspoons catalog (~228 rows seeded in migration `20251202161508_*.sql`).
- `id uuid PK`, `establishment_id uuid` (FK), `drink_name text`, `abv decimal(5,2)`, `category text`, `category_label text`, `price numeric NULL`, `volume numeric NULL`, `volume_unit text NULL`, `user_id uuid NULL`
- Indexes on `establishment_id`, `category`, `user_id`
- **RLS:** read where parent establishment is readable; write own only; admins SELECT all.

`public.feedback` — bug reports / feature requests submitted from the app.
- `id uuid PK`, `user_id uuid NULL`, `title text`, `description text`, `image_url text NULL`, `status text` (`'new'|'reviewed'`), `created_at`
- **RLS:** anyone (anon or authenticated) can INSERT; admins SELECT/UPDATE/DELETE.

`public.user_roles` — admin role grants.
- `id uuid PK`, `user_id uuid`, `role public.app_role` (enum: `'admin'|'moderator'|'user'`), `created_at`
- UNIQUE(`user_id`, `role`)
- **RLS:** admin-only (via the `has_role()` helper).

`public.user_drinks` — legacy table from Lovable; currently unused in the new flow. Type exists in `types.ts` for compatibility. Don't add new code that depends on it.

### Database functions

- **`public.has_role(_user_id uuid, _role app_role) returns boolean`** — `SECURITY DEFINER`, called from RLS policies (e.g., `(select public.has_role(auth.uid(), 'admin'))`) and from the client via `supabase.rpc('has_role', ...)` in `useUserRole`. Defined in the original Lovable migrations.
- **`public.handle_user_sessions_updated_at()`** — BEFORE UPDATE trigger function on `user_sessions` that bumps `updated_at`. Created in Phase 1.
- **`public.rls_auto_enable()`** — event trigger function on `ddl_command_end` that runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for any new public-schema table. Created in `20260518000001`.

### Triggers / event triggers

- `user_sessions_updated_at` → BEFORE UPDATE → calls `handle_user_sessions_updated_at`.
- `ensure_rls` → event trigger on `ddl_command_end` → calls `rls_auto_enable`.

### The `auth.users` table is Supabase-managed

We never touch `auth.users` directly. It's owned by the Supabase Auth service. We reference it via FK only (`profiles.user_id → auth.users.id`).

---

## 2. RLS policies — the modern pattern

Every table in `public` has RLS enabled and policies defined. We use the **2026 best-practice pattern**:

- Wrap `auth.uid()` and any `SECURITY DEFINER` helper call in `(select ...)`. This causes Postgres to evaluate the function once per statement (initPlan) instead of once per row — Supabase benchmarks show ~95% query speedup.
- Always specify the role via `TO authenticated` (or `TO anon, authenticated`) so the policy doesn't even run for the wrong role.
- Add an explicit index on every column referenced by a policy filter. FK columns are NOT auto-indexed in Postgres.

Example (from `20260518000000_phase1_*.sql`):

```sql
CREATE POLICY "Users can view their own session"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));
```

### Distinguishing anonymous vs permanent users

Anonymous Supabase users assume the **same `authenticated` Postgres role** as permanent users — they have a real JWT and a real `auth.uid()`. To gate a policy to permanent users only, check the `is_anonymous` JWT claim with a **restrictive** policy (otherwise it gets OR'd with permissive policies and effectively disabled):

```sql
CREATE POLICY "Only permanent users can post feedback"
  ON public.feedback AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK ((select (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);
```

We don't currently use any restrictive policies — anonymous users can do everything a logged-in user can. If you want to restrict any operation to permanent users, this is how.

### Adding a new policy — checklist

1. Use `(select auth.uid())`, not bare `auth.uid()`.
2. Specify `TO authenticated` (or appropriate role).
3. If filtering by anything other than primary key, ensure that column has an index.
4. Use `WITH CHECK` for INSERT/UPDATE (not just `USING`).
5. If you want a permanent-users-only restriction, add a `RESTRICTIVE` policy on `is_anonymous`.
6. Confirm with `EXPLAIN ANALYZE` on a representative query if perf matters.

---

## 3. Auth

### Anonymous bootstrap

On every app mount, before any route renders, `ensureSession()` in `src/lib/anonymousAuth.ts` runs:

```ts
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  await supabase.auth.signInAnonymously();
}
```

This is **idempotent** — if a session already exists (anonymous or permanent), it's reused. The function returns the session so callers can chain.

**Hard requirement:** Anonymous sign-ins must be enabled in **Authentication → Providers → Anonymous** in the Supabase dashboard. It's **off by default** and silently breaks the app's auth bootstrap if missed.

Anonymous users behave like permanent users:
- They have a real `user_id`.
- They can write to `profiles`, `user_sessions`, `saved_custom_drinks` etc. under RLS like anyone else.
- Their JWT carries `is_anonymous: true` — distinguishable via `session.user.is_anonymous` or `auth.jwt()->>'is_anonymous'` in policies.

### Anonymous → permanent upgrade (two-step)

The current Supabase docs require a **two-step** upgrade — the password CANNOT be set in the same call as the email change, because the email must be verified first. Our `Auth.tsx` upgrade flow does:

1. User submits email + username (no password collected).
2. We call `supabase.auth.updateUser({ email })` — Supabase links the email identity and sends a verification email.
3. We upsert the `profiles` row with the new username/avatar (keeps the same `user_id`).
4. We call `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })` — Supabase sends a second email with a password-set link.
5. User clicks email #1 → email is verified.
6. User clicks email #2 → lands on `/reset-password` → sets password.

**The `user_id` is preserved throughout.** All existing data (profile, sessions, saved drinks) carries over automatically.

**Hard requirement:** **Manual identity linking** must be enabled in **Authentication → Providers → Manual linking** for `updateUser({ email })` to work on an anonymous user. If off, our code catches the specific error and surfaces an actionable toast.

**Anti-pattern (do not reintroduce):**
```ts
// ❌ This will fail — password can't be set before email is verified
await supabase.auth.updateUser({ email, password });
```

### Email/password sign-in (returning permanent user)

Standard `signInWithPassword`. No customisation. Used in the same `Auth.tsx` form when `isUpgrade === false`.

### Password reset

`/reset-password` (`src/pages/ResetPassword.tsx`) is the redirect target for both forgot-password and the upgrade-flow password-set link. It uses `updateUser({ password })` once Supabase has authenticated the user via the recovery token in the URL.

### JWT and session lifecycle

- The client stores the session in `localStorage` automatically (configured in `src/integrations/supabase/client.ts`).
- `persistSession: true` + `autoRefreshToken: true` mean the token is refreshed silently before expiry.
- We subscribe to `supabase.auth.onAuthStateChange(...)` in `useUserMetrics`, `useSavedDrinks`, `useEstablishments`, `useUserRole`, `useLastSession`, and a few pages. Each subscriber tracks its own `userId` state. (Centralising into a single `useAuthUser` hook is a known follow-up.)

### Admin role

`useUserRole` calls the `has_role` Postgres function via `supabase.rpc('has_role', { _user_id, _role: 'admin' })` and caches the result for 5 minutes with React Query. The Profile tab and `/admin/feedback` route are gated on `isAdmin === true`.

---

## 4. Edge Functions

Three Deno-based edge functions live in `supabase/functions/`. They are registered in `supabase/config.toml`.

### `generate-plan` (modernised — current best practice)

Receives the deterministic ethanol budget computed client-side, asks Claude Haiku 4.5 to pick drinks from the catalog, returns a structured plan.

**Uses the 2026 `@supabase/server` `withSupabase` wrapper:**

```ts
// supabase/functions/generate-plan/index.ts
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    // ctx.userClaims    — { id, email, is_anonymous, ... }
    // ctx.supabase      — RLS-scoped client
    // ctx.supabaseAdmin — service-role client
    // CORS preflight and auth check are handled by the wrapper.
    // ... Anthropic API call with prompt caching ...
  }),
};
```

**Key choices:**

- `auth: 'user'` mode: requires a valid Supabase JWT (anonymous OK). The wrapper validates it before our handler runs.
- `config.toml` sets `verify_jwt = true` — the platform validates the JWT *before* the wrapper does. Default; left explicit for clarity.
- Dependencies declared in `supabase/functions/generate-plan/deno.json` using `npm:` specifiers — the current recommended pattern. **Avoid** `https://esm.sh/...` and `https://deno.land/std@...` (those are the legacy pattern; the docs page describing them is literally titled `auth-legacy-jwt.md`).
- Anthropic API called directly via `fetch` (no SDK needed). Headers: `x-api-key`, `anthropic-version`, `Content-Type`.
- **Prompt caching:** the system prompt and the catalog block carry `cache_control: { type: "ephemeral" }`. The block-with-cache_control plus everything before it forms the cache key, so the catalog is cached across calls (>90% cost reduction on the catalog after the first hit). Token usage is logged: `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`.
- **Tool-use forced** via `tool_choice: { type: "tool", name: "submit_plan" }` so the model can't return free text. The `submit_plan` tool's `input_schema` defines the structured output.
- **Belt-and-braces validation:** every returned `catalog_id` is checked against the input catalog; hallucinated ids are dropped with a warning log.

**Secret required:** `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`. Without it the function returns 500; the client falls back to the deterministic greedy generator (`src/lib/greedyPlanFallback.ts`) and toasts "Built offline."

### `parse-menu` (modernised)

Receives base64 images of a drinks menu, returns parsed drink data. Uses Claude Haiku 4.5 vision via the Anthropic API (the same `ANTHROPIC_API_KEY` as `generate-plan`).

Uses `withSupabase({ auth: 'user' })` — anonymous users can scan menus too. Per-function `deno.json` with `npm:` specifiers. Processes images one at a time so one bad image doesn't kill the rest; tool-use forced with the `extract_menu_drinks` tool for structured output. Token usage is logged per image.

### `submit-feedback` (modernised)

Receives a feedback payload, applies IP-based rate limiting (5/hour, in-memory map), inserts a row.

Uses `withSupabase({ auth: 'user' })`. Writes go through `ctx.supabase` (RLS-scoped) — we don't need service-role since the `feedback` INSERT policy is `WITH CHECK (true)`. **`user_id` is pulled from `ctx.userClaims.id`, never from the request body**, so a caller can't forge submissions as another user.

Future polish: move the IP rate limit out of memory into a Postgres counter table so it survives function cold starts. Not blocking.

### Function configuration

`supabase/config.toml` — all three functions use the modern wrapper:

```toml
[functions.parse-menu]
verify_jwt = true

[functions.submit-feedback]
verify_jwt = true

[functions.generate-plan]
verify_jwt = true
```

`verify_jwt = true` is required by `withSupabase({ auth: 'user' })` — the platform validates the JWT (anonymous OK) before the handler runs. Don't set `verify_jwt = false` unless you also switch the wrapper to `auth: 'none'`, which skips ALL auth checks (use only for signed webhooks).

### Deployment

```sh
supabase functions deploy generate-plan
# or all at once:
supabase functions deploy generate-plan parse-menu submit-feedback
```

The CLI handles bundling, the Deno runtime resolves `npm:` and JSR imports at deploy time.

### Background tasks (not yet used)

Edge Functions support `EdgeRuntime.waitUntil(promise)` for work that should continue after the response is sent. Not currently used, but worth knowing for: logging token usage to a separate table, sending webhooks, queuing jobs.

---

## 5. Storage

Single bucket: `avatars` (public read). Used during sign-up and the upgrade flow to upload a profile picture. Path pattern: `{userId}/{timestamp}.{ext}`.

```ts
// from Auth.tsx
await supabase.storage.from('avatars').upload(filePath, avatarFile);
const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
```

The bucket must exist in the Supabase project. Avatar uploads are best-effort; failures fall through silently (the user gets the default avatar icon).

---

## 5a. API keys — modern vs legacy (use modern)

Supabase is in the middle of a key-system migration. New projects can pick which to use; existing projects often have both available. **This codebase is configured for the modern keys throughout.**

### The two systems

| Legacy (deprecated) | Modern (recommended) |
|---|---|
| `anon` JWT key (long base64 string starting `eyJ...`) — safe to ship to the browser; RLS still applies | `sb_publishable_...` — same role, cleaner format, supports named keys |
| `service_role` JWT key — bypasses RLS; server-side only, NEVER ship to the browser | `sb_secret_...` — same role, cleaner format, supports named keys |

Both formats still work today; the platform provides legacy env var names (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) alongside the modern ones (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) for back-compat. The codebase **does not reference either set by hand** — the edge functions use `@supabase/server`'s `withSupabase` wrapper, which reads whichever set the platform provisions automatically.

### Where to find the modern keys in your Supabase project

In the dashboard:
1. **Project Settings → API Keys** (or Settings → API on older dashboards).
2. Look for the "**Publishable keys**" and "**Secret keys**" sections (these are the modern slots).
3. The default publishable key is named `default` and has the `sb_publishable_` prefix. Copy it into `.env`.
4. Secret keys are server-only. You don't need to copy one for this project — `withSupabase` reads them server-side automatically. If you ever do need one in your local dev shell, copy it into a local-only `.env.local` (never commit).
5. If the dashboard offers a toggle to "**Use new API keys**" or similar, enable it. Some accounts default to legacy.

### Our `.env` (client-side, committed to `.env.example` style template)

```
# Client-side env, read by Vite. Safe to ship the publishable key to the browser
# because RLS gates every query.
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."   # NOT the JWT-format anon key
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

If you have a legacy anon key (long `eyJ...` JWT), it still works — but get a modern `sb_publishable_...` from the dashboard and use that instead. Same powers, cleaner format, supports key rotation without breaking sessions.

### Server-side env (auto-provisioned by the platform)

You don't set these manually — the Supabase platform injects them into every edge function automatically:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL (used inside the wrapper) |
| `SUPABASE_PUBLISHABLE_KEY` (singular) or `SUPABASE_PUBLISHABLE_KEYS` (named JSON) | Modern publishable key(s) |
| `SUPABASE_SECRET_KEY` (singular) or `SUPABASE_SECRET_KEYS` (named JSON) | Modern secret key(s) — used by `ctx.supabaseAdmin` |
| `SUPABASE_JWKS` | JSON Web Key Set used to verify caller JWTs |
| `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Legacy back-compat. Do not reference in new code. |

For local dev with `supabase start`, the CLI provisions a single-key setup (`SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY`) automatically. The `withSupabase` wrapper accepts either form.

### Function-specific secrets we DO set manually

One third-party API key, set via the Supabase CLI:

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   # used by generate-plan AND parse-menu
```

Verify with `supabase secrets list`.

### Why this matters

- **No legacy key references in our code.** Future Supabase deprecations of the JWT-format keys won't break anything.
- **Cleaner key rotation.** Modern keys can be rotated in the dashboard without invalidating user sessions (legacy `service_role` rotation rotates the JWT signing secret, which kills every active session).
- **Named keys.** You can have multiple publishable/secret keys with names (`default`, `mobile`, `cron`, etc.) and the function can pin to a specific one with `auth: 'secret:<name>'` if desired.

## 6. Client integration

### Client setup

`src/integrations/supabase/client.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
```

Two env vars in `.env`:
- `VITE_SUPABASE_URL` — `https://<project>.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the `sb_publishable_...` key (RLS-protected, safe to ship to the browser)
- `VITE_SUPABASE_PROJECT_ID` — used by the `db:types` npm script for type generation

### Hooks pattern (React Query + Supabase)

Every Supabase-backed hook follows the same pattern after Checkpoint 2.2a's refactor (use `src/hooks/useUserMetrics.ts` as the canonical example):

```ts
const queryKey = ["profile", userId];

const query = useQuery({
  queryKey,
  enabled: !!userId,
  staleTime: 1000 * 60 * 5,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("...")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

const mutation = useMutation({
  mutationFn: async (input) => { /* supabase write */ },
  onSuccess: () => queryClient.invalidateQueries({ queryKey }),
});

// For UI snappiness on user-facing toggles (preferences, theme):
const optimisticMutation = useMutation({
  mutationFn: async (input) => { /* ... */ },
  onMutate: async (next) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old) => ({ ...old, ...next }));
    return { previous };
  },
  onError: (_e, _v, ctx) => ctx?.previous && queryClient.setQueryData(queryKey, ctx.previous),
  onSettled: () => queryClient.invalidateQueries({ queryKey }),
});
```

**Why this matters:** all instances of the hook across the 3-tab Dashboard share the same React Query cache. Saving preferences in the Profile tab immediately propagates to the Plan tab's preload effect without remounting. Pre-2.2a's per-instance `useState` snapshots caused cross-tab staleness bugs.

### Session-only state in the React Query cache

`useSavedDrinks` and `useEstablishments` also keep "session-only" data (guest mode, scanned menus before logging in) in the cache under separate keys (`["sessionDrinks"]`, `["sessionEstablishments"]`) with `enabled: false` + `initialData` + `staleTime: Infinity`. Mutations use `queryClient.setQueryData` directly. This makes session state cross-instance consistent too.

### Auth state subscription

```ts
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user?.id ?? null);
  };
  checkAuth();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
    setUserId(session?.user?.id ?? null);
  });

  return () => subscription.unsubscribe();
}, []);
```

Each hook tracks its own `userId` via this pattern. It's slightly wasteful (multiple subscriptions to the same auth state) but correct. Centralising into a single `useAuthUser` hook is a known follow-up.

### Always add a `.eq('user_id', userId)` filter

Even when RLS already filters by `user_id`, the docs benchmark shows that an explicit client-side filter improves the Postgres query plan dramatically (~95% speedup). Our hooks do this consistently — keep it that way.

---

## 7. Local development & CLI

### Install the Supabase CLI

```sh
npm i -g supabase   # or use the binary release
supabase login
supabase link --project-ref <your-project-id>
```

### Common commands

```sh
# Generate types from the live remote schema (uses VITE_SUPABASE_PROJECT_ID)
npm run db:types

# Generate types from a locally-running supabase instance
npm run db:types:local

# Apply migrations to the linked remote project
supabase db push

# Reset a local supabase instance from scratch
supabase db reset

# Run a single migration locally
supabase migration up

# Spin up a local supabase stack (Docker required)
supabase start

# Tail edge function logs from the platform
supabase functions logs generate-plan

# Deploy a single function
supabase functions deploy generate-plan

# Set / update a secret used by edge functions
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# List secrets
supabase secrets list
```

### Migration workflow

1. Create the SQL file: `supabase/migrations/<timestamp>_<description>.sql`. Use the format `YYYYMMDDhhmmss` for the timestamp prefix; the CLI sorts lexicographically.
2. Apply locally if you're running `supabase start`: `supabase migration up`.
3. Apply to remote: `supabase db push`.
4. Regenerate types: `npm run db:types`.
5. Commit both the migration file and the updated `types.ts`.

### Type generation

The `db:types` script in `package.json`:

```json
"db:types": "supabase gen types typescript --project-id \"$VITE_SUPABASE_PROJECT_ID\" --schema public > src/integrations/supabase/types.ts"
```

Runs whenever you apply a schema change. The file is committed because devs without the CLI configured still need to typecheck.

---

## 8. Deployment / first-time setup (modern, 2026)

When standing up the project against a fresh Supabase account:

1. `npm install`
2. **Create a new Supabase project** in the dashboard.
3. **Copy env values into `.env`:**
   ```
   VITE_SUPABASE_URL="https://<project>.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
   VITE_SUPABASE_PROJECT_ID="<project-ref>"
   ```
4. **Update `supabase/config.toml`:** set `project_id = "<project-ref>"`.
5. **Auth dashboard settings** (Authentication → Providers):
   - **Anonymous** → Enable. *(Required: app's auth bootstrap fails silently otherwise.)*
   - **Manual linking** → Enable. *(Required: anonymous → permanent upgrade flow fails otherwise.)*
   - **Email** → already on by default; configure SMTP if you want real verification emails (or use Supabase's built-in for dev).
6. **Create the `avatars` Storage bucket** (Storage → New bucket → name `avatars`, public read).
7. **Link the CLI and push migrations:**
   ```sh
   supabase link --project-ref <project-ref>
   supabase db push
   ```
   This applies all 11 migrations including the Wetherspoons catalog seed in `20251202161508_*.sql`.
8. **Set the Anthropic secret:**
   ```sh
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
9. **Deploy edge functions:**
   ```sh
   supabase functions deploy generate-plan parse-menu submit-feedback
   ```
10. **Regenerate types from the live schema:**
    ```sh
    npm run db:types
    ```
    Compare with the committed `types.ts` to confirm the schema matches.
11. **Promote yourself to admin** (so you can see the admin section of Profile + access `/admin/feedback`):
    ```sql
    INSERT INTO public.user_roles (user_id, role)
    VALUES ('<your-auth-user-id>', 'admin');
    ```
12. `npm run dev` and walk through the verification checklist in `CLAUDE.md`.

---

## 9. Best practices applied (and which ones we still owe)

### Applied ✓

| Practice | Where |
|---|---|
| RLS enabled on every public table | All migrations |
| `(select auth.uid())` wrapping in RLS | `20260518000000_phase1_*.sql`; legacy migrations still use bare `auth.uid()` and could be retrofitted |
| `TO authenticated` on policies | All Phase 1 policies; most legacy migrations too |
| Explicit indexes on `user_id` columns | Phase 1 migration |
| Auto-enable RLS event trigger | `20260518000001_rls_auto_enable_trigger.sql` |
| Anonymous auth bootstrap | `src/lib/anonymousAuth.ts` |
| Two-step anonymous upgrade | `src/pages/Auth.tsx` |
| Modern `@supabase/server` edge function pattern | `supabase/functions/generate-plan/` |
| Prompt caching with `cache_control: ephemeral` | `generate-plan/index.ts` |
| Tool-use forced for structured output | `generate-plan/index.ts` |
| Per-function `deno.json` with `npm:` specifiers | `generate-plan/deno.json` |
| React Query for shared cache + optimistic updates | `useUserMetrics`, `useSavedDrinks`, `useEstablishments`, `useLastSession`, `useUserRole` |
| `.eq('user_id', userId)` on client queries | All hooks |
| Hand-written `types.ts` + `db:types` script for regen | `src/integrations/supabase/types.ts`, `package.json` |
| `db:types` script for live regeneration | `package.json` |
| `EnsureSession()` idempotent and safe to call repeatedly | `src/lib/anonymousAuth.ts` |

### Outstanding follow-ups (not blocking but worth doing)

| Item | Effort | Why it matters |
|---|---|---|
| Retrofit the original 9 Lovable migrations' RLS policies to use `(select auth.uid())` | ~1 hour | ~95% perf gain on every RLS-filtered query on the older tables |
| Add `RESTRICTIVE` policies for permanent-users-only actions (e.g., feedback submit) if you ever want to lock anonymous users out of some endpoints | ~30 min per policy | Anti-abuse |
| Add Cloudflare Turnstile / hCaptcha to anonymous sign-in | Dashboard config + 1 client change | Anti-bot for the anon endpoint (default rate limit is 30/hr/IP) |
| Centralise the per-hook auth-state subscriptions into a single `useAuthUser` hook | ~1 hour | Reduces auth-state listener noise; cleaner |
| Run a cleanup query for expired anonymous users (>30 days old) | Postgres-side cron or manual | Prevents `auth.users` bloat from anon abuse |

---

## 10. Operational recipes

### Add a new table with RLS

1. Write the migration:
   ```sql
   -- supabase/migrations/<timestamp>_add_widgets.sql
   CREATE TABLE public.widgets (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     name text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now()
   );
   -- RLS is auto-enabled by the rls_auto_enable trigger; policies still needed:
   CREATE POLICY "Users can view own widgets"
     ON public.widgets FOR SELECT
     TO authenticated USING ((select auth.uid()) = user_id);
   CREATE POLICY "Users can create own widgets"
     ON public.widgets FOR INSERT
     TO authenticated WITH CHECK ((select auth.uid()) = user_id);
   CREATE INDEX widgets_user_id_idx ON public.widgets(user_id);
   ```
2. `supabase db push` against the remote, or `supabase migration up` against local.
3. `npm run db:types` to regenerate `types.ts`.
4. Create the hook (`useWidgets.ts`) following the React Query pattern.
5. Commit migration + `types.ts` + hook.

### Add a new edge function

1. `mkdir -p supabase/functions/widget-stats`
2. Create `supabase/functions/widget-stats/index.ts`:
   ```ts
   import { withSupabase } from "@supabase/server";
   export default {
     fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
       const { data } = await ctx.supabase.from("widgets").select("*");
       return Response.json({ widgets: data });
     }),
   };
   ```
3. Create `supabase/functions/widget-stats/deno.json`:
   ```json
   { "imports": { "@supabase/server": "npm:@supabase/server" } }
   ```
4. Register in `supabase/config.toml`:
   ```toml
   [functions.widget-stats]
   verify_jwt = true
   ```
5. `supabase functions deploy widget-stats`.
6. Invoke from the client: `await supabase.functions.invoke("widget-stats", { body: {...} })`.

### Promote a user to admin

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<auth-user-id>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Or remove:
```sql
DELETE FROM public.user_roles WHERE user_id = '<auth-user-id>' AND role = 'admin';
```

### Debug an edge function

```sh
# Tail the live logs
supabase functions logs generate-plan

# Test locally first (requires supabase start)
supabase functions serve generate-plan --env-file .env

# Invoke locally
curl -X POST 'http://localhost:54321/functions/v1/generate-plan' \
  -H "Authorization: Bearer $SUPABASE_PUBLISHABLE_KEY" \
  -H 'Content-Type: application/json' \
  -d '{ "target_ethanol_ml": 50, "duration_minutes": 120, ... }'
```

### Clean up anonymous user bloat

```sql
DELETE FROM auth.users
WHERE is_anonymous IS TRUE
  AND created_at < now() - interval '30 days';
```

Run periodically (manually or via pg_cron) to prevent unused anon users from accumulating.

---

## 11. Reference — where things live

| Concept | File(s) |
|---|---|
| Supabase client init | `src/integrations/supabase/client.ts` |
| Generated DB types | `src/integrations/supabase/types.ts` |
| Anonymous bootstrap | `src/lib/anonymousAuth.ts` (`ensureSession`, `isAnonymousSession`) |
| Sign-in / sign-up / anonymous upgrade UI | `src/pages/Auth.tsx` |
| Password reset UI | `src/pages/ResetPassword.tsx` |
| Profile data hook | `src/hooks/useUserMetrics.ts` |
| Last session hook | `src/hooks/useLastSession.ts` |
| Saved drinks hook | `src/hooks/useSavedDrinks.ts` |
| Establishments + menu hook | `src/hooks/useEstablishments.ts` |
| Admin role check | `src/hooks/useUserRole.ts` |
| Notifications (Capacitor-aware) | `src/lib/notificationService.ts`, `src/hooks/useNotifications.ts` |
| Edge function: AI plan generation | `supabase/functions/generate-plan/index.ts` + `deno.json` |
| Edge function: menu OCR | `supabase/functions/parse-menu/index.ts` |
| Edge function: feedback submit | `supabase/functions/submit-feedback/index.ts` |
| Function config | `supabase/config.toml` |
| Latest schema additions | `supabase/migrations/20260518000000_phase1_profile_preferences_and_session.sql` |
| RLS auto-enable trigger | `supabase/migrations/20260518000001_rls_auto_enable_trigger.sql` |
| Wetherspoons catalog seed | `supabase/migrations/20251202161508_*.sql` |
| Type-gen scripts | `package.json` (`db:types`, `db:types:local`) |

---

## 12. Things to read in `supabase documentation/` if you go deeper

- `guides/auth/auth-anonymous.md` — full reference on anon sign-ins, upgrade flow, restrictive RLS for permanent-only actions.
- `guides/database/postgres/row-level-security.md` — RLS reference including the `(select auth.uid())` pattern and benchmarks.
- `guides/functions/auth.md` — current edge function auth patterns (`withSupabase`, `auth: 'user'/'secret'/'publishable'/'none'`).
- `guides/functions/auth-legacy-jwt.md` — the legacy pattern we replaced. Useful as a reference for what NOT to do.
- `guides/functions/dependencies.md` — `npm:` specifiers and per-function `deno.json`.
- `guides/functions/background-tasks.md` — `EdgeRuntime.waitUntil()` for fire-and-forget work post-response.
- `guides/api/rest/generating-types.md` — the `supabase gen types` CLI used by our `db:types` script.
- `guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv.md` — the source of the `(select auth.uid())` perf claim.
- `reference/javascript/auth-signinanonymously.md`, `auth-updateuser.md`, `auth-resetpasswordforemail.md` — exact API shapes for the auth methods we use.
