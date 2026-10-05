ALTER TABLE public.seller_identity ADD COLUMN IF NOT EXISTS student_id_image_path text;

DROP POLICY IF EXISTS "Seller media readable by everyone" ON storage.objects;
CREATE POLICY "Seller media readable by everyone" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'seller-media' AND name NOT LIKE '%/student-id-%');

DROP POLICY IF EXISTS "Seller media readable by signed-in users" ON storage.objects;
CREATE POLICY "Seller media readable by signed-in users" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'seller-media' AND (name NOT LIKE '%/student-id-%' OR (storage.foldername(name))[1] = auth.uid()::text));