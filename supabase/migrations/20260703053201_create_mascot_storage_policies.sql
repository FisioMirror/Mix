-- Plan E: Supabase Storage bucket policies for mascot-animations
-- Public read access so the app can fetch animation files without auth
CREATE POLICY "public_read_mascot_animations"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'mascot-animations');

CREATE POLICY "authenticated_write_mascot_animations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'mascot-animations');

CREATE POLICY "authenticated_update_mascot_animations"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'mascot-animations')
  WITH CHECK (bucket_id = 'mascot-animations');

CREATE POLICY "authenticated_delete_mascot_animations"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'mascot-animations');
