/*
# Remove admin role and make activation tokens reusable patient access keys

1. Summary
- The `admin` role is being removed from the app. This migration deletes the
  admin demo account (admin@gmail.com) so it can no longer log in, and
  narrows the allowed `profiles.role` values to 'fisioterapeuta' and 'paciente'
  only.
- Activation tokens are now REUSABLE patient access keys (no expiry, no
  single-use marking). A token linked to a patient profile (via `paciente_id`)
  is that patient's permanent personal login key. Existing tokens already
  linked to patients keep working; new tokens created from "Cargar Paciente"
  are also reusable. The `is_used`, `used_by`, `used_at` and `expires_at`
  columns are kept for backward compatibility but are no longer enforced by
  the auth flow (the frontend no longer checks them).
- A new demo PATIENT account is seeded (email: paciente@demo.com, name:
  "Demo Pacien", role: paciente, is_active: true) and linked to a permanent
  reusable token '123456' created by the demo fisioterapeuta. This replaces
  the old admin quick-login button on the login screen.

2. Modified Tables
- `profiles`: role CHECK constraint updated to only allow 'fisioterapeuta'
  and 'paciente'. The old admin row (admin@gmail.com) is deleted first so
  the constraint change does not fail on existing admin rows.
- `activation_tokens`: no structural change needed — `paciente_id` already
  exists from a prior migration. Legacy columns `is_used`/`used_by`/`used_at`/
  `expires_at` are retained but no longer enforced by the frontend. Existing
  tokens already linked to a patient but marked `is_used = true` are reset to
  `is_used = false` so they can be reused to log in.

3. Data
- DELETE the admin profile (email = 'admin@gmail.com').
- INSERT demo patient profile: email 'paciente@demo.com', full_name
  'Demo Pacien', role 'paciente', is_active true. Idempotent.
- INSERT reusable token '123456' linked to the demo patient and created by
  the demo fisioterapeuta (id 06bd23ec-ba3c-4262-8fca-a14781b0b292). No real
  expiry. Idempotent.
- Link the demo patient to the demo fisioterapeuta in pacientes_terapeutas.

4. Security
- RLS already enabled with public CRUD policies (TO anon, authenticated).
  No policy changes needed.

5. Notes
- Idempotent and safe to re-run.
- The demo patient password_hash is a placeholder; patients log in with
  their token only (signInWithToken), not email/password.
*/

-- 1. Delete the admin demo account so it can no longer log in.
DELETE FROM profiles WHERE email = 'admin@gmail.com' AND role = 'admin';

-- 2. Narrow the role CHECK constraint to fisioterapeuta + paciente only.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('fisioterapeuta', 'paciente'));

-- 3. Make existing linked tokens reusable again (undo single-use marking
--    for any token that already has a linked patient).
UPDATE activation_tokens
SET is_used = false, used_at = NULL
WHERE paciente_id IS NOT NULL AND is_used = true;

-- 4. Seed the demo patient profile (replaces the old admin quick-login).
DO $$
DECLARE
  demo_paciente_id uuid;
BEGIN
  SELECT id INTO demo_paciente_id FROM profiles WHERE email = 'paciente@demo.com';
  IF demo_paciente_id IS NULL THEN
    INSERT INTO profiles (email, full_name, role, is_active, password_hash)
    VALUES (
      'paciente@demo.com',
      'Demo Pacien',
      'paciente',
      true,
      'token-only-login-no-password'
    );
  END IF;
END $$;

-- 5. Seed the permanent reusable token '123456' linked to the demo patient
--    and created by the demo fisioterapeuta.
INSERT INTO activation_tokens (token, terapeuta_id, paciente_id, diagnostico, is_used, expires_at)
SELECT
  '123456',
  '06bd23ec-ba3c-4262-8fca-a14781b0b292',
  p.id,
  'Cuenta demo de paciente',
  false,
  '2099-12-31T23:59:59Z'
FROM profiles p
WHERE p.email = 'paciente@demo.com'
  AND NOT EXISTS (SELECT 1 FROM activation_tokens WHERE token = '123456');

-- 6. Link the demo patient to the demo fisioterapeuta.
INSERT INTO pacientes_terapeutas (paciente_id, terapeuta_id)
SELECT p.id, '06bd23ec-ba3c-4262-8fca-a14781b0b292'
FROM profiles p
WHERE p.email = 'paciente@demo.com'
  AND NOT EXISTS (
    SELECT 1 FROM pacientes_terapeutas pt
    WHERE pt.paciente_id = p.id
      AND pt.terapeuta_id = '06bd23ec-ba3c-4262-8fca-a14781b0b292'
  );
