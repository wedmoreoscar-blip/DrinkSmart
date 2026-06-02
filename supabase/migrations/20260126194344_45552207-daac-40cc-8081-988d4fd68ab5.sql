-- Add admin read policies to user data tables

-- Profiles: Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- (removed: admin policy on public.user_drinks — the table was a Lovable-managed
-- artifact that no migration in this repo creates, and the refactor replaced it
-- with localStorage-backed session state. If a future migration introduces a
-- real user_drinks table, add the admin SELECT policy there.)

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