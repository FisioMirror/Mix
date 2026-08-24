/*
# Seed demo data: test fisioterapeuta, activation token, and achievements

1. Data
- Demo fisioterapeuta user (email: fisio@demo.com / password: demo1234) with professional profile.
- Test activation token 'TEST1234' valid 30 days, created by the demo fisioterapeuta.
- 10 achievement definitions across categories progreso, rom, racha, tiempo.

2. Notes
- Idempotent: uses ON CONFLICT DO NOTHING so re-running won't duplicate.
- Password hash precomputed = sha256('demo1234' || 'fisiomirror-salt-2024').
*/

INSERT INTO usuarios (id, email, password_hash, nombre, rol)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'fisio@demo.com',
  encode(digest('demo1234' || 'fisiomirror-salt-2024', 'sha256'), 'hex'),
  'Dra. Demo Fisio',
  'fisioterapeuta'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO perfiles_simples (id, email, nombre)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'fisio@demo.com',
  'Dra. Demo Fisio'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO fisioterapeutas_simple (id, colegiado_id, especialidad_tipo, universidad_egreso, anio_egreso, certificaciones_adicionales)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'COL-12345',
  'Traumatología',
  'Universidad Nacional',
  2015,
  ARRAY['McKenzie Method', 'Dry Needling']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tokens_activacion (token, created_by, fisioterapeuta_id, paciente_email, expires_at)
VALUES (
  'TEST1234',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'paciente@demo.com',
  now() + interval '30 days'
)
ON CONFLICT (token) DO NOTHING;

INSERT INTO logros_definicion (codigo, nombre, descripcion, icono, categoria, condicion) VALUES
  ('first_session', 'Primer Paso', 'Completa tu primera sesión de ejercicios', 'footprints', 'progreso', '{"sesiones": 1}'),
  ('sessions_10', 'Constante', 'Completa 10 sesiones en total', 'repeat', 'progreso', '{"sesiones": 10}'),
  ('sessions_50', 'Veterano', 'Completa 50 sesiones en total', 'medal', 'progreso', '{"sesiones": 50}'),
  ('rom_full', 'Rango Completo', 'Alcanza el 100% del ROM objetivo en un ejercicio', 'move', 'rom', '{"rom_pct": 100}'),
  ('rom_80', 'Casi Allí', 'Alcanza el 80% del ROM objetivo', 'trending-up', 'rom', '{"rom_pct": 80}'),
  ('streak_3', 'En Marcha', 'Completa sesiones 3 días seguidos', 'flame', 'racha', '{"racha": 3}'),
  ('streak_7', 'Una Semana', 'Completa sesiones 7 días seguidos', 'zap', 'racha', '{"racha": 7}'),
  ('streak_30', 'Imparable', 'Completa sesiones 30 días seguidos', 'award', 'racha', '{"racha": 30}'),
  ('minutes_60', 'Una Hora', 'Acumula 60 minutos de ejercicio', 'clock', 'tiempo', '{"minutos": 60}'),
  ('minutes_300', 'Maratonista', 'Acumula 300 minutos de ejercicio', 'timer', 'tiempo', '{"minutos": 300}')
ON CONFLICT (codigo) DO NOTHING;
