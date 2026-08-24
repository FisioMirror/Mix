-- Add columns to store the full set of AI-extracted / therapist-editable
-- clinical fields captured during the OCR validation step of OCRScannerPage.
-- These complement the existing diagnostico_extraido, rom_objetivo and extremidad columns.

ALTER TABLE public.documentos_clinicos
  ADD COLUMN IF NOT EXISTS diagnostico_secundario text,
  ADD COLUMN IF NOT EXISTS frecuencia_sesiones text,
  ADD COLUMN IF NOT EXISTS medicamentos_actuales text,
  ADD COLUMN IF NOT EXISTS alergias text,
  ADD COLUMN IF NOT EXISTS antecedentes_medicos text,
  ADD COLUMN IF NOT EXISTS cirugias_previas text,
  ADD COLUMN IF NOT EXISTS medico_tratante text,
  ADD COLUMN IF NOT EXISTS telefono_paciente text,
  ADD COLUMN IF NOT EXISTS observaciones text;

-- The profiles table already stores full_name, email, fecha_nacimiento and diagnostico.
-- No changes needed there; the new clinical detail lives on documentos_clinicos.
