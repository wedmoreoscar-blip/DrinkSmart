-- The night's money range, carried by `use last night` alongside duration and
-- buzz level. Both columns are nullable and additive:
--   * rows written before this migration keep NULL and restore as the wide
--     default, which is what those nights effectively had;
--   * budget_max is NULL whenever the user set no upper limit, which is also
--     the fresh-session default.
--
-- No RLS changes: the existing per-user policies on the table already cover
-- these columns, and snapshots stay insert-only.

ALTER TABLE public.user_session_history
  ADD COLUMN IF NOT EXISTS budget_min integer,
  ADD COLUMN IF NOT EXISTS budget_max integer;

ALTER TABLE public.user_session_history
  DROP CONSTRAINT IF EXISTS user_session_history_budget_min_non_negative;
ALTER TABLE public.user_session_history
  ADD CONSTRAINT user_session_history_budget_min_non_negative
  CHECK (budget_min IS NULL OR budget_min >= 0);

ALTER TABLE public.user_session_history
  DROP CONSTRAINT IF EXISTS user_session_history_budget_max_non_negative;
ALTER TABLE public.user_session_history
  ADD CONSTRAINT user_session_history_budget_max_non_negative
  CHECK (budget_max IS NULL OR budget_max >= 0);

-- An upper limit below the floor is not a range. NULLs pass: either bound may
-- be absent independently.
ALTER TABLE public.user_session_history
  DROP CONSTRAINT IF EXISTS user_session_history_budget_range_ordered;
ALTER TABLE public.user_session_history
  ADD CONSTRAINT user_session_history_budget_range_ordered
  CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min);
