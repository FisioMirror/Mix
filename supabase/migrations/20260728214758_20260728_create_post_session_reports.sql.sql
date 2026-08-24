/*
# Create post_session_reports table

1. New Tables
- `post_session_reports`
  - `id` (uuid, primary key)
  - `paciente_id` (uuid, FK to profiles.id, the patient who reported)
  - `sesion_id` (uuid, FK to sesiones_completadas.id, nullable, links to the session)
  - `dolor_antes` (integer 0-10, pain before session)
  - `dolor_despues` (integer 0-10, pain after session)
  - `fatiga_nivel` (integer 1-5, fatigue level)
  - `comentario` (text, optional patient comment)
  - `fecha` (timestamptz, default now())
2. Security
- Enable RLS on `post_session_reports`.
- Allow anon + authenticated CRUD (custom auth model, anon key used by frontend).
*/

CREATE TABLE IF NOT EXISTS post_session_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  sesion_id uuid REFERENCES sesiones_completadas(id) ON DELETE CASCADE,
  dolor_antes integer CHECK (dolor_antes >= 0 AND dolor_antes <= 10),
  dolor_despues integer CHECK (dolor_despues >= 0 AND dolor_despues <= 10),
  fatiga_nivel integer CHECK (fatiga_nivel >= 1 AND fatiga_nivel <= 5),
  comentario text,
  fecha timestamptz DEFAULT now()
);

ALTER TABLE post_session_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_post_session_reports" ON post_session_reports;
CREATE POLICY "anon_select_post_session_reports" ON post_session_reports
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_post_session_reports" ON post_session_reports;
CREATE POLICY "anon_insert_post_session_reports" ON post_session_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_post_session_reports" ON post_session_reports;
CREATE POLICY "anon_update_post_session_reports" ON post_session_reports
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_post_session_reports" ON post_session_reports;
CREATE POLICY "anon_delete_post_session_reports" ON post_session_reports
  FOR DELETE TO anon, authenticated USING (true);
