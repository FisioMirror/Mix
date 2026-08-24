-- ============================================================
-- Phase 0 Fix 1: Expand ai_jobs_type_check to include all types
-- ============================================================
-- The CHECK constraint only allowed 'image_analysis' and 'text_generation'
-- but the app also uses 'insights', 'summaries', and 'pdf_report'.

ALTER TABLE ai_jobs DROP CONSTRAINT IF EXISTS ai_jobs_type_check;

ALTER TABLE ai_jobs ADD CONSTRAINT ai_jobs_type_check
  CHECK (type = ANY (ARRAY['image_analysis'::text, 'text_generation'::text, 'insights'::text, 'summaries'::text, 'pdf_report'::text]));

-- ============================================================
-- Phase 0 Fix 2: Make password_hash nullable for token-only patients
-- ============================================================
-- Patients created via token don't have a password. The NOT NULL
-- constraint causes insert failures. Set a default and make nullable.

ALTER TABLE profiles ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN password_hash SET DEFAULT 'TOKEN_AUTH';
