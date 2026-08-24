-- ============================================================
-- MIGRATION PART 2: RLS POLICIES + RPC FUNCTIONS + STORAGE
-- ============================================================

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles_simples ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisioterapeutas_simple ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens_activacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_completadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE logros_definicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes_terapeutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE logros_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_especialidades ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ---------- usuarios ----------
DROP POLICY IF EXISTS "public_select_usuarios" ON usuarios;
CREATE POLICY "public_select_usuarios" ON usuarios FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_usuarios" ON usuarios;
CREATE POLICY "auth_insert_usuarios" ON usuarios FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_usuarios" ON usuarios;
CREATE POLICY "auth_update_usuarios" ON usuarios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_usuarios" ON usuarios;
CREATE POLICY "auth_delete_usuarios" ON usuarios FOR DELETE TO authenticated USING (true);

-- ---------- perfiles_simples ----------
DROP POLICY IF EXISTS "public_select_perfiles" ON perfiles_simples;
CREATE POLICY "public_select_perfiles" ON perfiles_simples FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_perfiles" ON perfiles_simples;
CREATE POLICY "auth_insert_perfiles" ON perfiles_simples FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_perfiles" ON perfiles_simples;
CREATE POLICY "auth_update_perfiles" ON perfiles_simples FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_perfiles" ON perfiles_simples;
CREATE POLICY "auth_delete_perfiles" ON perfiles_simples FOR DELETE TO authenticated USING (true);

-- ---------- fisioterapeutas_simple ----------
DROP POLICY IF EXISTS "public_select_fisios" ON fisioterapeutas_simple;
CREATE POLICY "public_select_fisios" ON fisioterapeutas_simple FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_fisios" ON fisioterapeutas_simple;
CREATE POLICY "auth_insert_fisios" ON fisioterapeutas_simple FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_fisios" ON fisioterapeutas_simple;
CREATE POLICY "auth_update_fisios" ON fisioterapeutas_simple FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_fisios" ON fisioterapeutas_simple;
CREATE POLICY "auth_delete_fisios" ON fisioterapeutas_simple FOR DELETE TO authenticated USING (true);

-- ---------- tokens_activacion ----------
DROP POLICY IF EXISTS "public_select_tokens" ON tokens_activacion;
CREATE POLICY "public_select_tokens" ON tokens_activacion FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_tokens" ON tokens_activacion;
CREATE POLICY "auth_insert_tokens" ON tokens_activacion FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_tokens" ON tokens_activacion;
CREATE POLICY "auth_update_tokens" ON tokens_activacion FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_tokens" ON tokens_activacion;
CREATE POLICY "auth_delete_tokens" ON tokens_activacion FOR DELETE TO anon, authenticated USING (true);

-- ---------- rutinas ----------
DROP POLICY IF EXISTS "public_select_rutinas" ON rutinas;
CREATE POLICY "public_select_rutinas" ON rutinas FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_rutinas" ON rutinas;
CREATE POLICY "public_insert_rutinas" ON rutinas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_rutinas" ON rutinas;
CREATE POLICY "public_update_rutinas" ON rutinas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_rutinas" ON rutinas;
CREATE POLICY "public_delete_rutinas" ON rutinas FOR DELETE TO anon, authenticated USING (true);

-- ---------- sesiones_completadas ----------
DROP POLICY IF EXISTS "public_select_sesiones" ON sesiones_completadas;
CREATE POLICY "public_select_sesiones" ON sesiones_completadas FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_sesiones" ON sesiones_completadas;
CREATE POLICY "public_insert_sesiones" ON sesiones_completadas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_sesiones" ON sesiones_completadas;
CREATE POLICY "public_update_sesiones" ON sesiones_completadas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_sesiones" ON sesiones_completadas;
CREATE POLICY "public_delete_sesiones" ON sesiones_completadas FOR DELETE TO anon, authenticated USING (true);

-- ---------- documentos_clinicos ----------
DROP POLICY IF EXISTS "public_select_documentos" ON documentos_clinicos;
CREATE POLICY "public_select_documentos" ON documentos_clinicos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_documentos" ON documentos_clinicos;
CREATE POLICY "public_insert_documentos" ON documentos_clinicos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_documentos" ON documentos_clinicos;
CREATE POLICY "public_update_documentos" ON documentos_clinicos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_documentos" ON documentos_clinicos;
CREATE POLICY "public_delete_documentos" ON documentos_clinicos FOR DELETE TO anon, authenticated USING (true);

-- ---------- logros_definicion ----------
DROP POLICY IF EXISTS "public_select_logros" ON logros_definicion;
CREATE POLICY "public_select_logros" ON logros_definicion FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_logros" ON logros_definicion;
CREATE POLICY "auth_insert_logros" ON logros_definicion FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_logros" ON logros_definicion;
CREATE POLICY "auth_update_logros" ON logros_definicion FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_logros" ON logros_definicion;
CREATE POLICY "auth_delete_logros" ON logros_definicion FOR DELETE TO authenticated USING (true);

-- ---------- profiles ----------
DROP POLICY IF EXISTS "public_select_profiles" ON profiles;
CREATE POLICY "public_select_profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_profiles" ON profiles;
CREATE POLICY "public_insert_profiles" ON profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_profiles" ON profiles;
CREATE POLICY "public_update_profiles" ON profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_profiles" ON profiles;
CREATE POLICY "public_delete_profiles" ON profiles FOR DELETE TO anon, authenticated USING (true);

-- ---------- activation_tokens ----------
DROP POLICY IF EXISTS "public_select_atokens" ON activation_tokens;
CREATE POLICY "public_select_atokens" ON activation_tokens FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_atokens" ON activation_tokens;
CREATE POLICY "public_insert_atokens" ON activation_tokens FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_atokens" ON activation_tokens;
CREATE POLICY "public_update_atokens" ON activation_tokens FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_atokens" ON activation_tokens;
CREATE POLICY "public_delete_atokens" ON activation_tokens FOR DELETE TO anon, authenticated USING (true);

-- ---------- pacientes_terapeutas ----------
DROP POLICY IF EXISTS "public_select_pt" ON pacientes_terapeutas;
CREATE POLICY "public_select_pt" ON pacientes_terapeutas FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_pt" ON pacientes_terapeutas;
CREATE POLICY "public_insert_pt" ON pacientes_terapeutas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_pt" ON pacientes_terapeutas;
CREATE POLICY "public_delete_pt" ON pacientes_terapeutas FOR DELETE TO anon, authenticated USING (true);

-- ---------- pacientes (fisio_mirror) ----------
DROP POLICY IF EXISTS "select_own_pacientes" ON pacientes;
CREATE POLICY "select_own_pacientes" ON pacientes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_pacientes" ON pacientes;
CREATE POLICY "auth_insert_pacientes" ON pacientes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_pacientes" ON pacientes;
CREATE POLICY "auth_update_pacientes" ON pacientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_pacientes" ON pacientes;
CREATE POLICY "auth_delete_pacientes" ON pacientes FOR DELETE TO authenticated USING (true);

-- ---------- documentos_medicos ----------
DROP POLICY IF EXISTS "select_documentos_medicos" ON documentos_medicos;
CREATE POLICY "select_documentos_medicos" ON documentos_medicos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_documentos_medicos" ON documentos_medicos;
CREATE POLICY "auth_insert_documentos_medicos" ON documentos_medicos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_documentos_medicos" ON documentos_medicos;
CREATE POLICY "auth_update_documentos_medicos" ON documentos_medicos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_documentos_medicos" ON documentos_medicos;
CREATE POLICY "auth_delete_documentos_medicos" ON documentos_medicos FOR DELETE TO authenticated USING (true);

-- ---------- sesiones_ejercicios ----------
DROP POLICY IF EXISTS "select_sesiones_ejercicios" ON sesiones_ejercicios;
CREATE POLICY "select_sesiones_ejercicios" ON sesiones_ejercicios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_sesiones_ejercicios" ON sesiones_ejercicios;
CREATE POLICY "auth_insert_sesiones_ejercicios" ON sesiones_ejercicios FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_sesiones_ejercicios" ON sesiones_ejercicios;
CREATE POLICY "auth_update_sesiones_ejercicios" ON sesiones_ejercicios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_sesiones_ejercicios" ON sesiones_ejercicios;
CREATE POLICY "auth_delete_sesiones_ejercicios" ON sesiones_ejercicios FOR DELETE TO authenticated USING (true);

-- ---------- ai_jobs ----------
DROP POLICY IF EXISTS "select_ai_jobs" ON ai_jobs;
CREATE POLICY "select_ai_jobs" ON ai_jobs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_ai_jobs" ON ai_jobs;
CREATE POLICY "insert_ai_jobs" ON ai_jobs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_ai_jobs" ON ai_jobs;
CREATE POLICY "update_ai_jobs" ON ai_jobs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_ai_jobs" ON ai_jobs;
CREATE POLICY "delete_ai_jobs" ON ai_jobs FOR DELETE TO anon, authenticated USING (true);

-- ---------- rate_limits ----------
DROP POLICY IF EXISTS "select_rate_limits" ON rate_limits;
CREATE POLICY "select_rate_limits" ON rate_limits FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_rate_limits" ON rate_limits;
CREATE POLICY "insert_rate_limits" ON rate_limits FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_rate_limits" ON rate_limits;
CREATE POLICY "update_rate_limits" ON rate_limits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_rate_limits" ON rate_limits;
CREATE POLICY "delete_rate_limits" ON rate_limits FOR DELETE TO anon, authenticated USING (true);

-- ---------- exercises ----------
DROP POLICY IF EXISTS "select_exercises" ON exercises;
CREATE POLICY "select_exercises" ON exercises FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_exercises" ON exercises;
CREATE POLICY "insert_exercises" ON exercises FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_exercises" ON exercises;
CREATE POLICY "update_exercises" ON exercises FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_exercises" ON exercises;
CREATE POLICY "delete_exercises" ON exercises FOR DELETE TO anon, authenticated USING (true);

-- ---------- patient_exercises ----------
DROP POLICY IF EXISTS "select_patient_exercises" ON patient_exercises;
CREATE POLICY "select_patient_exercises" ON patient_exercises FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_patient_exercises" ON patient_exercises;
CREATE POLICY "insert_patient_exercises" ON patient_exercises FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_patient_exercises" ON patient_exercises;
CREATE POLICY "update_patient_exercises" ON patient_exercises FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_patient_exercises" ON patient_exercises;
CREATE POLICY "delete_patient_exercises" ON patient_exercises FOR DELETE TO anon, authenticated USING (true);

-- ---------- ai_conversations ----------
DROP POLICY IF EXISTS "select_own_conversations" ON ai_conversations;
CREATE POLICY "select_own_conversations" ON ai_conversations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_conversations" ON ai_conversations;
CREATE POLICY "insert_own_conversations" ON ai_conversations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_conversations" ON ai_conversations;
CREATE POLICY "update_own_conversations" ON ai_conversations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_conversations" ON ai_conversations;
CREATE POLICY "delete_own_conversations" ON ai_conversations FOR DELETE TO anon, authenticated USING (true);

-- ---------- logros_paciente ----------
DROP POLICY IF EXISTS "select_logros_paciente" ON logros_paciente;
CREATE POLICY "select_logros_paciente" ON logros_paciente FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_logros_paciente" ON logros_paciente;
CREATE POLICY "insert_logros_paciente" ON logros_paciente FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_logros_paciente" ON logros_paciente;
CREATE POLICY "update_logros_paciente" ON logros_paciente FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_logros_paciente" ON logros_paciente;
CREATE POLICY "delete_logros_paciente" ON logros_paciente FOR DELETE TO anon, authenticated USING (true);

-- ---------- notifications ----------
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO anon, authenticated USING (true);

-- ---------- post_session_reports ----------
DROP POLICY IF EXISTS "anon_select_post_session_reports" ON post_session_reports;
CREATE POLICY "anon_select_post_session_reports" ON post_session_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_post_session_reports" ON post_session_reports;
CREATE POLICY "anon_insert_post_session_reports" ON post_session_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_post_session_reports" ON post_session_reports;
CREATE POLICY "anon_update_post_session_reports" ON post_session_reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_post_session_reports" ON post_session_reports;
CREATE POLICY "anon_delete_post_session_reports" ON post_session_reports FOR DELETE TO anon, authenticated USING (true);

-- ---------- profile_especialidades ----------
DROP POLICY IF EXISTS "select_profile_especialidades" ON profile_especialidades;
CREATE POLICY "select_profile_especialidades" ON profile_especialidades FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_profile_especialidades" ON profile_especialidades;
CREATE POLICY "insert_profile_especialidades" ON profile_especialidades FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_profile_especialidades" ON profile_especialidades;
CREATE POLICY "update_profile_especialidades" ON profile_especialidades FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_profile_especialidades" ON profile_especialidades;
CREATE POLICY "delete_profile_especialidades" ON profile_especialidades FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- RPC FUNCTIONS — digest() is in the "extensions" schema on Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION hash_password(password text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT encode(digest(password || 'fisiomirror-salt-2024', 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION login_usuario(p_email text, p_password text) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
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
  RETURN json_build_object('success', true, 'user_id', v_user.id, 'email', v_user.email, 'nombre', v_user.nombre, 'rol', v_user.rol);
END;
$$;

CREATE OR REPLACE FUNCTION registrar_fisioterapeuta(
  p_email text, p_password text, p_nombre text, p_colegiado_id text,
  p_especialidad_tipo text, p_universidad_egreso text, p_anio_egreso integer,
  p_certificaciones text[] DEFAULT '{}'
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
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
  RETURN json_build_object('success', true, 'user_id', v_new_id, 'email', lower(trim(p_email)), 'nombre', p_nombre, 'rol', 'fisioterapeuta');
END;
$$;

CREATE OR REPLACE FUNCTION registrar_paciente(
  p_email text, p_password text, p_nombre text, p_token text
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
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
  UPDATE tokens_activacion SET is_used = true, used_by = v_new_id, used_at = now() WHERE id = v_token.id;
  RETURN json_build_object('success', true, 'user_id', v_new_id, 'email', lower(trim(p_email)), 'nombre', p_nombre, 'rol', 'paciente', 'fisioterapeuta_id', v_token.fisioterapeuta_id);
END;
$$;

CREATE OR REPLACE FUNCTION validar_token(p_token text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS(SELECT 1 FROM tokens_activacion WHERE token = upper(trim(p_token)) AND is_used = false AND expires_at > now());
$$;

CREATE OR REPLACE FUNCTION crear_token_activacion(p_fisio_id uuid, p_paciente_email text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
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

REVOKE EXECUTE ON FUNCTION hash_password(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION login_usuario(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION registrar_fisioterapeuta(text, text, text, text, text, text, integer, text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION registrar_paciente(text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION validar_token(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION crear_token_activacion(uuid, text) FROM anon, authenticated;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) SELECT 'documentos', 'documentos', true WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documentos');
INSERT INTO storage.buckets (id, name, public) SELECT 'mascot-animations', 'mascot-animations', true WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'mascot-animations');
INSERT INTO storage.buckets (id, name, public) VALUES ('pwa-icons', 'pwa-icons', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) SELECT 'avatars', 'avatars', true WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars');
INSERT INTO storage.buckets (id, name, public) SELECT 'credenciales-profesionales', 'credenciales-profesionales', true WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'credenciales-profesionales');

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- documentos bucket
DROP POLICY IF EXISTS "public_upload_documentos" ON storage.objects;
CREATE POLICY "public_upload_documentos" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'documentos');
DROP POLICY IF EXISTS "public_delete_documentos" ON storage.objects;
CREATE POLICY "public_delete_documentos" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'documentos');

-- mascot-animations bucket
DROP POLICY IF EXISTS "public_read_mascot_animations" ON storage.objects;
CREATE POLICY "public_read_mascot_animations" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'mascot-animations');
DROP POLICY IF EXISTS "authenticated_write_mascot_animations" ON storage.objects;
CREATE POLICY "authenticated_write_mascot_animations" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mascot-animations');
DROP POLICY IF EXISTS "authenticated_update_mascot_animations" ON storage.objects;
CREATE POLICY "authenticated_update_mascot_animations" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mascot-animations') WITH CHECK (bucket_id = 'mascot-animations');
DROP POLICY IF EXISTS "authenticated_delete_mascot_animations" ON storage.objects;
CREATE POLICY "authenticated_delete_mascot_animations" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mascot-animations');

-- pwa-icons bucket
DROP POLICY IF EXISTS "public_read_pwa_icons" ON storage.objects;
CREATE POLICY "public_read_pwa_icons" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'pwa-icons');
DROP POLICY IF EXISTS "anon_upload_pwa_icons" ON storage.objects;
CREATE POLICY "anon_upload_pwa_icons" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'pwa-icons');
DROP POLICY IF EXISTS "anon_update_pwa_icons" ON storage.objects;
CREATE POLICY "anon_update_pwa_icons" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'pwa-icons') WITH CHECK (bucket_id = 'pwa-icons');
DROP POLICY IF EXISTS "anon_delete_pwa_icons" ON storage.objects;
CREATE POLICY "anon_delete_pwa_icons" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'pwa-icons');

-- avatars bucket
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "auth_upload_avatars" ON storage.objects;
CREATE POLICY "auth_upload_avatars" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "auth_update_avatars" ON storage.objects;
CREATE POLICY "auth_update_avatars" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "auth_delete_avatars" ON storage.objects;
CREATE POLICY "auth_delete_avatars" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'avatars');

-- credenciales-profesionales bucket
DROP POLICY IF EXISTS "anon_upload_credenciales" ON storage.objects;
CREATE POLICY "anon_upload_credenciales" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'credenciales-profesionales');
DROP POLICY IF EXISTS "anon_update_credenciales" ON storage.objects;
CREATE POLICY "anon_update_credenciales" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'credenciales-profesionales') WITH CHECK (bucket_id = 'credenciales-profesionales');
DROP POLICY IF EXISTS "anon_delete_credenciales" ON storage.objects;
CREATE POLICY "anon_delete_credenciales" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'credenciales-profesionales');
DROP POLICY IF EXISTS "public_read_credenciales" ON storage.objects;
CREATE POLICY "public_read_credenciales" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'credenciales-profesionales');