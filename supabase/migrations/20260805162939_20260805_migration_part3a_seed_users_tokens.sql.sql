-- ============================================================
-- MIGRATION PART 3A: SEED DATA — Using existing UUIDs from new project
-- Demo fisio UUID: fdf7cc26-59e3-413b-9e3a-43e54976a8e0
-- ============================================================

-- Update demo fisio password hash to match the expected hash
UPDATE profiles SET
  password_hash = encode(extensions.digest('demo1234fisiomirror-salt-2024', 'sha256'), 'hex'),
  especialidad = COALESCE(especialidad, 'Traumatología'),
  universidad = COALESCE(universidad, 'Universidad Nacional'),
  is_active = true
WHERE email = 'fisio@demo.com';

-- Demo fisioterapeuta in usuarios (for old auth system)
INSERT INTO usuarios (id, email, password_hash, nombre, rol)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'fisio@demo.com',
  encode(extensions.digest('demo1234' || 'fisiomirror-salt-2024', 'sha256'), 'hex'),
  'Dra. Demo Fisio',
  'fisioterapeuta'
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, nombre = EXCLUDED.nombre;

-- Demo fisioterapeuta in perfiles_simples
INSERT INTO perfiles_simples (id, email, nombre)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'fisio@demo.com', 'Dra. Demo Fisio')
ON CONFLICT (id) DO NOTHING;

-- Demo fisioterapeuta in fisioterapeutas_simple
INSERT INTO fisioterapeutas_simple (id, colegiado_id, especialidad_tipo, universidad_egreso, anio_egreso, certificaciones_adicionales)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'COL-12345', 'Traumatología', 'Universidad Nacional', 2015, ARRAY['McKenzie Method', 'Dry Needling'])
ON CONFLICT (id) DO NOTHING;

-- Test activation token TEST1234
INSERT INTO tokens_activacion (token, created_by, fisioterapeuta_id, paciente_email, expires_at)
VALUES ('TEST1234', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'paciente@demo.com', now() + interval '30 days')
ON CONFLICT (token) DO NOTHING;

-- Achievement definitions
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

-- Delete any leftover admin profile
DELETE FROM profiles WHERE email = 'admin@gmail.com' AND role = 'admin';

-- Seed demo patient profile (if not exists)
INSERT INTO profiles (email, full_name, role, is_active, password_hash)
VALUES ('paciente@demo.com', 'Demo Pacien', 'paciente', true, 'token-only-login-no-password')
ON CONFLICT DO NOTHING;

-- Seed permanent reusable token 123456 linked to demo fisio and demo patient
INSERT INTO activation_tokens (token, terapeuta_id, paciente_id, diagnostico, is_used, expires_at)
SELECT '123456',
  'fdf7cc26-59e3-413b-9e3a-43e54976a8e0',
  p.id,
  'Cuenta demo de paciente',
  false,
  '2099-12-31T23:59:59Z'
FROM profiles p
WHERE p.email = 'paciente@demo.com'
  AND NOT EXISTS (SELECT 1 FROM activation_tokens WHERE token = '123456');

-- Link token 123456 to demo patient
UPDATE activation_tokens
SET paciente_id = (SELECT id FROM profiles WHERE email = 'paciente@demo.com'),
    is_used = false,
    terapeuta_id = 'fdf7cc26-59e3-413b-9e3a-43e54976a8e0'
WHERE token = '123456';

-- Link demo patient to demo fisioterapeuta
INSERT INTO pacientes_terapeutas (paciente_id, terapeuta_id)
SELECT p.id, 'fdf7cc26-59e3-413b-9e3a-43e54976a8e0'
FROM profiles p
WHERE p.email = 'paciente@demo.com'
  AND NOT EXISTS (SELECT 1 FROM pacientes_terapeutas pt WHERE pt.paciente_id = p.id AND pt.terapeuta_id = 'fdf7cc26-59e3-413b-9e3a-43e54976a8e0');

-- Seed 12 default exercises (linked to existing fisio profile)
INSERT INTO exercises (fisio_id, nombre, descripcion, categoria, articulacion, grupo_muscular, series, repeticiones, duracion_segundos, angulo_objetivo, fase_recuperacion, lado)
SELECT 'fdf7cc26-59e3-413b-9e3a-43e54976a8e0', * FROM (VALUES
  ('Flexión de Hombro', 'Eleva el brazo hacia adelante hasta alcanzar la altura del hombro. Mantén 2 segundos y baja lentamente.', 'fortalecimiento', 'hombro', 'Hombro', 3, 12, 60, 90, 'inicial', 'bilateral'),
  ('Abducción de Hombro', 'Abre el brazo hacia el lado hasta 90 grados. Controla el descenso.', 'fortalecimiento', 'hombro', 'Hombro', 3, 10, 60, 90, 'intermedia', 'bilateral'),
  ('Rotación Externa de Hombro', 'Con el codo a 90 grados, rota el brazo hacia afuera manteniendo el codo pegado al cuerpo.', 'movilidad', 'hombro', 'Hombro', 3, 15, 45, 45, 'inicial', 'derecho'),
  ('Extensión de Rodilla', 'Desde sentado, extiende la rodilla completamente y mantén 5 segundos.', 'fortalecimiento', 'rodilla', 'Rodilla', 4, 12, 60, 0, 'intermedia', 'bilateral'),
  ('Flexión de Rodilla en Pie', 'De pie, flexiona la rodilla llevando el talón hacia el glúteo. Baja lentamente.', 'fortalecimiento', 'rodilla', 'Piernas', 3, 12, 60, 120, 'intermedia', 'derecho'),
  ('Sentadilla Parcial', 'Baja como si te sentaras, hasta 45 grados de flexión de rodilla. Mantén la espalda recta.', 'funcional', 'rodilla', 'Piernas', 3, 10, 90, 45, 'avanzada', 'bilateral'),
  ('Movilidad Cervical', 'Gira la cabeza lentamente de un lado al otro. Mantén cada posición 3 segundos.', 'movilidad', 'cervical', 'Cuello', 2, 10, 30, 60, 'inicial', 'bilateral'),
  ('Estiramiento de Trapecio', 'Inclina la cabeza hacia un hombro, mantén 15 segundos. Repite al otro lado.', 'estiramiento', 'cervical', 'Cuello', 2, 8, 30, 45, 'inicial', 'bilateral'),
  ('Flexión de Codo', 'Con pesa ligera, flexiona el codo completamente y extiende controlando el descenso.', 'fortalecimiento', 'codo', 'Brazos', 3, 12, 60, 150, 'inicial', 'derecho'),
  ('Circunducción de Hombro', 'Realiza círculos completos con el brazo extendido, 5 en cada dirección.', 'movilidad', 'hombro', 'Hombro', 2, 10, 45, 360, 'mantenimiento', 'bilateral'),
  ('Puente de Glúteos', 'Acostado boca arriba, eleva la cadera contrayendo glúteos. Mantén 3 segundos.', 'fortalecimiento', 'cadera', 'Piernas', 3, 15, 60, 0, 'intermedia', 'bilateral'),
  ('Equilibrio sobre una Pierna', 'Mantén el equilibrio sobre una pierna durante 30 segundos. Apoya la mano si es necesario.', 'propiocepcion', 'tobillo', 'Piernas', 3, 5, 30, 0, 'avanzada', 'derecho')
) AS t(nombre, descripcion, categoria, articulacion, grupo_muscular, series, repeticiones, duracion_segundos, angulo_objetivo, fase_recuperacion, lado)
WHERE NOT EXISTS (SELECT 1 FROM exercises LIMIT 1);

-- Demo patient in usuarios
INSERT INTO usuarios (id, email, password_hash, nombre, rol)
VALUES ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'paciente@demo.com', 'TOKEN_AUTH', 'Demo Pacien', 'paciente')
ON CONFLICT (id) DO NOTHING;

-- Extend demo token expiration
UPDATE activation_tokens SET expires_at = '2026-12-31 23:59:59+00' WHERE token = '123456';