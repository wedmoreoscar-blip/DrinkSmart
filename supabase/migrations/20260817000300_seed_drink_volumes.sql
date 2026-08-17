-- Workstream A: backfill volumes on the seeded Wetherspoons rows. Volumes only.
--
-- **Prices are deliberately left null.** Researched 2026-08-17: no authoritative
-- current national price list exists. Wetherspoon's own current prices live in
-- their app, per pub, and the aggregator sites that claim per-drink figures
-- quote £6.80 for a 25 ml gin — a figure that fails a sanity check for the
-- chain and reads as spirit-with-mixer. Filling 237 rows from that would create
-- numbers that look sourced, cannot be defended, and are indistinguishable from
-- real prices a year from now. Under price-per-base-unit a null price is not a
-- gap: price is optional everywhere, and users price the few drinks they buy
-- against the menu actually in front of them, which is more accurate than any
-- national list and dated by definition.
--
-- Volumes are the opposite: objective, stable, and the thing that actually
-- breaks without them. A null volume is what produced the 330 ml cocktail — the
-- fallback table guessing a bottle where a glass was meant.
--
-- Every value below is derived, not estimated. The basis is stated per category.

-- Bottled beer states its own size in the drink name — "Corona (330ml)",
-- "Beck's (275ml)". Parsed rather than assumed, so a 275 ml row stays 275.
UPDATE public.establishment_drinks
SET volume = (regexp_match(drink_name, '\((\d+)ml\)'))[1]::numeric,
    volume_unit = 'ml'
WHERE establishment_id = (SELECT id FROM public.establishments WHERE name = 'Wetherspoons')
  AND category = 'beer_bottle'
  AND drink_name ~ '\(\d+ml\)'
  AND volume IS NULL;

-- Draught beer and cider: the category label is "(Pint)". An imperial pint is
-- 568 ml by definition.
UPDATE public.establishment_drinks
SET volume = 568, volume_unit = 'ml'
WHERE establishment_id = (SELECT id FROM public.establishments WHERE name = 'Wetherspoons')
  AND category IN ('beer_pint', 'cider_pint')
  AND volume IS NULL;

-- Wine: the category label is literally "Wine (175ml Glass)".
UPDATE public.establishment_drinks
SET volume = 175, volume_unit = 'ml'
WHERE establishment_id = (SELECT id FROM public.establishments WHERE name = 'Wetherspoons')
  AND category = 'wine'
  AND volume IS NULL;

-- Spirits and shots: the UK single measure is 25 ml, fixed by the Weights and
-- Measures Act. This is also the "Single" rung the picker offers, so a seeded
-- row and a tapped rung agree.
UPDATE public.establishment_drinks
SET volume = 25, volume_unit = 'ml'
WHERE establishment_id = (SELECT id FROM public.establishments WHERE name = 'Wetherspoons')
  AND category IN ('gin', 'vodka', 'rum', 'whisky', 'tequila', 'brandy', 'shots')
  AND volume IS NULL;

-- Cocktails: 250 ml, per the locked decision "A cocktail is 250 ml, and a drink
-- without a ladder has one serving". Not researched — settled.
UPDATE public.establishment_drinks
SET volume = 250, volume_unit = 'ml'
WHERE establishment_id = (SELECT id FROM public.establishments WHERE name = 'Wetherspoons')
  AND category = 'cocktails'
  AND volume IS NULL;

-- Alcopops/RTD: the seeded rows are WKD and Smirnoff Ice, both 275 ml bottles.
UPDATE public.establishment_drinks
SET volume = 275, volume_unit = 'ml'
WHERE establishment_id = (SELECT id FROM public.establishments WHERE name = 'Wetherspoons')
  AND category = 'alcopops'
  AND volume IS NULL;

-- Liqueurs: the one judgement call, and it is named rather than buried.
--
-- 25 ml, matching the spirit measure and the picker's Single rung. UK measures
-- law fixes gin, rum, vodka and whisky at 25 or 35 ml but does not cover
-- liqueurs, and cream liqueurs in particular are often poured at 50 ml. Both
-- are defensible; 25 ml is chosen because it agrees with the ladder the picker
-- offers for these rows, so the seed and the rungs cannot disagree.
--
-- A user who is served 50 ml overrides it, and that override is now a rung.
UPDATE public.establishment_drinks
SET volume = 25, volume_unit = 'ml'
WHERE establishment_id = (SELECT id FROM public.establishments WHERE name = 'Wetherspoons')
  AND category = 'liqueur'
  AND volume IS NULL;
