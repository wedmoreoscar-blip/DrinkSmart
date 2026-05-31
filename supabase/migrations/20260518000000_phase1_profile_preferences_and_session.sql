-- Phase 1 schema additions
-- 1. Extend `profiles` with preferences (jsonb), theme, onboarded_at
-- 2. Create `user_sessions` table for the "use last night" feature

-- ============================================================================
-- Extend profiles
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system'
  CHECK (theme IN ('light', 'dark', 'system'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- ============================================================================
-- user_sessions: stores the last accepted plan for "use last night"
-- One row per user; upsert pattern.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  buzz_level integer NOT NULL CHECK (buzz_level >= 1 AND buzz_level <= 10),
  drinks jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own session"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own session"
  ON public.user_sessions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own session"
  ON public.user_sessions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- Indexes on user_id columns referenced in policies. user_sessions.user_id is
-- already the primary key (so the PK index covers it). Add explicit indexes on
-- the other tables that the policies in earlier migrations reference. Foreign
-- key columns are NOT automatically indexed in Postgres.
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS saved_custom_drinks_user_id_idx ON public.saved_custom_drinks(user_id);
CREATE INDEX IF NOT EXISTS establishment_drinks_user_id_idx ON public.establishment_drinks(user_id);
CREATE INDEX IF NOT EXISTS establishments_user_id_idx ON public.establishments(user_id);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.handle_user_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_sessions_updated_at();
