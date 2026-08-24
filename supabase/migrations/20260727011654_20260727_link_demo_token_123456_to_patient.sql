/*
# Link existing token 123456 to demo patient and reset reusable state

1. Summary
- A prior run created token '123456' without a linked patient (paciente_id
  was null, is_used was true from old single-use logic). This migration
  links it to the demo patient profile and resets it to reusable state.
- Also updates the demo patient's display name to 'Demo Pacien'.

2. Data
- UPDATE activation_tokens SET paciente_id = (demo patient id),
  is_used = false WHERE token = '123456'.
- UPDATE profiles SET full_name = 'Demo Pacien' WHERE email =
  'paciente@demo.com'.

3. Notes
- Idempotent and safe to re-run.
*/

UPDATE activation_tokens
SET paciente_id = (SELECT id FROM profiles WHERE email = 'paciente@demo.com'),
    is_used = false
WHERE token = '123456';

UPDATE profiles
SET full_name = 'Demo Pacien'
WHERE email = 'paciente@demo.com';
