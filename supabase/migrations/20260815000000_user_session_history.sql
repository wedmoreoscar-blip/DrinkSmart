-- W5-7: immutable, account-owned session history.
-- The legacy one-row user_sessions table is intentionally untouched:
-- it is not widened, renamed, seeded from, or dropped here.

CREATE TABLE IF NOT EXISTS public.user_session_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  buzz_level integer NOT NULL CHECK (buzz_level >= 1 AND buzz_level <= 7),
  drinks jsonb NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_session_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session history"
  ON public.user_session_history FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own session history"
  ON public.user_session_history FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Snapshots are immutable: deliberately no update policy.

CREATE POLICY "Users can delete their own session history"
  ON public.user_session_history FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Newest-first reads by user; UUID breaks completion-time ties.
CREATE INDEX IF NOT EXISTS user_session_history_user_completed_idx
  ON public.user_session_history (user_id, completed_at DESC, id DESC);

-- After every insert, keep only that user's newest 30 snapshots, ordered by
-- completed_at DESC with the UUID as the stable tie-break.
CREATE OR REPLACE FUNCTION public.prune_user_session_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_session_history
  WHERE user_id = NEW.user_id
    AND id IN (
      SELECT id
      FROM public.user_session_history
      WHERE user_id = NEW.user_id
      ORDER BY completed_at DESC, id DESC
      OFFSET 30
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_session_history_prune_trigger
  AFTER INSERT ON public.user_session_history
  FOR EACH ROW
  EXECUTE FUNCTION public.prune_user_session_history();
