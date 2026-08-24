/*
# Create avatars storage bucket with RLS policies

1. Storage
- Create a new public bucket 'avatars' to store user profile photos.
- Public read access so avatar images render for everyone (patients and
  physiotherapists) without an authenticated session, which is required for
  the avatar to display in lists, cards and profile screens.
- Writes (insert / update / delete) are restricted to the authenticated OWNER
  of the file. Ownership is enforced by comparing the first path segment
  (the folder name) with the authenticated user's id, so a user can only
  touch files stored under `{user_id}/...`. This matches the upload path used
  by the frontend: `${user.id}/avatar.jpg`.

2. Security
- Enable RLS on storage.objects is already enabled at the schema level.
- SELECT policy: public (anon + authenticated) can read any object in the
  'avatars' bucket. Avatars are intentionally public so they display
  regardless of session state.
- INSERT policy: authenticated users can upload only into a path whose first
  folder equals their own user id: `{auth.uid()}/...`.
- UPDATE policy: authenticated users can overwrite only their own file.
- DELETE policy: authenticated users can delete only their own file.

3. Important notes
- The bucket is idempotent: created only if it does not already exist.
- Policies are dropped before (re)creation so this migration is safe to re-run.
- No purple/violet colors involved (storage-only change).
*/

-- 1. Create the bucket (public so avatars render without auth)
INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- 2. SELECT — public read (avatars must render for everyone)
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

-- 3. INSERT — authenticated owner only, path must start with own user id
DROP POLICY IF EXISTS "auth_upload_avatars" ON storage.objects;
CREATE POLICY "auth_upload_avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. UPDATE — authenticated owner only
DROP POLICY IF EXISTS "auth_update_avatars" ON storage.objects;
CREATE POLICY "auth_update_avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. DELETE — authenticated owner only
DROP POLICY IF EXISTS "auth_delete_avatars" ON storage.objects;
CREATE POLICY "auth_delete_avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
