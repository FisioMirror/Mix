/*
# Add telefono, compensations, and ai_conversations content column

## Changes
1. Add `telefono` (text, nullable) to `fisioterapeutas_simple` for quick contact actions (tel:, sms:, wa.me)
2. Add `compensaciones_detectadas` (jsonb, nullable) to `sesiones_completadas` for AR mirror compensation tracking
3. Add `calidad_promedio` (real, nullable) to `sesiones_completadas` for average session quality score
4. Add `content` (text, nullable) to `ai_conversations` for individual message persistence alongside the existing jsonb messages column

## Security
- No new tables created
- Existing RLS policies remain unchanged
- All columns are nullable — no data loss risk
*/

-- 1. Add telefono to fisioterapeutas_simple
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fisioterapeutas_simple' AND column_name = 'telefono'
  ) THEN
    ALTER TABLE public.fisioterapeutas_simple ADD COLUMN telefono text;
  END IF;
END $$;

-- 2. Add compensaciones_detectadas to sesiones_completadas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sesiones_completadas' AND column_name = 'compensaciones_detectadas'
  ) THEN
    ALTER TABLE public.sesiones_completadas ADD COLUMN compensaciones_detectadas jsonb;
  END IF;
END $$;

-- 3. Add calidad_promedio to sesiones_completadas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sesiones_completadas' AND column_name = 'calidad_promedio'
  ) THEN
    ALTER TABLE public.sesiones_completadas ADD COLUMN calidad_promedio real;
  END IF;
END $$;

-- 4. Add content to ai_conversations for individual message persistence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ai_conversations' AND column_name = 'content'
  ) THEN
    ALTER TABLE public.ai_conversations ADD COLUMN content text;
  END IF;
END $$;
