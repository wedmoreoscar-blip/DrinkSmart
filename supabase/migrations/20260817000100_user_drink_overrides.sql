-- What a user remembers about a drink at a venue: their price for it, and the
-- serve they actually have.
--
-- One record, not two, and not a duplicate catalogue row. A remembered serve is
-- a preference *about* a drink, not another drink: cloning the whole
-- establishment_drinks row to carry one number would mean every read path had
-- to collapse the clone again, and the picker would show the same drink twice.
-- Both columns are nullable because a user may set either independently.

CREATE TABLE IF NOT EXISTS public.user_drink_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  establishment_drink_id uuid NOT NULL
    REFERENCES public.establishment_drinks(id) ON DELETE CASCADE,
  price numeric(10, 2) CHECK (price IS NULL OR price >= 0),
  serving_ml numeric(10, 2) CHECK (serving_ml IS NULL OR serving_ml > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_drink_overrides_one_per_drink UNIQUE (user_id, establishment_drink_id)
);

-- RLS is auto-enabled by the event trigger (20260518000001), but state it
-- explicitly: this table is private to its owner and the guarantee should be
-- readable in the migration that creates it.
ALTER TABLE public.user_drink_overrides ENABLE ROW LEVEL SECURITY;

-- (select auth.uid()) per the locked pattern: Postgres caches the result per
-- statement instead of evaluating it per row.
CREATE POLICY "Users can view their own drink overrides"
  ON public.user_drink_overrides FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own drink overrides"
  ON public.user_drink_overrides FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own drink overrides"
  ON public.user_drink_overrides FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own drink overrides"
  ON public.user_drink_overrides FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Foreign keys are not auto-indexed in Postgres, and every policy above filters
-- on user_id. The unique constraint already covers (user_id, establishment_drink_id).
CREATE INDEX IF NOT EXISTS user_drink_overrides_user_id_idx
  ON public.user_drink_overrides (user_id);

CREATE OR REPLACE FUNCTION public.handle_user_drink_overrides_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_drink_overrides_updated_at ON public.user_drink_overrides;
CREATE TRIGGER user_drink_overrides_updated_at
  BEFORE UPDATE ON public.user_drink_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_drink_overrides_updated_at();

-- Bring establishment_drinks' policies onto the locked (select auth.uid())
-- pattern while this work touches the table. Same semantics, per-statement
-- evaluation instead of per-row; the original predates the rule.
DROP POLICY IF EXISTS "Users can read global and own establishment drinks" ON public.establishment_drinks;
CREATE POLICY "Users can read global and own establishment drinks"
  ON public.establishment_drinks FOR SELECT
  USING (user_id IS NULL OR (select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own establishment drinks" ON public.establishment_drinks;
CREATE POLICY "Users can insert their own establishment drinks"
  ON public.establishment_drinks FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own establishment drinks" ON public.establishment_drinks;
CREATE POLICY "Users can update their own establishment drinks"
  ON public.establishment_drinks FOR UPDATE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own establishment drinks" ON public.establishment_drinks;
CREATE POLICY "Users can delete their own establishment drinks"
  ON public.establishment_drinks FOR DELETE
  USING ((select auth.uid()) = user_id);
