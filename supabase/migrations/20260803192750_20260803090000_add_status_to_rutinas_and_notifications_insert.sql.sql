-- Add status column to rutinas for archiving (activa, archivada, completada)
ALTER TABLE rutinas ADD COLUMN IF NOT EXISTS status text DEFAULT 'activa';

-- Add INSERT policy for notifications (was missing)
CREATE POLICY "insert_notifications" ON notifications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Add updated_at to rutinas for audit
ALTER TABLE rutinas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add fisioterapeuta_nombre for audit trail
ALTER TABLE rutinas ADD COLUMN IF NOT EXISTS fisioterapeuta_nombre text;
