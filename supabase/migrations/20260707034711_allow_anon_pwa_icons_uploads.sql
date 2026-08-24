-- Allow anon uploads to pwa-icons bucket (public PWA icons, not sensitive data)
CREATE POLICY "anon_upload_pwa_icons"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'pwa-icons');

-- Allow anon update/delete too (so icons can be replaced)
CREATE POLICY "anon_update_pwa_icons"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'pwa-icons')
  WITH CHECK (bucket_id = 'pwa-icons');

CREATE POLICY "anon_delete_pwa_icons"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'pwa-icons');
