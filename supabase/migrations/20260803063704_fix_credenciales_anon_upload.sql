-- Allow anon to upload credentials during registration (before auth session exists)
-- The bucket is already public for reads, so we only need INSERT for anon
CREATE POLICY "anon_upload_credenciales"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'credenciales_profesionales');

-- Allow anon to update credentials (for re-upload during registration)
CREATE POLICY "anon_update_credenciales"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'credenciales_profesionales')
  WITH CHECK (bucket_id = 'credenciales_profesionales');

-- Allow anon to delete credentials (for cleanup if registration fails)
CREATE POLICY "anon_delete_credenciales"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'credenciales_profesionales');