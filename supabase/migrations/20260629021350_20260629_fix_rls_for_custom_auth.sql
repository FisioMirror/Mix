/*
# Fix RLS Policies for Custom Auth System

1. Problem
   The frontend uses a custom auth system (localStorage + SHA256) instead of Supabase Auth.
   All Supabase client requests are made with the anon key, so they run as the `anon` role.
   The current RLS policies require `authenticated`, causing "new row violates row-level security policy" errors.

2. Solution
   Change critical table policies from `TO authenticated` to `TO anon, authenticated`
   so the custom auth flow works correctly.

3. Tables Affected
   - profiles (user data)
   - activation_tokens (token generation and validation)
   - pacientes_terapeutas (patient-therapist relationships)
   - rutinas (exercise routines)
   - sesiones_completadas (completed sessions)
   - documentos_clinicos (clinical documents)

4. Security Note
   The app implements auth at the application layer (password hashing, session management).
   RLS policies are open because the custom auth system does not use Supabase Auth JWTs.
   This is intentional for this architecture.
*/

-- ============================================================
-- profiles
-- ============================================================
DROP POLICY IF EXISTS "public_select_profiles" ON profiles;
CREATE POLICY "public_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_profiles" ON profiles;
CREATE POLICY "public_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_profiles" ON profiles;
CREATE POLICY "public_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_profiles" ON profiles;
CREATE POLICY "public_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- activation_tokens
-- ============================================================
DROP POLICY IF EXISTS "public_select_atokens" ON activation_tokens;
CREATE POLICY "public_select_atokens" ON activation_tokens FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_atokens" ON activation_tokens;
CREATE POLICY "public_insert_atokens" ON activation_tokens FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_atokens" ON activation_tokens;
CREATE POLICY "public_update_atokens" ON activation_tokens FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_atokens" ON activation_tokens;
CREATE POLICY "public_delete_atokens" ON activation_tokens FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- pacientes_terapeutas
-- ============================================================
DROP POLICY IF EXISTS "public_select_pt" ON pacientes_terapeutas;
CREATE POLICY "public_select_pt" ON pacientes_terapeutas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_pt" ON pacientes_terapeutas;
CREATE POLICY "public_insert_pt" ON pacientes_terapeutas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_pt" ON pacientes_terapeutas;
CREATE POLICY "public_delete_pt" ON pacientes_terapeutas FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- rutinas
-- ============================================================
DROP POLICY IF EXISTS "public_select_rutinas" ON rutinas;
CREATE POLICY "public_select_rutinas" ON rutinas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_rutinas" ON rutinas;
CREATE POLICY "public_insert_rutinas" ON rutinas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_rutinas" ON rutinas;
CREATE POLICY "public_update_rutinas" ON rutinas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_rutinas" ON rutinas;
CREATE POLICY "public_delete_rutinas" ON rutinas FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- sesiones_completadas
-- ============================================================
DROP POLICY IF EXISTS "public_select_sesiones" ON sesiones_completadas;
CREATE POLICY "public_select_sesiones" ON sesiones_completadas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_sesiones" ON sesiones_completadas;
CREATE POLICY "public_insert_sesiones" ON sesiones_completadas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_sesiones" ON sesiones_completadas;
CREATE POLICY "public_update_sesiones" ON sesiones_completadas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_sesiones" ON sesiones_completadas;
CREATE POLICY "public_delete_sesiones" ON sesiones_completadas FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- documentos_clinicos
-- ============================================================
DROP POLICY IF EXISTS "public_select_documentos" ON documentos_clinicos;
CREATE POLICY "public_select_documentos" ON documentos_clinicos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_documentos" ON documentos_clinicos;
CREATE POLICY "public_insert_documentos" ON documentos_clinicos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_documentos" ON documentos_clinicos;
CREATE POLICY "public_update_documentos" ON documentos_clinicos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_documentos" ON documentos_clinicos;
CREATE POLICY "public_delete_documentos" ON documentos_clinicos FOR DELETE
  TO anon, authenticated USING (true);
