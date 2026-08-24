/*
# Fix remaining RLS policies for custom auth
# logros_paciente and profile_especialidades still use auth.uid() with TO authenticated
# App uses custom auth so auth.uid() is always NULL
*/
DROP POLICY IF EXISTS "insert_logros_paciente" ON logros_paciente;
DROP POLICY IF EXISTS "select_logros_paciente" ON logros_paciente;
DROP POLICY IF EXISTS "update_logros_paciente" ON logros_paciente;
DROP POLICY IF EXISTS "delete_logros_paciente" ON logros_paciente;

CREATE POLICY "select_logros_paciente" ON logros_paciente FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_logros_paciente" ON logros_paciente FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_logros_paciente" ON logros_paciente FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_logros_paciente" ON logros_paciente FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "select_own_profile_especialidades" ON profile_especialidades;
DROP POLICY IF EXISTS "insert_own_profile_especialidades" ON profile_especialidades;
DROP POLICY IF EXISTS "delete_own_profile_especialidades" ON profile_especialidades;

CREATE POLICY "select_profile_especialidades" ON profile_especialidades FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_profile_especialidades" ON profile_especialidades FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_profile_especialidades" ON profile_especialidades FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_profile_especialidades" ON profile_especialidades FOR DELETE
  TO anon, authenticated USING (true);