-- Account-owned saved custom drinks become reusable presets: a saved drink
-- now carries the serve it was saved with, so selecting it prefills the whole
-- custom-drink sheet. Legacy rows keep NULL serving_ml (readable, prefills
-- name and ABV only); new and updated rows must carry a positive serve no
-- larger than the sheet's own upper bound.

ALTER TABLE public.saved_custom_drinks
  ADD COLUMN serving_ml numeric;

ALTER TABLE public.saved_custom_drinks
  ADD CONSTRAINT saved_custom_drinks_serving_ml_check
  CHECK (serving_ml IS NULL OR (serving_ml > 0 AND serving_ml <= 5000));

-- The account owner may update their own saved drinks (the client persists
-- edits through an upsert on (user_id, drink_name)). Existing SELECT/INSERT/
-- DELETE policies and the unique (user_id, drink_name) index are unchanged.
CREATE POLICY "Users can update their own saved drinks"
ON public.saved_custom_drinks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
