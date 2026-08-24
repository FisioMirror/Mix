/*
# Add missing columns to profiles and exercises for frontend compatibility

## Summary
The frontend queries columns that don't exist on the `profiles` and `exercises` tables,
causing Supabase errors at runtime. This migration adds those columns so existing
frontend code works without errors.

## Changes

### 1. profiles table
- Add `fecha_nacimiento` (date, nullable) — patient birth date, shown in patient directory
- Add `diagnostico` (text, nullable) — patient diagnosis, shown in patient directory and profile

### 2. exercises table
- Add `articulacion` (text, nullable) — joint targeted by the exercise (hombro, codo, rodilla, etc.)
- Add `lado` (text, nullable) — side of the body (izquierdo, derecho, ambos)
- Add `series` (integer, nullable) — number of sets (alongside existing `series_default`)
- Add `repeticiones` (integer, nullable) — reps per set (alongside existing `repeticiones_default`)

## Security
- No RLS policy changes. All new columns are nullable so existing rows are unaffected.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'fecha_nacimiento'
  ) THEN
    ALTER TABLE profiles ADD COLUMN fecha_nacimiento date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'diagnostico'
  ) THEN
    ALTER TABLE profiles ADD COLUMN diagnostico text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'articulacion'
  ) THEN
    ALTER TABLE exercises ADD COLUMN articulacion text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'lado'
  ) THEN
    ALTER TABLE exercises ADD COLUMN lado text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'series'
  ) THEN
    ALTER TABLE exercises ADD COLUMN series integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'repeticiones'
  ) THEN
    ALTER TABLE exercises ADD COLUMN repeticiones integer;
  END IF;
END $$;
