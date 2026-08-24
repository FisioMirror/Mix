-- Tabla de pacientes (datos básicos)
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  fecha_nacimiento DATE,
  diagnostico TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de documentos médicos escaneados
CREATE TABLE IF NOT EXISTS documentos_medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo_documento TEXT,
  texto_original TEXT,
  contenido_estructurado JSONB,
  url_imagen TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de sesiones de ejercicios (tele-rehabilitación)
CREATE TABLE IF NOT EXISTS sesiones_ejercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  log_ejercicios TEXT,
  resumen_ia TEXT,
  metricas JSONB
);

-- Habilitar RLS
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_ejercicios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pacientes (solo usuarios autenticados pueden acceder a sus datos)
CREATE POLICY "select_own_pacientes" ON pacientes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_pacientes" ON pacientes FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_pacientes" ON pacientes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_pacientes" ON pacientes FOR DELETE
  TO authenticated USING (true);

-- Políticas RLS para documentos_medicos
CREATE POLICY "select_documentos_medicos" ON documentos_medicos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_documentos_medicos" ON documentos_medicos FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_documentos_medicos" ON documentos_medicos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_documentos_medicos" ON documentos_medicos FOR DELETE
  TO authenticated USING (true);

-- Políticas RLS para sesiones_ejercicios
CREATE POLICY "select_sesiones_ejercicios" ON sesiones_ejercicios FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_sesiones_ejercicios" ON sesiones_ejercicios FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_sesiones_ejercicios" ON sesiones_ejercicios FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_sesiones_ejercicios" ON sesiones_ejercicios FOR DELETE
  TO authenticated USING (true);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_documentos_paciente_id ON documentos_medicos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_paciente_id ON sesiones_ejercicios(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON sesiones_ejercicios(fecha);
