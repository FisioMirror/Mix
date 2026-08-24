-- ============================================================
-- MIGRATION PART 1: TABLES + COLUMNS + CONSTRAINTS
-- Creates 15 missing tables and adds missing columns to 9 existing tables
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- usuarios ----------
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  nombre text NOT NULL,
  rol text NOT NULL CHECK (rol IN ('paciente', 'fisioterapeuta')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------- perfiles_simples ----------
CREATE TABLE IF NOT EXISTS perfiles_simples (
  id uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  email text NOT NULL,
  nombre text NOT NULL,
  avatar_url text,
  telefono text,
  fecha_nacimiento date,
  created_at timestamptz DEFAULT now()
);

-- ---------- fisioterapeutas_simple ----------
CREATE TABLE IF NOT EXISTS fisioterapeutas_simple (
  id uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  colegiado_id text NOT NULL,
  especialidad_tipo text,
  universidad_egreso text NOT NULL,
  anio_egreso integer NOT NULL,
  certificaciones_adicionales text[] DEFAULT '{}',
  telefono text
);

-- ---------- tokens_activacion ----------
CREATE TABLE IF NOT EXISTS tokens_activacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  created_by uuid REFERENCES usuarios(id),
  fisioterapeuta_id uuid REFERENCES usuarios(id),
  paciente_email text,
  used_by uuid REFERENCES usuarios(id),
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false
);

-- ---------- logros_definicion ----------
CREATE TABLE IF NOT EXISTS logros_definicion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  descripcion text NOT NULL,
  icono text DEFAULT 'trophy',
  categoria text DEFAULT 'progreso',
  condicion jsonb DEFAULT '{}'
);

-- ---------- documentos_clinicos ----------
CREATE TABLE IF NOT EXISTS documentos_clinicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES usuarios(id),
  fisioterapeuta_id uuid REFERENCES usuarios(id),
  imagen_url text NOT NULL,
  diagnostico_extraido text,
  rom_objetivo jsonb,
  extremidad text,
  ocr_status text DEFAULT 'pending',
  diagnostico_secundario text,
  frecuencia_sesiones text,
  medicamentos_actuales text,
  alergias text,
  antecedentes_medicos text,
  cirugias_previas text,
  medico_tratante text,
  telefono_paciente text,
  observaciones text
);

-- ---------- pacientes (fisio_mirror) ----------
CREATE TABLE IF NOT EXISTS pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  fecha_nacimiento date,
  diagnostico text,
  created_at timestamptz DEFAULT now()
);

-- ---------- documentos_medicos (fisio_mirror) ----------
CREATE TABLE IF NOT EXISTS documentos_medicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo_documento text,
  texto_original text,
  contenido_estructurado jsonb,
  url_imagen text,
  created_at timestamptz DEFAULT now()
);

-- ---------- sesiones_ejercicios (fisio_mirror) ----------
CREATE TABLE IF NOT EXISTS sesiones_ejercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha timestamptz DEFAULT now(),
  log_ejercicios text,
  resumen_ia text,
  metricas jsonb
);

-- ---------- exercises ----------
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fisio_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  categoria text DEFAULT 'general',
  fase_recuperacion text DEFAULT 'agudo',
  video_url text,
  landmarks jsonb DEFAULT '[]'::jsonb,
  angulo_objetivo integer,
  series_default integer DEFAULT 3,
  repeticiones_default integer DEFAULT 10,
  duracion_segundos integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  grupo_muscular text,
  articulacion text,
  lado text,
  series integer,
  repeticiones integer,
  detailed_description text
);

-- ---------- patient_exercises ----------
CREATE TABLE IF NOT EXISTS patient_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fisio_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ejercicio_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  rutina_id uuid REFERENCES rutinas(id) ON DELETE SET NULL,
  series integer DEFAULT 3,
  repeticiones integer DEFAULT 10,
  frecuencia_semana integer DEFAULT 3,
  fecha_asignacion date DEFAULT CURRENT_DATE,
  activo boolean DEFAULT true,
  notas text,
  created_at timestamptz DEFAULT now(),
  ejercicio_nombre text
);

-- ---------- ai_conversations ----------
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text,
  messages jsonb DEFAULT '[]'::jsonb,
  context_type text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  content text
);

-- ---------- logros_paciente ----------
CREATE TABLE IF NOT EXISTS logros_paciente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logro_id uuid REFERENCES logros_definicion(id) ON DELETE SET NULL,
  desbloqueado boolean DEFAULT false,
  fecha_desbloqueo timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(paciente_id, logro_id)
);

-- ---------- profile_especialidades ----------
CREATE TABLE IF NOT EXISTS profile_especialidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  especialidad text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, especialidad)
);

-- ============================================================
-- ALTER EXISTING TABLES — ADD MISSING COLUMNS
-- ============================================================

-- ---------- profiles ----------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS anio_egreso integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certificaciones text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fecha_nacimiento date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS diagnostico text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'normal';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clinic_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS documento_identidad text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tipo_sangre text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ocupacion text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nivel_actividad text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS es_menor_edad boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS patologia text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS diagnostico_secundario text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medicamentos_actuales text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alergias text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS enfermedades_cronicas text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lesiones_previas text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS estatura_cm integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS peso_kg numeric(5,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extremidad_afectada text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rom_objetivo text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS frecuencia_sesiones text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medico_remitente text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contacto_emergencia_telefono text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutor_nombre text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutor_telefono text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutor_email text;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('fisioterapeuta', 'paciente'));
ALTER TABLE profiles ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN password_hash SET DEFAULT 'TOKEN_AUTH';

-- ---------- activation_tokens ----------
ALTER TABLE activation_tokens ADD COLUMN IF NOT EXISTS paciente_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- ---------- ai_jobs ----------
ALTER TABLE ai_jobs DROP CONSTRAINT IF EXISTS ai_jobs_type_check;
ALTER TABLE ai_jobs ADD CONSTRAINT ai_jobs_type_check
  CHECK (type = ANY (ARRAY['image_analysis'::text, 'text_generation'::text, 'insights'::text, 'summaries'::text, 'pdf_report'::text]));

-- ---------- notifications ----------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ---------- rutinas ----------
ALTER TABLE rutinas ADD COLUMN IF NOT EXISTS status text DEFAULT 'activa';
ALTER TABLE rutinas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE rutinas ADD COLUMN IF NOT EXISTS fisioterapeuta_nombre text;

-- ---------- sesiones_completadas ----------
ALTER TABLE public.sesiones_completadas ADD COLUMN IF NOT EXISTS compensaciones_detectadas jsonb;
ALTER TABLE public.sesiones_completadas ADD COLUMN IF NOT EXISTS calidad_promedio real;
ALTER TABLE public.sesiones_completadas ADD COLUMN IF NOT EXISTS ejercicios jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.sesiones_completadas ADD COLUMN IF NOT EXISTS adherencia integer DEFAULT 0;
COMMENT ON COLUMN public.sesiones_completadas.ejercicios IS 'JSONB array of exercises completed in the session';
COMMENT ON COLUMN public.sesiones_completadas.adherencia IS 'Percentage of prescribed exercises completed (0-100)';

-- ---------- post_session_reports ----------
ALTER TABLE post_session_reports ADD COLUMN IF NOT EXISTS dolor_antes integer;
ALTER TABLE post_session_reports ADD COLUMN IF NOT EXISTS dolor_despues integer;
ALTER TABLE post_session_reports ADD COLUMN IF NOT EXISTS fatiga_nivel integer;
ALTER TABLE post_session_reports ADD COLUMN IF NOT EXISTS comentario text;
ALTER TABLE post_session_reports ADD COLUMN IF NOT EXISTS fecha timestamptz DEFAULT now();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_documentos_paciente_id ON documentos_medicos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_paciente_id ON sesiones_ejercicios(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON sesiones_ejercicios(fecha);
CREATE INDEX IF NOT EXISTS idx_exercises_fisio_id ON exercises(fisio_id);
CREATE INDEX IF NOT EXISTS idx_patient_exercises_paciente_id ON patient_exercises(paciente_id);
CREATE INDEX IF NOT EXISTS idx_patient_exercises_fisio_id ON patient_exercises(fisio_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_logros_paciente_paciente_id ON logros_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read, created_at DESC);