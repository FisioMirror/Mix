/*
# Fix patient_exercises RLS + add ejercicio_nombre column + seed default exercises

## Changes
1. Add `ejercicio_nombre` column to `patient_exercises` (the frontend queries it but it doesn't exist).
2. Fix RLS policies on `patient_exercises` — change from `TO authenticated` with `auth.uid()` 
   to `TO anon, authenticated` with `true` (matching the app's custom-auth pattern).
3. Seed 12 default physiotherapy exercises into the `exercises` table so the library is not empty.
   Assigned to the first fisioterapeuta (Dra. Demo Fisio, id 06bd23ec-ba3c-4262-8fca-a14781b0b292).
4. Add onboarding_completed and font_size columns to profiles if they don't exist.

## Security
- App uses custom auth, not Supabase Auth, so `auth.uid()` is always NULL.
- All policies now use `TO anon, authenticated` with permissive checks.
*/

-- ═══════════════════════════════════════
-- 1. Add ejercicio_nombre to patient_exercises
-- ═══════════════════════════════════════
ALTER TABLE patient_exercises ADD COLUMN IF NOT EXISTS ejercicio_nombre text;

-- ═══════════════════════════════════════
-- 2. Fix patient_exercises RLS
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "select_patient_exercises" ON patient_exercises;
DROP POLICY IF EXISTS "insert_patient_exercises" ON patient_exercises;
DROP POLICY IF EXISTS "update_patient_exercises" ON patient_exercises;
DROP POLICY IF EXISTS "delete_patient_exercises" ON patient_exercises;

CREATE POLICY "select_patient_exercises" ON patient_exercises FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_patient_exercises" ON patient_exercises FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_patient_exercises" ON patient_exercises FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_patient_exercises" ON patient_exercises FOR DELETE
  TO anon, authenticated USING (true);

-- ═══════════════════════════════════════
-- 3. Add onboarding_completed and font_size to profiles
-- ═══════════════════════════════════════
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'normal';

-- ═══════════════════════════════════════
-- 4. Seed default exercises (only if table is empty)
-- ═══════════════════════════════════════
INSERT INTO exercises (fisio_id, nombre, descripcion, categoria, articulacion, grupo_muscular, series, repeticiones, duracion_segundos, angulo_objetivo, fase_recuperacion, lado)
SELECT '06bd23ec-ba3c-4262-8fca-a14781b0b292', * FROM (VALUES
  ('Flexión de Hombro', 'Eleva el brazo hacia adelante hasta alcanzar la altura del hombro. Mantén 2 segundos y baja lentamente.', 'fortalecimiento', 'hombro', 'Hombro', 3, 12, 60, 90, 'inicial', 'bilateral'),
  ('Abducción de Hombro', 'Abre el brazo hacia el lado hasta 90 grados. Controla el descenso.', 'fortalecimiento', 'hombro', 'Hombro', 3, 10, 60, 90, 'intermedia', 'bilateral'),
  ('Rotación Externa de Hombro', 'Con el codo a 90 grados, rota el brazo hacia afuera manteniendo el codo pegado al cuerpo.', 'movilidad', 'hombro', 'Hombro', 3, 15, 45, 45, 'inicial', 'derecho'),
  ('Extensión de Rodilla', 'Desde sentado, extiende la rodilla completamente y mantén 5 segundos.', 'fortalecimiento', 'rodilla', 'Rodilla', 4, 12, 60, 0, 'intermedia', 'bilateral'),
  ('Flexión de Rodilla en Pie', 'De pie, flexiona la rodilla llevando el talón hacia el glúteo. Baja lentamente.', 'fortalecimiento', 'rodilla', 'Piernas', 3, 12, 60, 120, 'intermedia', 'derecho'),
  ('Sentadilla Parcial', 'Baja como si te sentaras, hasta 45 grados de flexión de rodilla. Mantén la espalda recta.', 'funcional', 'rodilla', 'Piernas', 3, 10, 90, 45, 'avanzada', 'bilateral'),
  ('Movilidad Cervical', 'Gira la cabeza lentamente de un lado al otro. Mantén cada posición 3 segundos.', 'movilidad', 'cervical', 'Cuello', 2, 10, 30, 60, 'inicial', 'bilateral'),
  ('Estiramiento de Trapecio', 'Inclina la cabeza hacia un hombro, mantén 15 segundos. Repite al otro lado.', 'estiramiento', 'cervical', 'Cuello', 2, 8, 30, 45, 'inicial', 'bilateral'),
  ('Flexión de Codo', 'Con pesa ligera, flexiona el codo completamente y extiende controlando el descenso.', 'fortalecimiento', 'codo', 'Brazos', 3, 12, 60, 150, 'inicial', 'derecho'),
  ('Circunducción de Hombro', 'Realiza círculos completos con el brazo extendido, 5 en cada dirección.', 'movilidad', 'hombro', 'Hombro', 2, 10, 45, 360, 'mantenimiento', 'bilateral'),
  ('Puente de Glúteos', 'Acostado boca arriba, eleva la cadera contrayendo glúteos. Mantén 3 segundos.', 'fortalecimiento', 'cadera', 'Piernas', 3, 15, 60, 0, 'intermedia', 'bilateral'),
  ('Equilibrio sobre una Pierna', 'Mantén el equilibrio sobre una pierna durante 30 segundos. Apoya la mano si es necesario.', 'propiocepcion', 'tobillo', 'Piernas', 3, 5, 30, 0, 'avanzada', 'derecho')
) AS t(nombre, descripcion, categoria, articulacion, grupo_muscular, series, repeticiones, duracion_segundos, angulo_objetivo, fase_recuperacion, lado)
WHERE NOT EXISTS (SELECT 1 FROM exercises LIMIT 1);