-- A saved custom drink now carries the price it was saved at as well as its
-- serve, so reselecting a preset restores the whole sheet instead of dropping
-- what the drink cost. Legacy rows keep NULL price (readable, prefilling name,
-- ABV and serve only), and the client reads a missing or NULL price as null.
--
-- No policy is added: the SELECT/INSERT/DELETE policies from the original
-- migration and the UPDATE policy from 20260815000001 already cover this table,
-- and adding a column does not change who may touch a row. Any policy written
-- here would have to wrap auth.uid() as (select auth.uid()) per the locked RLS
-- pattern; 20260815000001 does not, but that predates this change and is left
-- alone rather than copied.

ALTER TABLE public.saved_custom_drinks
  ADD COLUMN price numeric;

ALTER TABLE public.saved_custom_drinks
  ADD CONSTRAINT saved_custom_drinks_price_check
  CHECK (price IS NULL OR (price >= 0 AND price <= 1000));
