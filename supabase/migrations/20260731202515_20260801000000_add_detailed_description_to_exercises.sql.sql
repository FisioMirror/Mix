-- Add detailed_description column to exercises table
-- Stores the long-form, detailed description shown in the "Ver descripción" modal.
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS detailed_description TEXT;
