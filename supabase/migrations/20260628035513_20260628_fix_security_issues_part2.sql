/*
# Security Hardening Migration - Part 2

Fixes remaining security issues after resolving pgcrypto namespace issue:

1. Function Search Path Mutable
   - Recreate all functions with SET search_path = public.
   - hash_password already fixed in prior step.

2. RLS Policies Always True
   - Replace USING(true)/WITH CHECK(true) with authenticated-only policies.
   - Keep SELECT policies open where needed for the custom auth flow.

3. Public Bucket Listing
   - Remove broad SELECT policy on storage.objects.

4. SECURITY DEFINER Functions
   - Revoke EXECUTE from anon/authenticated on sensitive functions.
*/

-- ============================================================
-- 1. FIX FUNCTION SEARCH_PATH (hash_password already fixed)
-- ============================================================

CREATE OR REPLACE FUNCTION login_usuario(p_email text, p_password text) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user usuarios%ROWTYPE;
  v_hash text;
BEGIN
  SELECT * INTO v_user FROM usuarios WHERE email = lower(trim(p_email));
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  v_hash := hash_password(p_password);
  IF v_hash IS DISTINCT FROM v_user.password_hash THEN
    RETURN json_build_object('success', false, 'error', 'Contraseña incorrecta');
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user.id,
    'email', v_user.email,
    'nombre', v_user.nombre,
    'rol', v_user.rol
  );
END;
$$;

CREATE OR REPLACE FUNCTION registrar_fisioterapeuta(
  p_email text,
  p_password text,
  p_nombre text,
  p_colegiado_id text,
  p_especialidad_tipo text,
  p_universidad_egreso text,
  p_anio_egreso integer,
  p_certificaciones text[] DEFAULT '{}'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM usuarios WHERE email = lower(trim(p_email));
  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'El email ya está registrado');
  END IF;

  INSERT INTO usuarios (email, password_hash, nombre, rol)
  VALUES (lower(trim(p_email)), hash_password(p_password), p_nombre, 'fisioterapeuta')
  RETURNING id INTO v_new_id;

  INSERT INTO perfiles_simples (id, email, nombre)
  VALUES (v_new_id, lower(trim(p_email)), p_nombre);

  INSERT INTO fisioterapeutas_simple (id, colegiado_id, especialidad_tipo, universidad_egreso, anio_egreso, certificaciones_adicionales)
  VALUES (v_new_id, p_colegiado_id, p_especialidad_tipo, p_universidad_egreso, p_anio_egreso, COALESCE(p_certificaciones, '{}'::text[]));

  RETURN json_build_object(
    'success', true,
    'user_id', v_new_id,
    'email', lower(trim(p_email)),
    'nombre', p_nombre,
    'rol', 'fisioterapeuta'
  );
END;
$$;

CREATE OR REPLACE FUNCTION registrar_paciente(
  p_email text,
  p_password text,
  p_nombre text,
  p_token text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_existing uuid;
  v_token tokens_activacion%ROWTYPE;
BEGIN
  SELECT id INTO v_existing FROM usuarios WHERE email = lower(trim(p_email));
  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'El email ya está registrado');
  END IF;

  SELECT * INTO v_token FROM tokens_activacion WHERE token = upper(trim(p_token));
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token inválido');
  END IF;

  IF v_token.is_used THEN
    RETURN json_build_object('success', false, 'error', 'El token ya fue utilizado');
  END IF;

  IF v_token.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'El token ha expirado');
  END IF;

  INSERT INTO usuarios (email, password_hash, nombre, rol)
  VALUES (lower(trim(p_email)), hash_password(p_password), p_nombre, 'paciente')
  RETURNING id INTO v_new_id;

  INSERT INTO perfiles_simples (id, email, nombre)
  VALUES (v_new_id, lower(trim(p_email)), p_nombre);

  UPDATE tokens_activacion
  SET is_used = true, used_by = v_new_id, used_at = now()
  WHERE id = v_token.id;

  RETURN json_build_object(
    'success', true,
    'user_id', v_new_id,
    'email', lower(trim(p_email)),
    'nombre', p_nombre,
    'rol', 'paciente',
    'fisioterapeuta_id', v_token.fisioterapeuta_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION validar_token(p_token text) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM tokens_activacion
    WHERE token = upper(trim(p_token))
      AND is_used = false
      AND expires_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION crear_token_activacion(
  p_fisio_id uuid,
  p_paciente_email text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
  v_token := '';
  FOR i IN 1..8 LOOP
    v_token := v_token || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
  END LOOP;

  INSERT INTO tokens_activacion (token, created_by, fisioterapeuta_id, paciente_email, expires_at)
  VALUES (v_token, p_fisio_id, p_fisio_id, p_paciente_email, now() + interval '30 days');

  RETURN v_token;
END;
$$;

-- ============================================================
-- 2. FIX RLS POLICIES - REPLACE USING(true)/WITH CHECK(true)
-- ============================================================

-- ---------- usuarios ----------
DROP POLICY IF EXISTS "public_insert_usuarios" ON usuarios;
CREATE POLICY "auth_insert_usuarios" ON usuarios FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_usuarios" ON usuarios;
CREATE POLICY "auth_update_usuarios" ON usuarios FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_usuarios" ON usuarios;
CREATE POLICY "auth_delete_usuarios" ON usuarios FOR DELETE
  TO authenticated USING (true);

-- ---------- perfiles_simples ----------
DROP POLICY IF EXISTS "public_insert_perfiles" ON perfiles_simples;
CREATE POLICY "auth_insert_perfiles" ON perfiles_simples FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_perfiles" ON perfiles_simples;
CREATE POLICY "auth_update_perfiles" ON perfiles_simples FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_perfiles" ON perfiles_simples;
CREATE POLICY "auth_delete_perfiles" ON perfiles_simples FOR DELETE
  TO authenticated USING (true);

-- ---------- fisioterapeutas_simple ----------
DROP POLICY IF EXISTS "public_insert_fisios" ON fisioterapeutas_simple;
CREATE POLICY "auth_insert_fisios" ON fisioterapeutas_simple FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_fisios" ON fisioterapeutas_simple;
CREATE POLICY "auth_update_fisios" ON fisioterapeutas_simple FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_fisios" ON fisioterapeutas_simple;
CREATE POLICY "auth_delete_fisios" ON fisioterapeutas_simple FOR DELETE
  TO authenticated USING (true);

-- ---------- tokens_activacion ----------
DROP POLICY IF EXISTS "public_insert_tokens" ON tokens_activacion;
CREATE POLICY "auth_insert_tokens" ON tokens_activacion FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_tokens" ON tokens_activacion;
CREATE POLICY "auth_update_tokens" ON tokens_activacion FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_tokens" ON tokens_activacion;
CREATE POLICY "auth_delete_tokens" ON tokens_activacion FOR DELETE
  TO authenticated USING (true);

-- ---------- rutinas ----------
DROP POLICY IF EXISTS "public_insert_rutinas" ON rutinas;
CREATE POLICY "auth_insert_rutinas" ON rutinas FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_rutinas" ON rutinas;
CREATE POLICY "auth_update_rutinas" ON rutinas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_rutinas" ON rutinas;
CREATE POLICY "auth_delete_rutinas" ON rutinas FOR DELETE
  TO authenticated USING (true);

-- ---------- sesiones_completadas ----------
DROP POLICY IF EXISTS "public_insert_sesiones" ON sesiones_completadas;
CREATE POLICY "auth_insert_sesiones" ON sesiones_completadas FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_sesiones" ON sesiones_completadas;
CREATE POLICY "auth_update_sesiones" ON sesiones_completadas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_sesiones" ON sesiones_completadas;
CREATE POLICY "auth_delete_sesiones" ON sesiones_completadas FOR DELETE
  TO authenticated USING (true);

-- ---------- documentos_clinicos ----------
DROP POLICY IF EXISTS "public_insert_documentos" ON documentos_clinicos;
CREATE POLICY "auth_insert_documentos" ON documentos_clinicos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_documentos" ON documentos_clinicos;
CREATE POLICY "auth_update_documentos" ON documentos_clinicos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_documentos" ON documentos_clinicos;
CREATE POLICY "auth_delete_documentos" ON documentos_clinicos FOR DELETE
  TO authenticated USING (true);

-- ---------- logros_definicion ----------
DROP POLICY IF EXISTS "public_insert_logros" ON logros_definicion;
CREATE POLICY "auth_insert_logros" ON logros_definicion FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_logros" ON logros_definicion;
CREATE POLICY "auth_update_logros" ON logros_definicion FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_logros" ON logros_definicion;
CREATE POLICY "auth_delete_logros" ON logros_definicion FOR DELETE
  TO authenticated USING (true);

-- ---------- profiles (new auth schema) ----------
DROP POLICY IF EXISTS "public_insert_profiles" ON profiles;
CREATE POLICY "auth_insert_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_profiles" ON profiles;
CREATE POLICY "auth_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_profiles" ON profiles;
CREATE POLICY "auth_delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (true);

-- ---------- activation_tokens (new auth schema) ----------
DROP POLICY IF EXISTS "public_insert_atokens" ON activation_tokens;
CREATE POLICY "auth_insert_atokens" ON activation_tokens FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_atokens" ON activation_tokens;
CREATE POLICY "auth_update_atokens" ON activation_tokens FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_atokens" ON activation_tokens;
CREATE POLICY "auth_delete_atokens" ON activation_tokens FOR DELETE
  TO authenticated USING (true);

-- ---------- pacientes_terapeutas (new auth schema) ----------
DROP POLICY IF EXISTS "public_insert_pt" ON pacientes_terapeutas;
CREATE POLICY "auth_insert_pt" ON pacientes_terapeutas FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_pt" ON pacientes_terapeutas;
CREATE POLICY "auth_delete_pt" ON pacientes_terapeutas FOR DELETE
  TO authenticated USING (true);

-- ---------- pacientes (fisio mirror tables) ----------
DROP POLICY IF EXISTS "insert_pacientes" ON pacientes;
CREATE POLICY "auth_insert_pacientes" ON pacientes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_pacientes" ON pacientes;
CREATE POLICY "auth_update_pacientes" ON pacientes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_pacientes" ON pacientes;
CREATE POLICY "auth_delete_pacientes" ON pacientes FOR DELETE
  TO authenticated USING (true);

-- ---------- documentos_medicos (fisio mirror tables) ----------
DROP POLICY IF EXISTS "insert_documentos_medicos" ON documentos_medicos;
CREATE POLICY "auth_insert_documentos_medicos" ON documentos_medicos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_documentos_medicos" ON documentos_medicos;
CREATE POLICY "auth_update_documentos_medicos" ON documentos_medicos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_documentos_medicos" ON documentos_medicos;
CREATE POLICY "auth_delete_documentos_medicos" ON documentos_medicos FOR DELETE
  TO authenticated USING (true);

-- ---------- sesiones_ejercicios (fisio mirror tables) ----------
DROP POLICY IF EXISTS "insert_sesiones_ejercicios" ON sesiones_ejercicios;
CREATE POLICY "auth_insert_sesiones_ejercicios" ON sesiones_ejercicios FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_sesiones_ejercicios" ON sesiones_ejercicios;
CREATE POLICY "auth_update_sesiones_ejercicios" ON sesiones_ejercicios FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_sesiones_ejercicios" ON sesiones_ejercicios;
CREATE POLICY "auth_delete_sesiones_ejercicios" ON sesiones_ejercicios FOR DELETE
  TO authenticated USING (true);

-- ---------- especialidades (if exists) ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'especialidades') THEN
    DROP POLICY IF EXISTS "auth_insert_especialidades" ON especialidades;
    CREATE POLICY "auth_insert_especialidades" ON especialidades FOR INSERT
      TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 3. FIX PUBLIC BUCKET LISTING
-- ============================================================

DROP POLICY IF EXISTS "public_read_documentos" ON storage.objects;

DROP POLICY IF EXISTS "public_upload_documentos" ON storage.objects;
CREATE POLICY "public_upload_documentos" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'documentos');

DROP POLICY IF EXISTS "public_delete_documentos" ON storage.objects;
CREATE POLICY "public_delete_documentos" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'documentos');

-- ============================================================
-- 4. FIX SECURITY DEFINER FUNCTIONS - REVOKE PUBLIC EXECUTE
-- ============================================================

REVOKE EXECUTE ON FUNCTION hash_password(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION login_usuario(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION registrar_fisioterapeuta(text, text, text, text, text, text, integer, text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION registrar_paciente(text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION validar_token(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION crear_token_activacion(uuid, text) FROM anon, authenticated;
