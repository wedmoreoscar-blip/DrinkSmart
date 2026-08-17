-- Price is per base unit, never a total.
--
-- The previous model stored one price per drink on user_drink_overrides and
-- divided it by a volume derived from a *mutable* field: remembering a serve
-- redefined the unit every stored price was quoted in, so a price typed against
-- a 250 ml serve read back as a tenth of itself once that serve was remembered.
--
-- Here a price belongs to a volume. One drink may carry several — a half pint
-- and a pint are two prices, not one scaled, which is how a venue's real
-- pricing actually works. A volume with a price *is* a base unit, so a user who
-- prices a 330 ml cocktail or an odd 60 ml pour has created a rung rather than
-- a special case.
--
-- See the `price-per-base-unit` spec.

CREATE TABLE IF NOT EXISTS public.user_drink_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  establishment_drink_id uuid NOT NULL
    REFERENCES public.establishment_drinks(id) ON DELETE CASCADE,
  -- The volume this price is the price of. NOT NULL: a price with no volume is
  -- exactly the ambiguity this table exists to remove.
  serving_ml numeric(10, 2) NOT NULL CHECK (serving_ml > 0),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One price per volume per drink per user. A second price for the same
  -- volume would reintroduce the ambiguity.
  CONSTRAINT user_drink_prices_one_per_volume
    UNIQUE (user_id, establishment_drink_id, serving_ml)
);

-- RLS is auto-enabled by the event trigger (20260518000001), but state it
-- explicitly: this table is private to its owner and the guarantee should be
-- readable in the migration that creates it.
ALTER TABLE public.user_drink_prices ENABLE ROW LEVEL SECURITY;

-- (select auth.uid()) per the locked pattern: Postgres caches the result per
-- statement instead of evaluating it per row.
CREATE POLICY "Users can view their own drink prices"
  ON public.user_drink_prices FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own drink prices"
  ON public.user_drink_prices FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own drink prices"
  ON public.user_drink_prices FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own drink prices"
  ON public.user_drink_prices FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Foreign keys are not auto-indexed in Postgres, and every policy above filters
-- on user_id. The unique constraint already covers
-- (user_id, establishment_drink_id, serving_ml).
CREATE INDEX IF NOT EXISTS user_drink_prices_user_id_idx
  ON public.user_drink_prices (user_id);

CREATE OR REPLACE FUNCTION public.handle_user_drink_prices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_drink_prices_updated_at ON public.user_drink_prices;
CREATE TRIGGER user_drink_prices_updated_at
  BEFORE UPDATE ON public.user_drink_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_drink_prices_updated_at();

-- Drop the old prices rather than migrate them.
--
-- Their unit was the very quantity this design abolishes, so reinterpreting one
-- means guessing which volume it was typed against. Every seeded catalogue
-- price is still null, so the only rows affected are hand-entered test data —
-- confirmed disposable. A guess carried into the new model would be
-- indistinguishable from a real price forever after.
UPDATE public.user_drink_overrides SET price = NULL WHERE price IS NOT NULL;

-- The column itself stays for now: the client still reads it until the read
-- path moves onto this table, and dropping it first would break a deployed
-- build. A follow-up migration drops it once nothing selects it.
COMMENT ON COLUMN public.user_drink_overrides.price IS
  'Deprecated and always null. Prices live in user_drink_prices, keyed by the volume they price. Dropped once the client no longer selects it.';

-- serving_ml on user_drink_overrides keeps its meaning: the user's remembered
-- serve for a drink. A remembered serve and a price are different facts about
-- different things — one per drink, many per drink — and sharing a row is what
-- let one silently redefine the other.
COMMENT ON COLUMN public.user_drink_overrides.serving_ml IS
  'The user''s remembered serve for this drink: which volume the row opens on. Not a price unit.';
