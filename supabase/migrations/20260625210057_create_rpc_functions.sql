/*
# Create auth RPC functions (SECURITY DEFINER)

1. Functions
- `hash_password(password text) RETURNS text`: sha256(password || fixed salt), hex encoded.
- `login_usuario(p_email text, p_password text) RETURNS json`: verifies credentials, returns user data or error.
- `registrar_fisioterapeuta(...) RETURNS json`: registers a fisioterapeuta with professional data.
- `registrar_paciente(p_email, p_password, p_nombre, p_token) RETURNS json`: registers a patient using an activation token.
- `validar_token(p_token text) RETURNS boolean`: checks token availability and expiry.
- `crear_token_activacion(p_fisio_id uuid, p_paciente_email text) RETURNS text`: generates an 8-char token.

2. Security
- All functions SECURITY DEFINER so they can insert/update rows regardless of RLS.
- `hash_password` is IMMUTABLE and LEAKPROOF-ish (uses digest from pgcrypto).
- Login compares stored hash to computed hash; never returns the hash.

3. Notes
- pgcrypto extension required for digest/sha256.
- Token generation uses random() + encode; 8 uppercase alnum chars.
- registrar_paciente marks the token as used and links the new patient.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION hash_password(password text) RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT encode(digest(password || 'fisiomirror-salt-2024', 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION login_usuario(p_email text, p_password text) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
