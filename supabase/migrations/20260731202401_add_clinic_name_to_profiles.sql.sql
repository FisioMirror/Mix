-- Add clinic_name column to profiles table for inline clinic name editing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clinic_name TEXT;

-- Allow therapists to update their own clinic name
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own clinic_name" ON profiles;
CREATE POLICY "Users can update own clinic_name"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);