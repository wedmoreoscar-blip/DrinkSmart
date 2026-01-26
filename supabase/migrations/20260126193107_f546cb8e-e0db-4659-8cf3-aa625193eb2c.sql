-- Drop the existing permissive upload policy
DROP POLICY IF EXISTS "Anyone can upload feedback images" ON storage.objects;

-- Create a new policy that validates file extensions (images only)
CREATE POLICY "Anyone can upload feedback images with validation"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'feedback-images' AND 
  (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'webp'))
);