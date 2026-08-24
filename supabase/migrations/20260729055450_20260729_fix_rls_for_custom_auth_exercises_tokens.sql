/*
# Fix RLS policies for exercises and tokens_activacion

## Problem
The app uses custom auth (not Supabase Auth), so `auth.uid()` always returns NULL
for the frontend Supabase client. The `exercises` table had `TO authenticated`
policies with `auth.uid() = fisio_id`, which blocked ALL operations since no
Supabase auth session exists. Same issue with `tokens_activacion` INSERT/UPDATE/DELETE.

## Changes
1. `exercises` table: Drop existing `TO authenticated` policies and recreate as
   `TO anon, authenticated` with permissive `true` checks (matching the app's
   custom-auth pattern used by all other tables).
2. `tokens_activacion` table: Drop existing `TO authenticated` INSERT/UPDATE/DELETE
   policies and recreate as `TO anon, authenticated`.

## Security Notes
- The app authenticates via a custom `profiles` table with password_hash, NOT via
  Supabase Auth. The frontend Supabase client always runs as `anon` role.
- All other tables in this project already use `TO anon, authenticated` with `true`.
- Row-level filtering is handled in application code based on the logged-in user's ID.
*/

-- ═══════════════════════════════════════
-- exercises: fix RLS for custom auth
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "select_exercises" ON exercises;
DROP POLICY IF EXISTS "insert_exercises" ON exercises;
DROP POLICY IF EXISTS "update_exercises" ON exercises;
DROP POLICY IF EXISTS "delete_exercises" ON exercises;

CREATE POLICY "select_exercises" ON exercises FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_exercises" ON exercises FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_exercises" ON exercises FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_exercises" ON exercises FOR DELETE
  TO anon, authenticated USING (true);

-- ═══════════════════════════════════════
-- tokens_activacion: fix RLS for custom auth
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "auth_insert_tokens" ON tokens_activacion;
DROP POLICY IF EXISTS "auth_update_tokens" ON tokens_activacion;
DROP POLICY IF EXISTS "auth_delete_tokens" ON tokens_activacion;

CREATE POLICY "auth_insert_tokens" ON tokens_activacion FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "auth_update_tokens" ON tokens_activacion FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_tokens" ON tokens_activacion FOR DELETE
  TO anon, authenticated USING (true);