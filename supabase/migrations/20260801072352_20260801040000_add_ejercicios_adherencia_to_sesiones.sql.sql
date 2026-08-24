-- Add ejercicios (JSONB) and adherencia (integer) columns to sesiones_completadas
ALTER TABLE public.sesiones_completadas
  ADD COLUMN IF NOT EXISTS ejercicios jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS adherencia integer DEFAULT 0;

COMMENT ON COLUMN public.sesiones_completadas.ejercicios IS 'JSONB array of exercises completed in the session: {nombre, series, repeticiones, duracion_segundos, calidad_promedio}';
COMMENT ON COLUMN public.sesiones_completadas.adherencia IS 'Percentage of prescribed exercises completed (0-100)';
