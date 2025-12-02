-- Create saved_custom_drinks table for user's saved custom drinks
CREATE TABLE public.saved_custom_drinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  drink_name TEXT NOT NULL,
  abv NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_custom_drinks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own saved drinks"
ON public.saved_custom_drinks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved drinks"
ON public.saved_custom_drinks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved drinks"
ON public.saved_custom_drinks
FOR DELETE
USING (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate drink names per user
CREATE UNIQUE INDEX idx_saved_custom_drinks_user_name ON public.saved_custom_drinks(user_id, drink_name);