-- Migration: Add email and password support to activation tokens for one-time use flow
-- Date: 2026-08-25
-- Description: Adds fields to support email/password registration for patients on first token use

-- Add new columns to activation_tokens table
ALTER TABLE activation_tokens 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_activation_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_activation_tokens_updated_at ON activation_tokens;
CREATE TRIGGER trigger_update_activation_tokens_updated_at
    BEFORE UPDATE ON activation_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_activation_tokens_updated_at();

-- Update RLS policies to allow updates for token activation
DROP POLICY IF EXISTS "Allow token updates for owner" ON activation_tokens;
CREATE POLICY "Allow token updates for owner" ON activation_tokens
    FOR UPDATE TO (email, password_hash, used)
    USING (
        auth.uid() = terapeuta_id
        OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'fisioterapeuta')
    );

-- Allow patients to read their own tokens
DROP POLICY IF EXISTS "Allow patients to read their tokens" ON activation_tokens;
CREATE POLICY "Allow patients to read their tokens" ON activation_tokens
    FOR SELECT
    USING (
        auth.uid() = paciente_id
        OR terapeuta_id IS NOT NULL AND auth.uid() = terapeuta_id
        OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'fisioterapeuta')
    );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_activation_tokens_token ON activation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_email ON activation_tokens(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activation_tokens_paciente_id ON activation_tokens(paciente_id);
