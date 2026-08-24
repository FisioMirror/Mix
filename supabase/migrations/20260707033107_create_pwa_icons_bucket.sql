-- Plan E: Supabase Storage bucket for PWA icons
-- Public read access so the browser can fetch icons without auth

INSERT INTO storage.buckets (id, name, public)
VALUES ('pwa-icons', 'pwa-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the pwa-icons bucket
CREATE POLICY "public_read_pwa_icons"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'pwa-icons');

-- Allow authenticated users to upload icons
CREATE POLICY "auth_upload_pwa_icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pwa-icons');

-- Allow authenticated users to update icons
CREATE POLICY "auth_update_pwa_icons"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pwa-icons')
  WITH CHECK (bucket_id = 'pwa-icons');

-- Allow authenticated users to delete icons
CREATE POLICY "auth_delete_pwa_icons"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pwa-icons');
