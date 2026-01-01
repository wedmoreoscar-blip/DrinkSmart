-- Add user metrics columns to profiles table for persistent storage
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS height_cm numeric,
ADD COLUMN IF NOT EXISTS height_ft numeric,
ADD COLUMN IF NOT EXISTS height_in numeric,
ADD COLUMN IF NOT EXISTS height_unit text DEFAULT 'cm',
ADD COLUMN IF NOT EXISTS weight numeric,
ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS body_fat numeric,
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS sex text,
ADD COLUMN IF NOT EXISTS metric_type text DEFAULT 'bmi';

-- Add constraints for valid values
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_height_unit CHECK (height_unit IN ('cm', 'ft')),
ADD CONSTRAINT valid_weight_unit CHECK (weight_unit IN ('kg', 'lbs')),
ADD CONSTRAINT valid_sex CHECK (sex IS NULL OR sex IN ('male', 'female')),
ADD CONSTRAINT valid_metric_type CHECK (metric_type IN ('bmi', 'ffmi'));