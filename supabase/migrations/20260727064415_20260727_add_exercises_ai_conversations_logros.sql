/*
# Add exercises, patient_exercises, ai_conversations, and logros_paciente tables for FisioMirror v2.0

1. New Tables
- exercises: Exercise library created by fisioterapeutas
- patient_exercises: Exercises assigned to patients (prescription link)
- ai_conversations: Unified AI chat history
- logros_paciente: Achievement tracking per patient for gamification

2. Security
- RLS enabled on all new tables with ownership-based policies
*/

-- === exercises (create first, policy references patient_exercises later) ===
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
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Simple policies first (no cross-table refs)
DROP POLICY IF EXISTS "select_exercises" ON exercises;
CREATE POLICY "select_exercises" ON exercises FOR SELECT
  TO authenticated USING (auth.uid() = fisio_id);

DROP POLICY IF EXISTS "insert_exercises" ON exercises;
CREATE POLICY "insert_exercises" ON exercises FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = fisio_id);

DROP POLICY IF EXISTS "update_exercises" ON exercises;
CREATE POLICY "update_exercises" ON exercises FOR UPDATE
  TO authenticated USING (auth.uid() = fisio_id) WITH CHECK (auth.uid() = fisio_id);

DROP POLICY IF EXISTS "delete_exercises" ON exercises;
CREATE POLICY "delete_exercises" ON exercises FOR DELETE
  TO authenticated USING (auth.uid() = fisio_id);

-- === patient_exercises ===
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
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patient_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_patient_exercises" ON patient_exercises;
CREATE POLICY "select_patient_exercises" ON patient_exercises FOR SELECT
  TO authenticated USING (auth.uid() = paciente_id OR auth.uid() = fisio_id);

DROP POLICY IF EXISTS "insert_patient_exercises" ON patient_exercises;
CREATE POLICY "insert_patient_exercises" ON patient_exercises FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = fisio_id);

DROP POLICY IF EXISTS "update_patient_exercises" ON patient_exercises;
CREATE POLICY "update_patient_exercises" ON patient_exercises FOR UPDATE
  TO authenticated USING (auth.uid() = paciente_id OR auth.uid() = fisio_id)
  WITH CHECK (auth.uid() = paciente_id OR auth.uid() = fisio_id);

DROP POLICY IF EXISTS "delete_patient_exercises" ON patient_exercises;
CREATE POLICY "delete_patient_exercises" ON patient_exercises FOR DELETE
  TO authenticated USING (auth.uid() = fisio_id);

-- Now update exercises SELECT policy to also allow patients to see their assigned exercises
DROP POLICY IF EXISTS "select_exercises" ON exercises;
CREATE POLICY "select_exercises" ON exercises FOR SELECT
  TO authenticated USING (
    auth.uid() = fisio_id OR EXISTS (
      SELECT 1 FROM patient_exercises pe WHERE pe.ejercicio_id = exercises.id AND pe.paciente_id = auth.uid()
    )
  );

-- === ai_conversations ===
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text,
  messages jsonb DEFAULT '[]'::jsonb,
  context_type text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_conversations" ON ai_conversations;
CREATE POLICY "select_own_conversations" ON ai_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_conversations" ON ai_conversations;
CREATE POLICY "insert_own_conversations" ON ai_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_conversations" ON ai_conversations;
CREATE POLICY "update_own_conversations" ON ai_conversations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_conversations" ON ai_conversations;
CREATE POLICY "delete_own_conversations" ON ai_conversations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === logros_paciente ===
CREATE TABLE IF NOT EXISTS logros_paciente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logro_id uuid REFERENCES logros_definicion(id) ON DELETE SET NULL,
  desbloqueado boolean DEFAULT false,
  fecha_desbloqueo timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(paciente_id, logro_id)
);

ALTER TABLE logros_paciente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_logros_paciente" ON logros_paciente;
CREATE POLICY "select_logros_paciente" ON logros_paciente FOR SELECT
  TO authenticated USING (
    auth.uid() = paciente_id OR EXISTS (
      SELECT 1 FROM pacientes_terapeutas pt WHERE pt.terapeuta_id = auth.uid() AND pt.paciente_id = logros_paciente.paciente_id
    )
  );

DROP POLICY IF EXISTS "insert_logros_paciente" ON logros_paciente;
CREATE POLICY "insert_logros_paciente" ON logros_paciente FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = paciente_id OR EXISTS (
      SELECT 1 FROM pacientes_terapeutas pt WHERE pt.terapeuta_id = auth.uid() AND pt.paciente_id = logros_paciente.paciente_id
    )
  );

DROP POLICY IF EXISTS "update_logros_paciente" ON logros_paciente;
CREATE POLICY "update_logros_paciente" ON logros_paciente FOR UPDATE
  TO authenticated USING (auth.uid() = paciente_id) WITH CHECK (auth.uid() = paciente_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_fisio_id ON exercises(fisio_id);
CREATE INDEX IF NOT EXISTS idx_patient_exercises_paciente_id ON patient_exercises(paciente_id);
CREATE INDEX IF NOT EXISTS idx_patient_exercises_fisio_id ON patient_exercises(fisio_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_logros_paciente_paciente_id ON logros_paciente(paciente_id);