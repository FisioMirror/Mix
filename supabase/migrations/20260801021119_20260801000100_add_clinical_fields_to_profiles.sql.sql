/*
# Add 22 Clinical Fields to profiles for Patient Loading/OCR

Adds clinical fields to the profiles table for the patient loading wizard.
All columns are nullable so existing rows are unaffected.
*/

DO $$ BEGIN
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
END $$;