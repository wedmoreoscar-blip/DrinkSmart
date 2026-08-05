# DrinkSmart — security audit & posture

> Last reviewed: when anonymous sign-ins were enabled on the live Supabase project. **Re-review** every time you change RLS policies, add a new table, or change auth provider settings.

## TL;DR — what's safe today

Anonymous users cannot read or modify another user's data. The core privacy guarantee holds.

The remaining risks are **abuse, cost, and bloat** — bots can spam anonymous signups, feedback submissions, and storage uploads. None of this leaks user data; it costs compute, storage, and DB rows.

**Priority order if/when you make the app public:**
1. CAPTCHA on anonymous sign-ins (highest impact)
2. Storage bucket size limits (30 seconds in the dashboard)
3. Daily cleanup of stale anonymous users (pg_cron)
4. Move feedback rate limit from in-memory to a Postgres counter table

---

## 1. Per-table audit

Anonymous users have a real `user_id` and use the `authenticated` Postgres role — same as permanent users. Our RLS policies filter on `user_id`, so an anon user is sandboxed to their own data.

| Table | Anonymous user CAN | Anonymous user CANNOT | Verdict |
|---|---|---|---|
| `profiles` | Read/write their own row | See or modify anyone else's row | ✅ Safe |
| `user_sessions` | Upsert their own row | See anyone else's sessions | ✅ Safe |
| `saved_custom_drinks` | Manage their own drinks | See anyone else's drinks | ✅ Safe |
| `establishments` | Create own; read own + global (Wetherspoons) | See other users' establishments | ✅ Safe (bloat risk — see §3) |
| `establishment_drinks` | Add drinks to their own establishments | See drinks of other users' establishments | ✅ Safe (bloat risk — see §3) |
| `user_roles` | Read nothing | Grant themselves admin or any role | ✅ Safe |
| `feedback` | INSERT with their own `user_id` (forged from JWT, not request body) | Read submitted feedback (admin-only SELECT) | ✅ Safe (spam risk — see §3) |

### Storage buckets

| Bucket | Anonymous user CAN | Anonymous user CANNOT | Verdict |
|---|---|---|---|
| `avatars` | Upload only to `{userId}/` path; read any avatar (bucket is public) | Overwrite anyone else's avatar | ✅ Safe (size bloat risk) |
| `feedback-images` | Upload (with valid image extension); read any feedback image | Delete (admin-only) | 🟡 Bloat / abuse risk |

---

## 2. RLS pattern in use

All Phase 1 policies follow the modern Supabase pattern:

- `auth.uid()` wrapped in `(select ...)` for ~95% query speedup (Postgres caches the function call per statement instead of per row)
- `TO authenticated` on every policy so it doesn't even run for the `anon` role
- Explicit indexes on every `user_id` column referenced in a policy
- RLS auto-enabled on new tables via an event trigger (`supabase/migrations/20260518000001_*.sql`)

Reference: `supabase/migrations/20260518000000_phase1_*.sql` for the modern policies; the older origin migrations still use the bare `auth.uid()` pattern and would benefit from a retrofit pass.

---

## 3. Attack surfaces (abuse / cost / bloat — NOT data leakage)

### 3a. Anonymous account bloat

**The risk:** Bots can hit `supabase.auth.signInAnonymously()` repeatedly. Each call creates a real row in `auth.users`. The default rate limit is 30 requests/hour/IP, which a distributed bot can sidestep.

**Why it matters:** Bloats the auth table, slows admin queries, and counts against your MAU billing on paid plans.

**Mitigations:**
1. **CAPTCHA** (see §5). Highest leverage — kills most automated abuse at the door.
2. **Periodic cleanup of unused anonymous users** (run daily via `pg_cron` or manually):
   ```sql
   DELETE FROM auth.users
   WHERE is_anonymous IS TRUE
     AND created_at < now() - interval '30 days';
   ```

### 3b. Feedback spam

**The risk:** Any signed-in user (anonymous or permanent) can `INSERT` into `feedback`. Submission rate is limited to 5/hour/IP via the `submit-feedback` edge function, but the rate limit is **in-memory and resets on cold start** — a determined attacker can wait out the window or hit you during a cold start.

**Why it matters:** Bloats the feedback table and triggers admin notifications/processing.

**Mitigations:**
1. **CAPTCHA** on the submit form (the same Turnstile widget you'd add for sign-ins can wrap this).
2. **Move the rate limit to a Postgres counter table** so it survives cold starts and works across regional function instances. Sketch:
   ```sql
   CREATE TABLE public.feedback_rate_limit (
     ip text PRIMARY KEY,
     count int NOT NULL DEFAULT 0,
     reset_at timestamptz NOT NULL
   );
   ```
   Then in the edge function, upsert + check before the INSERT.

### 3c. Establishment / menu junk

**The risk:** An anon user (or bot using a hijacked anon session) can create as many `establishments` and `establishment_drinks` rows as they want. RLS hides them from other users, but they still count toward your DB row totals.

**Why it matters:** Bloat. Storage is cheap but unbounded.

**Mitigations** (in order of effort):
1. **CAPTCHA** at sign-in already filters most automation upstream.
2. **Add a permanent-users-only restrictive policy** if you decide scanned menus should be a power feature:
   ```sql
   CREATE POLICY "Only permanent users can create establishments"
     ON public.establishments AS RESTRICTIVE FOR INSERT
     TO authenticated
     WITH CHECK ((select (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);

   CREATE POLICY "Only permanent users can create establishment drinks"
     ON public.establishment_drinks AS RESTRICTIVE FOR INSERT
     TO authenticated
     WITH CHECK ((select (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);
   ```
   **The `RESTRICTIVE` keyword is critical** — without it the policy gets OR'd with the existing permissive policies and is effectively a no-op.
3. **Per-user quotas** at the DB level if you want hard caps (e.g., max 10 establishments per user):
   ```sql
   CREATE OR REPLACE FUNCTION public.check_establishment_quota()
   RETURNS trigger LANGUAGE plpgsql AS $$
   BEGIN
     IF (SELECT count(*) FROM public.establishments WHERE user_id = NEW.user_id) >= 10 THEN
       RAISE EXCEPTION 'Establishment quota exceeded (max 10 per user)';
     END IF;
     RETURN NEW;
   END;
   $$;
   CREATE TRIGGER establishment_quota_check
     BEFORE INSERT ON public.establishments
     FOR EACH ROW EXECUTE FUNCTION public.check_establishment_quota();
   ```

### 3d. Storage bloat

**The risk:** Both `avatars` and `feedback-images` allow uploads without size limits. A bot can fill your storage quota.

**Why it matters:** Storage costs money. Also slows backups and recovery.

**Mitigations:**
1. **Set bucket-level file size limits in the dashboard.** Storage → click the bucket → Settings → set max file size. Suggested:
   - `avatars`: **2 MB** (a profile pic doesn't need to be bigger)
   - `feedback-images`: **5 MB** (screenshots can be a bit larger)
2. **Add MIME-type allowlist** on the bucket (already partly enforced by the extension check on `feedback-images`, but bucket-level config is stricter).
3. **CAPTCHA at sign-in** catches the bots before they can upload.

---

## 4. What's intentionally open

These are choices, not oversights. Documented here so future reviewers know they're deliberate.

- **Anonymous signup is open to everyone** (gated only by rate limit + future CAPTCHA). This is the entire "zero-friction first use" product premise — you can't lock it down without losing it.
- **Submitting feedback is open to anonymous users.** You wanted everyone to be able to send feedback (this came up explicitly in the refactor planning).
- **Scanning a menu is open to anonymous users.** Power feature, but not gated. If you change your mind, see §3c for the restrictive policy.
- **All avatars are public-read.** Anyone can fetch any avatar URL. Standard for profile pictures.
- **All feedback images are public-read.** They're attached to feedback that only admins see, but the URL itself is technically guessable. Acceptable trade-off.

---

## 5. CAPTCHA setup — when you're ready

Two parts; total time ~30 minutes.

### Part 1 — Cloudflare Turnstile (5 min)

1. Sign up free at https://www.cloudflare.com/products/turnstile/.
2. Create a new site. Get the **Site Key** (public, goes in code) and **Secret Key** (server-only).
3. Supabase dashboard → **Authentication → Attack Protection** (sometimes labelled "Bot and Abuse Protection").
4. Enable **CAPTCHA Protection**, choose **Turnstile**, paste the **Secret Key**, save.

### Part 2 — Code integration (~30 lines)

1. Install: `npm install @marsidev/react-turnstile`.
2. Get the site key into the client. Add to `.env`:
   ```
   VITE_TURNSTILE_SITE_KEY="0x4AAAA..."
   ```
3. In `src/lib/anonymousAuth.ts`, render Turnstile invisibly and pass the resulting token:
   ```ts
   await supabase.auth.signInAnonymously({
     options: { captchaToken: turnstileToken }
   });
   ```
4. Same for `signUp` / `signInWithPassword` / `resetPasswordForEmail` in `src/pages/Auth.tsx`.

### Part 3 — Local dev keys

CAPTCHA on `signInAnonymously` breaks local dev unless you use Turnstile's test keys (they always pass):
- Site key: `1x00000000000000000000AA`
- Secret key: `1x0000000000000000000000000000000AA`

Put the test site key in `.env.development` so local dev is frictionless; the real key only ships to production.

When you want this wired up, ask me — it's a small focused change.

---

## 6. Operational checklist

When making the app public-facing, run through this list once and then quarterly:

- [ ] Anonymous Sign-Ins enabled in Auth → Providers (verify saved)
- [ ] Manual Linking enabled in Auth → Providers (required for upgrade flow)
- [ ] CAPTCHA configured in Auth → Attack Protection
- [ ] `ANTHROPIC_API_KEY` set as Supabase secret
- [ ] All 3 edge functions deployed (`generate-plan`, `parse-menu`, `submit-feedback`)
- [ ] Storage bucket size limits set: avatars 2 MB, feedback-images 5 MB
- [ ] `pg_cron` daily job for anon user cleanup scheduled
- [ ] Admin role granted to your own user (`INSERT INTO user_roles ...`)
- [ ] No edge function references `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` directly (use the `withSupabase` wrapper)
- [ ] RLS verified enabled on every public-schema table:
  ```sql
  SELECT schemaname, tablename, rowsecurity
    FROM pg_tables
   WHERE schemaname = 'public'
     AND rowsecurity = false;
  ```
  Should return zero rows.

---

## 7. Reference — files involved

| Concern | File(s) |
|---|---|
| Anonymous auth bootstrap | `src/lib/anonymousAuth.ts` |
| Anonymous → permanent upgrade | `src/pages/Auth.tsx` |
| Profile / session RLS | `supabase/migrations/20260518000000_phase1_profile_preferences_and_session.sql` |
| Auto-enable RLS trigger | `supabase/migrations/20260518000001_rls_auto_enable_trigger.sql` |
| Admin role helper | `public.has_role()` Postgres function (defined in original migrations) |
| Storage policies (avatars) | `supabase/migrations/20251202155912_*.sql` |
| Storage policies (feedback-images) | `supabase/migrations/20260126190357_*.sql`, `20260126193107_*.sql` |
| Feedback edge function (rate limit + RLS-scoped insert) | `supabase/functions/submit-feedback/index.ts` |
| Menu scanner edge function | `supabase/functions/parse-menu/index.ts` |
| AI plan edge function | `supabase/functions/generate-plan/index.ts` |

---

## 8. Things this doc does NOT cover

- **Anthropic API abuse.** If your `ANTHROPIC_API_KEY` leaks (e.g., committed to git), you'll get a real bill before you notice. Mitigations: rotate keys regularly, use Anthropic's per-key spend limits, never reference `ANTHROPIC_API_KEY` outside the edge functions (the client uses `supabase.functions.invoke`, never direct Anthropic). Currently we follow this rule.
- **JWT secret leakage.** Don't share the project URL + service-role key with anyone. The `service_role` (or `sb_secret_...`) key bypasses RLS entirely.
- **Database backups.** Free-tier Supabase has limited PITR. Decide your tolerance and upgrade or self-backup if needed.
- **Client-side input validation.** RLS protects you at the DB level, but malicious users can craft payloads to e.g. set their `username` to 10 MB of garbage. Add zod validation at every Supabase write call as a defence-in-depth layer when you're hardening for production.
- **DDoS / general edge-function abuse.** Supabase has platform-level protections; for serious traffic, put Cloudflare in front of your project.
