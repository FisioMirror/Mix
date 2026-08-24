/*
# Create clinical and gamification tables

1. New Tables
- `rutinas`: routines assigned by a fisioterapeuta to a paciente. Stores ejercicios as jsonb.
- `sesiones_completadas`: records of completed exercise sessions with metrics, quality, pain.
- `documentos_clinicos`: uploaded prescription images for OCR processing.
- `logros_definicion`: achievement definitions for the gamification system.

2. Security
- RLS enabled on all tables with public CRUD policies (TO anon, authenticated).
- Same rationale as the auth tables: custom auth system, app-level ownership enforcement.

3. Notes
- `rutinas.ejercicios` is a jsonb array of exercise definitions (nombre, objetivo, repeticiones, etc.).
- `sesiones_completadas.calidad_ejecucion` is a real 0..1 score.
- `sesiones_completadas.dolor_reportado` constrained 0..10.
- `documentos_clinicos.ocr_status` defaults to 'pending'.
- `logros_definicion.condicion` is jsonb describing unlock criteria.
*/

CREATE TABLE IF NOT EXISTS rutinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES usuarios(id),
  fisioterapeuta_id uuid REFERENCES usuarios(id),
  nombre text NOT NULL,
  descripcion text,
  ejercicios jsonb NOT NULL,
  activa boolean DEFAULT true,
  fecha_inicio date NOT NULL,
  fecha_fin date
);

ALTER TABLE rutinas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_rutinas" ON rutinas;
CREATE POLICY "public_select_rutinas" ON rutinas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_rutinas" ON rutinas;
CREATE POLICY "public_insert_rutinas" ON rutinas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_rutinas" ON rutinas;
CREATE POLICY "public_update_rutinas" ON rutinas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_rutinas" ON rutinas;
CREATE POLICY "public_delete_rutinas" ON rutinas FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS sesiones_completadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES usuarios(id),
  rutina_id uuid REFERENCES rutinas(id),
  ejercicio_nombre text NOT NULL,
  duracion_segundos integer NOT NULL,
  repeticiones integer,
  metricas jsonb,
  calidad_ejecucion real,
  dolor_reportado integer CHECK (dolor_reportado >= 0 AND dolor_reportado <= 10),
  notas text,
  fecha timestamptz DEFAULT now()
);

ALTER TABLE sesiones_completadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_sesiones" ON sesiones_completadas;
CREATE POLICY "public_select_sesiones" ON sesiones_completadas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_sesiones" ON sesiones_completadas;
CREATE POLICY "public_insert_sesiones" ON sesiones_completadas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_sesiones" ON sesiones_completadas;
CREATE POLICY "public_update_sesiones" ON sesiones_completadas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_sesiones" ON sesiones_completadas;
CREATE POLICY "public_delete_sesiones" ON sesiones_completadas FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS documentos_clinicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES usuarios(id),
  fisioterapeuta_id uuid REFERENCES usuarios(id),
  imagen_url text NOT NULL,
  diagnostico_extraido text,
  rom_objetivo jsonb,
  extremidad text,
  ocr_status text DEFAULT 'pending'
);

ALTER TABLE documentos_clinicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_documentos" ON documentos_clinicos;
CREATE POLICY "public_select_documentos" ON documentos_clinicos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_documentos" ON documentos_clinicos;
CREATE POLICY "public_insert_documentos" ON documentos_clinicos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_documentos" ON documentos_clinicos;
CREATE POLICY "public_update_documentos" ON documentos_clinicos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_documentos" ON documentos_clinicos;
CREATE POLICY "public_delete_documentos" ON documentos_clinicos FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS logros_definicion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  descripcion text NOT NULL,
  icono text DEFAULT 'trophy',
  categoria text DEFAULT 'progreso',
  condicion jsonb DEFAULT '{}'
);

ALTER TABLE logros_definicion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_logros" ON logros_definicion;
CREATE POLICY "public_select_logros" ON logros_definicion FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_logros" ON logros_definicion;
CREATE POLICY "public_insert_logros" ON logros_definicion FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_logros" ON logros_definicion;
CREATE POLICY "public_update_logros" ON logros_definicion FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_logros" ON logros_definicion;
CREATE POLICY "public_delete_logros" ON logros_definicion FOR DELETE
  TO anon, authenticated USING (true);
