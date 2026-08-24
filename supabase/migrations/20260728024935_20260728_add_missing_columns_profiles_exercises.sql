/*
# Add missing columns to profiles and exercises tables

## Summary
Adds columns that the frontend expects but that don't exist in the database yet,
causing runtime errors when saving fisioterapeuta profiles and displaying exercises.

## Changes

### 1. profiles table
- Add `certificaciones` (text[]) — stores list of additional certifications for fisioterapeutas
- Add `avatar_url` (text) — stores URL to the fisioterapeuta's profile avatar image

### 2. exercises table
- Add `grupo_muscular` (text) — stores the muscle group category for filtering exercises

## Security
- No RLS policy changes. Existing RLS policies remain intact.
- All new columns are nullable so existing rows are unaffected.
*/

-- Add missing columns to profiles (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'certificaciones'
  ) THEN
    ALTER TABLE profiles ADD COLUMN certificaciones text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Add missing column to exercises (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'grupo_muscular'
  ) THEN
    ALTER TABLE exercises ADD COLUMN grupo_muscular text;
  END IF;
END $$;
