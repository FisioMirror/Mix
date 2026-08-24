/*
# Inject 10 Demo Patients with Sessions, Stats, and Notifications

Creates 10 fictional patients, links them to the demo fisioterapeuta,
generates sessions with realistic metrics over 3 weeks, creates routines,
post-session reports, and notifications.

Key ID mapping:
- Fisio in usuarios: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11 (for rutinas/sesiones FK)
- Fisio in profiles: 06bd23ec-ba3c-4262-8fca-a14781b0b292 (for pacientes_terapeutas/notifications FK)
- Demo patient in profiles: b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22
*/

-- Insert demo patient into usuarios (not there yet)
INSERT INTO usuarios (id, email, password_hash, nombre, rol)
VALUES ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'paciente@demo.com', 'TOKEN_AUTH', 'Demo Pacien', 'paciente')
ON CONFLICT (id) DO NOTHING;

-- Extend demo token expiration
UPDATE activation_tokens SET expires_at = '2026-12-31 23:59:59+00' WHERE token = '123456';

-- Insert 10 demo patients into usuarios
INSERT INTO usuarios (id, email, password_hash, nombre, rol)
VALUES
  ('a1010001-0000-0000-0000-000000000001', 'maria.rodriguez@demo.com', 'TOKEN_AUTH', 'Maria Rodriguez', 'paciente'),
  ('a1010002-0000-0000-0000-000000000002', 'carlos.gomez@demo.com', 'TOKEN_AUTH', 'Carlos Gomez', 'paciente'),
  ('a1010003-0000-0000-0000-000000000003', 'ana.martinez@demo.com', 'TOKEN_AUTH', 'Ana Martinez', 'paciente'),
  ('a1010004-0000-0000-0000-000000000004', 'luis.fernandez@demo.com', 'TOKEN_AUTH', 'Luis Fernandez', 'paciente'),
  ('a1010005-0000-0000-0000-000000000005', 'sofia.diaz@demo.com', 'TOKEN_AUTH', 'Sofia Diaz', 'paciente'),
  ('a1010006-0000-0000-0000-000000000006', 'pedro.ramirez@demo.com', 'TOKEN_AUTH', 'Pedro Ramirez', 'paciente'),
  ('a1010007-0000-0000-0000-000000000007', 'laura.torres@demo.com', 'TOKEN_AUTH', 'Laura Torres', 'paciente'),
  ('a1010008-0000-0000-0000-000000000008', 'diego.herrera@demo.com', 'TOKEN_AUTH', 'Diego Herrera', 'paciente'),
  ('a1010009-0000-0000-0000-000000000009', 'valentina.castro@demo.com', 'TOKEN_AUTH', 'Valentina Castro', 'paciente'),
  ('a1010010-0000-0000-0000-000000000010', 'ricardo.morales@demo.com', 'TOKEN_AUTH', 'Ricardo Morales', 'paciente')
ON CONFLICT (id) DO NOTHING;

-- Insert 10 demo patients into profiles
INSERT INTO profiles (id, email, full_name, role, is_active, password_hash, diagnostico, diagnostico_secundario, extremidad_afectada, rom_objetivo, frecuencia_sesiones, fecha_nacimiento, telefono, medico_remitente)
VALUES
  ('a1010001-0000-0000-0000-000000000001', 'maria.rodriguez@demo.com', 'Maria Rodriguez', 'paciente', true, 'TOKEN_AUTH', 'Sindrome del tunel carpiano derecho', 'Tendinitis flexora', 'Mano derecha', 'Flexion 60, Extension 45', '3 sesiones/semana', '1981-03-15', '+58 412 555 0001', 'Dr. Fernandez'),
  ('a1010002-0000-0000-0000-000000000002', 'carlos.gomez@demo.com', 'Carlos Gomez', 'paciente', true, 'TOKEN_AUTH', 'Lumbalgia mecanica cronica', 'Hernia discal L5-S1', 'Lumbar', 'Flexion lumbar 80', '2 sesiones/semana', '1994-07-22', '+58 414 555 0002', 'Dr. Martinez'),
  ('a1010003-0000-0000-0000-000000000003', 'ana.martinez@demo.com', 'Ana Martinez', 'paciente', true, 'TOKEN_AUTH', 'Tendinitis del supraespinoso izquierdo', 'Bursitis subacromial', 'Hombro izquierdo', 'Abduccion 120', '3 sesiones/semana', '1998-11-08', '+58 416 555 0003', 'Dr. Lopez'),
  ('a1010004-0000-0000-0000-000000000004', 'luis.fernandez@demo.com', 'Luis Fernandez', 'paciente', true, 'TOKEN_AUTH', 'Gonartrosis bilateral', 'Condromalacia rotuliana', 'Rodilla bilateral', 'Flexion rodilla 110', '2 sesiones/semana', '1971-05-30', '+58 412 555 0004', 'Dr. Perez'),
  ('a1010005-0000-0000-0000-000000000005', 'sofia.diaz@demo.com', 'Sofia Diaz', 'paciente', true, 'TOKEN_AUTH', 'Esguince de tobillo grado II', 'Inestabilidad lateral', 'Tobillo derecho', 'Dorsiflexion 15', '3 sesiones/semana', '2007-09-12', '+58 424 555 0005', 'Dr. Hernandez'),
  ('a1010006-0000-0000-0000-000000000006', 'pedro.ramirez@demo.com', 'Pedro Ramirez', 'paciente', true, 'TOKEN_AUTH', 'Cervicalgia cronica', 'Cefalea tensional', 'Cervical', 'Rotacion cervical 60', '2 sesiones/semana', '1985-01-18', '+58 414 555 0006', 'Dr. Torres'),
  ('a1010007-0000-0000-0000-000000000007', 'laura.torres@demo.com', 'Laura Torres', 'paciente', true, 'TOKEN_AUTH', 'Epicondilitis lateral derecha', 'Tendinosis del extensor', 'Codo derecho', 'Extension muneca 45', '3 sesiones/semana', '1989-04-25', '+58 416 555 0007', 'Dr. Diaz'),
  ('a1010008-0000-0000-0000-000000000008', 'diego.herrera@demo.com', 'Diego Herrera', 'paciente', true, 'TOKEN_AUTH', 'Hernia discal L4-L5', 'Radiculopatia L5', 'Lumbar', 'Flexion lumbar 50', '2 sesiones/semana', '1976-08-14', '+58 412 555 0008', 'Dr. Sanchez'),
  ('a1010009-0000-0000-0000-000000000009', 'valentina.castro@demo.com', 'Valentina Castro', 'paciente', true, 'TOKEN_AUTH', 'Condromalacia rotuliana', 'Sindrome de dolor patelofemoral', 'Rodilla derecha', 'Flexion rodilla 130', '3 sesiones/semana', '2002-12-03', '+58 424 555 0009', 'Dr. Gonzalez'),
  ('a1010010-0000-0000-0000-000000000010', 'ricardo.morales@demo.com', 'Ricardo Morales', 'paciente', true, 'TOKEN_AUTH', 'Artrosis de cadera derecha', 'Labrum tear', 'Cadera derecha', 'Abduccion cadera 25', '2 sesiones/semana', '1966-06-20', '+58 414 555 0010', 'Dr. Rodriguez')
ON CONFLICT (id) DO NOTHING;

-- Link all 10 patients to demo fisioterapeuta (profiles FK)
INSERT INTO pacientes_terapeutas (paciente_id, terapeuta_id)
SELECT id, '06bd23ec-ba3c-4262-8fca-a14781b0b292'
FROM profiles
WHERE id IN ('a1010001-0000-0000-0000-000000000001','a1010002-0000-0000-0000-000000000002','a1010003-0000-0000-0000-000000000003','a1010004-0000-0000-0000-000000000004','a1010005-0000-0000-0000-000000000005','a1010006-0000-0000-0000-000000000006','a1010007-0000-0000-0000-000000000007','a1010008-0000-0000-0000-000000000008','a1010009-0000-0000-0000-000000000009','a1010010-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

-- Create active routines (usuarios FK for paciente_id and fisioterapeuta_id)
INSERT INTO rutinas (paciente_id, fisioterapeuta_id, nombre, descripcion, ejercicios, activa, status, fecha_inicio, fisioterapeuta_nombre)
VALUES
  ('a1010001-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Tunel Carpiano', 'Ejercicios de movilidad y fortalecimiento', '[{"nombre":"Flexion de muneca","series":3,"repeticiones":15}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio'),
  ('a1010002-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Lumbalgia', 'Estabilizacion lumbar', '[{"nombre":"Pelvic tilt","series":3,"repeticiones":12}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio'),
  ('a1010003-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Hombro', 'Fortalecimiento del manguito rotador', '[{"nombre":"Pendular","series":3,"repeticiones":15}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio'),
  ('a1010004-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Rodilla', 'Fortalecimiento cuadriceps', '[{"nombre":"Sentadilla parcial","series":3,"repeticiones":12}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio'),
  ('a1010005-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Tobillo', 'Propriocepcion y estabilidad', '[{"nombre":"Circunduccion","series":3,"repeticiones":15}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio'),
  ('a1010006-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Cervical', 'Movilidad cervical', '[{"nombre":"Rotacion cervical","series":3,"repeticiones":10}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio'),
  ('a1010007-0000-0000-0000-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Codo', 'Fortalecimiento epicondileos', '[{"nombre":"Extension de muneca","series":3,"repeticiones":15}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio'),
  ('a1010008-0000-0000-0000-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Hernia L4-L5', 'Estabilizacion core', '[{"nombre":"Cat-camel","series":3,"repeticiones":12}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio'),
  ('a1010009-0000-0000-0000-000000000009', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Rotuliana', 'Fortalecimiento VMO', '[{"nombre":"Mini-squat","series":3,"repeticiones":15}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio'),
  ('a1010010-0000-0000-0000-000000000010', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Cadera', 'Movilidad y fortalecimiento gluteo', '[{"nombre":"Puente gluteo","series":3,"repeticiones":15}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rutina Demo Paciente', 'Rutina de rehabilitacion de hombro', '[{"nombre":"Elevacion de hombro","series":3,"repeticiones":12}]'::jsonb, true, 'activa', '2026-07-15', 'Dra. Demo Fisio')
ON CONFLICT DO NOTHING;

-- Sessions for all 10 patients + demo patient (usuarios FK for paciente_id)
INSERT INTO sesiones_completadas (paciente_id, ejercicio_nombre, duracion_segundos, repeticiones, calidad_ejecucion, calidad_promedio, ejercicios, adherencia, dolor_reportado, fecha) VALUES
  ('a1010001-0000-0000-0000-000000000001', 'Flexion de muneca', 360, 15, 72, 72, '[{"nombre":"Flexion de muneca","series":3,"repeticiones":15}]'::jsonb, 85, 6, '2026-07-15 10:00:00+00'),
  ('a1010001-0000-0000-0000-000000000001', 'Extension de muneca', 420, 15, 75, 75, '[{"nombre":"Extension de muneca","series":3,"repeticiones":15}]'::jsonb, 88, 5, '2026-07-17 10:00:00+00'),
  ('a1010001-0000-0000-0000-000000000001', 'Desviacion radial', 300, 12, 78, 78, '[{"nombre":"Desviacion radial","series":2,"repeticiones":12}]'::jsonb, 90, 4, '2026-07-19 10:00:00+00'),
  ('a1010001-0000-0000-0000-000000000001', 'Flexion de muneca', 360, 15, 82, 82, '[{"nombre":"Flexion de muneca","series":3,"repeticiones":15}]'::jsonb, 92, 3, '2026-07-22 10:00:00+00'),
  ('a1010001-0000-0000-0000-000000000001', 'Rutina completa', 540, 15, 85, 85, '[{"nombre":"Flexion","series":3,"repeticiones":15}]'::jsonb, 95, 2, '2026-07-25 10:00:00+00'),
  ('a1010002-0000-0000-0000-000000000002', 'Pelvic tilt', 300, 12, 68, 68, '[{"nombre":"Pelvic tilt","series":3,"repeticiones":12}]'::jsonb, 75, 7, '2026-07-16 09:00:00+00'),
  ('a1010002-0000-0000-0000-000000000002', 'Bird-dog', 420, 10, 70, 70, '[{"nombre":"Bird-dog","series":3,"repeticiones":10}]'::jsonb, 78, 6, '2026-07-19 09:00:00+00'),
  ('a1010002-0000-0000-0000-000000000002', 'Puente gluteo', 360, 15, 74, 74, '[{"nombre":"Puente gluteo","series":3,"repeticiones":15}]'::jsonb, 80, 5, '2026-07-23 09:00:00+00'),
  ('a1010002-0000-0000-0000-000000000002', 'Rutina lumbar', 600, 12, 77, 77, '[{"nombre":"Pelvic tilt","series":3,"repeticiones":12}]'::jsonb, 82, 4, '2026-07-26 09:00:00+00'),
  ('a1010003-0000-0000-0000-000000000003', 'Pendular', 300, 15, 80, 80, '[{"nombre":"Pendular","series":3,"repeticiones":15}]'::jsonb, 88, 5, '2026-07-15 14:00:00+00'),
  ('a1010003-0000-0000-0000-000000000003', 'Rotacion externa', 360, 12, 82, 82, '[{"nombre":"Rotacion externa","series":3,"repeticiones":12}]'::jsonb, 90, 4, '2026-07-18 14:00:00+00'),
  ('a1010003-0000-0000-0000-000000000003', 'Elevacion escapular', 420, 10, 84, 84, '[{"nombre":"Elevacion escapular","series":2,"repeticiones":10}]'::jsonb, 92, 3, '2026-07-21 14:00:00+00'),
  ('a1010003-0000-0000-0000-000000000003', 'Pendular', 300, 15, 86, 86, '[{"nombre":"Pendular","series":3,"repeticiones":15}]'::jsonb, 93, 3, '2026-07-24 14:00:00+00'),
  ('a1010003-0000-0000-0000-000000000003', 'Rutina hombro', 540, 12, 88, 88, '[{"nombre":"Pendular","series":3,"repeticiones":15}]'::jsonb, 95, 2, '2026-07-27 14:00:00+00'),
  ('a1010004-0000-0000-0000-000000000004', 'Sentadilla parcial', 360, 12, 65, 65, '[{"nombre":"Sentadilla parcial","series":3,"repeticiones":12}]'::jsonb, 70, 8, '2026-07-16 11:00:00+00'),
  ('a1010004-0000-0000-0000-000000000004', 'Extension de rodilla', 420, 15, 68, 68, '[{"nombre":"Extension de rodilla","series":3,"repeticiones":15}]'::jsonb, 72, 7, '2026-07-20 11:00:00+00'),
  ('a1010004-0000-0000-0000-000000000004', 'Step-up', 300, 10, 71, 71, '[{"nombre":"Step-up","series":2,"repeticiones":10}]'::jsonb, 75, 6, '2026-07-24 11:00:00+00'),
  ('a1010004-0000-0000-0000-000000000004', 'Rutina rodilla', 540, 12, 74, 74, '[{"nombre":"Sentadilla","series":3,"repeticiones":12}]'::jsonb, 78, 5, '2026-07-27 11:00:00+00'),
  ('a1010005-0000-0000-0000-000000000005', 'Circunduccion', 300, 15, 78, 78, '[{"nombre":"Circunduccion","series":3,"repeticiones":15}]'::jsonb, 85, 7, '2026-07-15 16:00:00+00'),
  ('a1010005-0000-0000-0000-000000000005', 'Elevacion de talones', 240, 20, 80, 80, '[{"nombre":"Elevacion de talones","series":3,"repeticiones":20}]'::jsonb, 88, 6, '2026-07-17 16:00:00+00'),
  ('a1010005-0000-0000-0000-000000000005', 'Balanceo unilateral', 360, 10, 82, 82, '[{"nombre":"Balanceo unilateral","series":3,"repeticiones":10}]'::jsonb, 90, 5, '2026-07-19 16:00:00+00'),
  ('a1010005-0000-0000-0000-000000000005', 'Circunduccion', 300, 15, 84, 84, '[{"nombre":"Circunduccion","series":3,"repeticiones":15}]'::jsonb, 92, 4, '2026-07-22 16:00:00+00'),
  ('a1010005-0000-0000-0000-000000000005', 'Elevacion de talones', 240, 20, 86, 86, '[{"nombre":"Elevacion de talones","series":3,"repeticiones":20}]'::jsonb, 93, 3, '2026-07-25 16:00:00+00'),
  ('a1010005-0000-0000-0000-000000000005', 'Rutina tobillo', 480, 15, 88, 88, '[{"nombre":"Circunduccion","series":3,"repeticiones":15}]'::jsonb, 95, 2, '2026-07-28 16:00:00+00'),
  ('a1010006-0000-0000-0000-000000000006', 'Rotacion cervical', 240, 10, 75, 75, '[{"nombre":"Rotacion cervical","series":3,"repeticiones":10}]'::jsonb, 80, 6, '2026-07-16 08:00:00+00'),
  ('a1010006-0000-0000-0000-000000000006', 'Flexion lateral', 300, 10, 78, 78, '[{"nombre":"Flexion lateral","series":3,"repeticiones":10}]'::jsonb, 83, 5, '2026-07-20 08:00:00+00'),
  ('a1010006-0000-0000-0000-000000000006', 'Isometrico cervical', 360, 8, 80, 80, '[{"nombre":"Isometrico cervical","series":3,"repeticiones":8}]'::jsonb, 85, 4, '2026-07-24 08:00:00+00'),
  ('a1010006-0000-0000-0000-000000000006', 'Rutina cervical', 480, 10, 82, 82, '[{"nombre":"Rotacion","series":3,"repeticiones":10}]'::jsonb, 88, 3, '2026-07-27 08:00:00+00'),
  ('a1010007-0000-0000-0000-000000000007', 'Extension de muneca', 360, 15, 76, 76, '[{"nombre":"Extension de muneca","series":3,"repeticiones":15}]'::jsonb, 82, 6, '2026-07-15 13:00:00+00'),
  ('a1010007-0000-0000-0000-000000000007', 'Pronosupinacion', 300, 12, 78, 78, '[{"nombre":"Pronosupinacion","series":3,"repeticiones":12}]'::jsonb, 85, 5, '2026-07-18 13:00:00+00'),
  ('a1010007-0000-0000-0000-000000000007', 'Eccentric wrist extension', 420, 10, 80, 80, '[{"nombre":"Eccentric wrist extension","series":2,"repeticiones":10}]'::jsonb, 88, 4, '2026-07-22 13:00:00+00'),
  ('a1010007-0000-0000-0000-000000000007', 'Extension de muneca', 360, 15, 83, 83, '[{"nombre":"Extension de muneca","series":3,"repeticiones":15}]'::jsonb, 90, 3, '2026-07-25 13:00:00+00'),
  ('a1010007-0000-0000-0000-000000000007', 'Rutina codo', 540, 12, 85, 85, '[{"nombre":"Extension","series":3,"repeticiones":15}]'::jsonb, 93, 2, '2026-07-28 13:00:00+00'),
  ('a1010008-0000-0000-0000-000000000008', 'Cat-camel', 300, 12, 70, 70, '[{"nombre":"Cat-camel","series":3,"repeticiones":12}]'::jsonb, 72, 8, '2026-07-16 15:00:00+00'),
  ('a1010008-0000-0000-0000-000000000008', 'Bird-dog', 360, 10, 73, 73, '[{"nombre":"Bird-dog","series":3,"repeticiones":10}]'::jsonb, 75, 7, '2026-07-20 15:00:00+00'),
  ('a1010008-0000-0000-0000-000000000008', 'Dead bug', 420, 10, 75, 75, '[{"nombre":"Dead bug","series":3,"repeticiones":10}]'::jsonb, 78, 6, '2026-07-24 15:00:00+00'),
  ('a1010008-0000-0000-0000-000000000008', 'Rutina core', 540, 12, 78, 78, '[{"nombre":"Cat-camel","series":3,"repeticiones":12}]'::jsonb, 82, 5, '2026-07-27 15:00:00+00'),
  ('a1010009-0000-0000-0000-000000000009', 'Mini-squat', 360, 15, 82, 82, '[{"nombre":"Mini-squat","series":3,"repeticiones":15}]'::jsonb, 88, 5, '2026-07-15 17:00:00+00'),
  ('a1010009-0000-0000-0000-000000000009', 'Extension terminal', 300, 12, 84, 84, '[{"nombre":"Extension terminal","series":3,"repeticiones":12}]'::jsonb, 90, 4, '2026-07-18 17:00:00+00'),
  ('a1010009-0000-0000-0000-000000000009', 'Wall slide', 240, 10, 85, 85, '[{"nombre":"Wall slide","series":3,"repeticiones":10}]'::jsonb, 92, 3, '2026-07-22 17:00:00+00'),
  ('a1010009-0000-0000-0000-000000000009', 'Mini-squat', 360, 15, 87, 87, '[{"nombre":"Mini-squat","series":3,"repeticiones":15}]'::jsonb, 93, 3, '2026-07-25 17:00:00+00'),
  ('a1010009-0000-0000-0000-000000000009', 'Rutina rotuliana', 480, 12, 89, 89, '[{"nombre":"Mini-squat","series":3,"repeticiones":15}]'::jsonb, 95, 2, '2026-07-28 17:00:00+00'),
  ('a1010010-0000-0000-0000-000000000010', 'Puente gluteo', 300, 15, 67, 67, '[{"nombre":"Puente gluteo","series":3,"repeticiones":15}]'::jsonb, 70, 7, '2026-07-16 12:00:00+00'),
  ('a1010010-0000-0000-0000-000000000010', 'Abduccion lateral', 360, 12, 70, 70, '[{"nombre":"Abduccion lateral","series":3,"repeticiones":12}]'::jsonb, 73, 6, '2026-07-20 12:00:00+00'),
  ('a1010010-0000-0000-0000-000000000010', 'Clamshell', 300, 15, 73, 73, '[{"nombre":"Clamshell","series":3,"repeticiones":15}]'::jsonb, 76, 5, '2026-07-24 12:00:00+00'),
  ('a1010010-0000-0000-0000-000000000010', 'Rutina cadera', 480, 12, 76, 76, '[{"nombre":"Puente gluteo","series":3,"repeticiones":15}]'::jsonb, 80, 4, '2026-07-27 12:00:00+00'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'Elevacion de hombro', 300, 12, 75, 75, '[{"nombre":"Elevacion de hombro","series":3,"repeticiones":12}]'::jsonb, 82, 5, '2026-07-20 10:00:00+00'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'Rotacion externa', 360, 12, 78, 78, '[{"nombre":"Rotacion externa","series":3,"repeticiones":12}]'::jsonb, 85, 4, '2026-07-23 10:00:00+00'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'Rutina completa', 480, 15, 82, 82, '[{"nombre":"Elevacion","series":3,"repeticiones":12}]'::jsonb, 90, 3, '2026-07-26 10:00:00+00');

-- Post-session reports (profiles FK for paciente_id)
INSERT INTO post_session_reports (paciente_id, sesion_id, dolor_antes, dolor_despues, fatiga_nivel, comentario, fecha)
SELECT s.paciente_id, s.id,
  COALESCE(s.dolor_reportado, 5) + 2,
  s.dolor_reportado,
  CASE WHEN s.calidad_ejecucion > 80 THEN 2 WHEN s.calidad_ejecucion > 70 THEN 3 ELSE 4 END,
  'Sesion completada con buena disposicion',
  s.fecha
FROM sesiones_completadas s
WHERE s.paciente_id IN ('a1010001-0000-0000-0000-000000000001','a1010002-0000-0000-0000-000000000002','a1010003-0000-0000-0000-000000000003','b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22')
AND s.fecha IS NOT NULL
ON CONFLICT DO NOTHING;

-- Notifications for the demo fisioterapeuta (profiles FK for user_id)
INSERT INTO notifications (user_id, type, title, message, link, read, created_at)
VALUES
  ('06bd23ec-ba3c-4262-8fca-a14781b0b292', 'sesion', 'Sesion completada', 'Paciente Maria Rodriguez completo su sesion de hoy', NULL, false, NOW() - INTERVAL '2 hours'),
  ('06bd23ec-ba3c-4262-8fca-a14781b0b292', 'sistema', 'Baja adherencia', 'Paciente Carlos Gomez tiene baja adherencia esta semana (40%)', NULL, false, NOW() - INTERVAL '5 hours'),
  ('06bd23ec-ba3c-4262-8fca-a14781b0b292', 'rutina', 'Actualizacion pendiente', 'Nueva actualizacion de diagnostico pendiente para Ana Martinez', NULL, false, NOW() - INTERVAL '8 hours'),
  ('06bd23ec-ba3c-4262-8fca-a14781b0b292', 'sistema', 'Recordatorio de sesion', 'Recordatorio: Sesion programada con Luis Fernandez manana a las 10:00 AM', NULL, false, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;
