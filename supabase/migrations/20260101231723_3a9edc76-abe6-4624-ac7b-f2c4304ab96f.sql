-- Add price, volume, and volume_unit columns to establishment_drinks table
ALTER TABLE public.establishment_drinks 
ADD COLUMN price numeric NULL,
ADD COLUMN volume numeric NULL,
ADD COLUMN volume_unit text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.establishment_drinks.price IS 'Price of the drink in local currency (extracted from menu)';
COMMENT ON COLUMN public.establishment_drinks.volume IS 'Volume/size of the drink';
COMMENT ON COLUMN public.establishment_drinks.volume_unit IS 'Unit of volume (ml, oz, pint, shot, glass, etc.)';