-- Add admin read policies to user data tables

-- Profiles: Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User drinks: Allow admins to view all user drinks
CREATE POLICY "Admins can view all user drinks"
ON public.user_drinks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Saved custom drinks: Allow admins to view all saved drinks
CREATE POLICY "Admins can view all saved custom drinks"
ON public.saved_custom_drinks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Establishments: Allow admins to view all establishments
CREATE POLICY "Admins can view all establishments"
ON public.establishments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Establishment drinks: Allow admins to view all establishment drinks
CREATE POLICY "Admins can view all establishment drinks"
ON public.establishment_drinks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));