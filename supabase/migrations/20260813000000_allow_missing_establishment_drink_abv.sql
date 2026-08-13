-- Menu scans may legitimately leave strength unread. Preserve that distinction:
-- NULL means missing and contributes zero until corrected; 0 remains a real 0% drink.
ALTER TABLE public.establishment_drinks
ALTER COLUMN abv DROP NOT NULL;
