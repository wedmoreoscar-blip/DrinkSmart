-- Phase 1.1: Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Phase 1.2: Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Phase 1.3: Create feedback table
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Phase 1.4: RLS Policies for feedback table
CREATE POLICY "Anyone can insert feedback"
ON public.feedback FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can read all feedback"
ON public.feedback FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update feedback"
ON public.feedback FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete feedback"
ON public.feedback FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 1.5: RLS Policies for user_roles table
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 1.6: Create feedback-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-images', 'feedback-images', true);

CREATE POLICY "Anyone can upload feedback images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'feedback-images');

CREATE POLICY "Anyone can view feedback images"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-images');

CREATE POLICY "Admins can delete feedback images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'feedback-images' AND public.has_role(auth.uid(), 'admin'));