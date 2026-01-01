-- Add user_id column to establishments table
-- NULL = global establishment (Wetherspoons), non-null = user-specific
ALTER TABLE public.establishments 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to establishment_drinks table
ALTER TABLE public.establishment_drinks 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries on user_id
CREATE INDEX idx_establishments_user_id ON public.establishments(user_id);
CREATE INDEX idx_establishment_drinks_user_id ON public.establishment_drinks(user_id);

-- Drop existing RLS policies on establishments
DROP POLICY IF EXISTS "Anyone can read establishments" ON public.establishments;

-- Create new RLS policies for establishments
-- Allow anyone to read global establishments (user_id IS NULL) or their own
CREATE POLICY "Users can read global and own establishments" 
ON public.establishments 
FOR SELECT 
USING (user_id IS NULL OR auth.uid() = user_id);

-- Allow authenticated users to insert their own establishments
CREATE POLICY "Users can insert their own establishments" 
ON public.establishments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own establishments
CREATE POLICY "Users can update their own establishments" 
ON public.establishments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own establishments
CREATE POLICY "Users can delete their own establishments" 
ON public.establishments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing RLS policies on establishment_drinks
DROP POLICY IF EXISTS "Anyone can read establishment drinks" ON public.establishment_drinks;

-- Create new RLS policies for establishment_drinks
-- Allow anyone to read global drinks (user_id IS NULL) or their own
CREATE POLICY "Users can read global and own establishment drinks" 
ON public.establishment_drinks 
FOR SELECT 
USING (user_id IS NULL OR auth.uid() = user_id);

-- Allow authenticated users to insert their own establishment drinks
CREATE POLICY "Users can insert their own establishment drinks" 
ON public.establishment_drinks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own establishment drinks
CREATE POLICY "Users can update their own establishment drinks" 
ON public.establishment_drinks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own establishment drinks
CREATE POLICY "Users can delete their own establishment drinks" 
ON public.establishment_drinks 
FOR DELETE 
USING (auth.uid() = user_id);