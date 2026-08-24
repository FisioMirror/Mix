/*
# Add paciente_id to activation_tokens and seed admin profile

1. Modified Tables
- `activation_tokens`: add `paciente_id` (uuid, nullable) referencing `profiles(id)`.
  This links a pre-registered patient profile to its activation token, so the
  patient can log in with ONLY the token (no email/password). When the fisio
  runs "Carga de Paciente", a patient profile is created and stored here.
  The existing `used_by` column is kept for backward compatibility.

2. Data
- Insert an admin profile (role='admin', email='admin@gmail.com') with a
  sha256 password hash of 'admin123' + the app salt, so the quick-test admin
  login works out of the box.

3. Security
- RLS already enabled on activation_tokens; existing public CRUD policies
  remain (this is a custom-auth app using the anon key, so anon+authenticated
  access is intended).
- A new policy is NOT needed because the existing policies already allow
  anon+authenticated full CRUD on activation_tokens.

4. Notes
- `paciente_id` is nullable: old tokens (generated before this change) won't
  have a linked patient; that's fine, they still work via the old
  used_by/activateWithToken flow.
- The admin password hash is computed as sha256('admin123fisiomirror-salt-2024'),
  matching the client-side hashing used by authStore.
*/

ALTER TABLE activation_tokens
  ADD COLUMN IF NOT EXISTS paciente_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Seed the admin profile for quick-test login.
-- Password hash = sha256('admin123' + 'fisiomirror-salt-2024')
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@gmail.com') THEN
    INSERT INTO profiles (email, full_name, role, is_active, password_hash)
    VALUES (
      'admin@gmail.com',
      'Administrador',
      'admin',
      true,
      encode(
        digest('admin123fisiomirror-salt-2024', 'sha256'),
        'hex'
      )
    );
  END IF;
END $$;
