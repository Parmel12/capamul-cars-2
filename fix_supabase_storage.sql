-- ============================================================
-- CAPAMUL CARS 2.0 - Supabase Storage Bucket Setup Script
-- ============================================================
-- Run this script in your Supabase Dashboard -> SQL Editor to
-- create the public 'car-images' storage bucket for vehicle uploads.
-- ============================================================

-- 1. Create the 'car-images' bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-images', 'car-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop any previous policies to prevent conflicts
DROP POLICY IF EXISTS "Public Access car-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload car-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update car-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete car-images" ON storage.objects;

-- 3. Allow anyone (anon + authenticated) to read files from car-images bucket
CREATE POLICY "Public Access car-images" ON storage.objects
FOR SELECT USING (bucket_id = 'car-images');

-- 4. Allow admin / website to upload photos into car-images bucket
CREATE POLICY "Public Upload car-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'car-images');

-- 5. Allow updating photos in car-images bucket
CREATE POLICY "Public Update car-images" ON storage.objects
FOR UPDATE USING (bucket_id = 'car-images');

-- 6. Allow deleting photos from car-images bucket
CREATE POLICY "Public Delete car-images" ON storage.objects
FOR DELETE USING (bucket_id = 'car-images');

-- Confirm bucket setup complete
SELECT 'Storage bucket car-images created and public policies applied successfully!' AS status;
