export type Rol = 'fisioterapeuta' | 'paciente';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Rol;
  is_active: boolean;
  especialidad: string | null;
  universidad: string | null;
  anio_egreso: number | null;
  created_at: string;
  updated_at: string;
  cedula?: string | null;
  colegiado_id?: string | null;
  credencial_url?: string | null;
  avatar_url?: string | null;
  certificaciones?: string[] | null;
  fecha_nacimiento?: string | null;
  diagnostico?: string | null;
  onboarding_completed?: boolean | null;
  font_size?: string | null;
  clinic_name?: string | null;
  documento_identidad?: string | null;
  telefono?: string | null;
  tipo_sangre?: string | null;
  ocupacion?: string | null;
  nivel_actividad?: string | null;
  es_menor_edad?: boolean | null;
  patologia?: string | null;
  diagnostico_secundario?: string | null;
  medicamentos_actuales?: string | null;
  alergias?: string | null;
  enfermedades_cronicas?: string | null;
  lesiones_previas?: string | null;
  estatura_cm?: number | null;
  peso_kg?: number | null;
  extremidad_afectada?: string | null;
  rom_objetivo?: string | null;
  frecuencia_sesiones?: string | null;
  medico_remitente?: string | null;
  contacto_emergencia_nombre?: string | null;
  contacto_emergencia_telefono?: string | null;
  tutor_nombre?: string | null;
  tutor_telefono?: string | null;
  tutor_email?: string | null;
}

export interface Ejercicio {
  nombre: string;
  descripcion: string;
  repeticiones: number;
  series: number;
  duracion_segundos: number;
  angulo_objetivo: number;
  articulacion: 'hombro' | 'codo' | 'rodilla' | 'cadera' | 'tobillo';
  lado: 'izquierdo' | 'derecho' | 'ambos';
}

export interface ExerciseSession {
  id: string;
  ejercicio: Ejercicio;
  sets: ExerciseSet[];
  startTime: number;
  endTime?: number;
  totalReps: number;
  totalDuration: number;
  avgQuality: number;
  peakAngle: number;
  minAngle: number;
}

export interface ExerciseSet {
  number: number;
  reps: ExerciseRep[];
  startTime: number;
  endTime?: number;
}

export interface ExerciseRep {
  number: number;
  startTime: number;
  endTime: number;
  peakAngle: number;
  qualityScore: number;
  phases: RepPhase[];
}

export interface RepPhase {
  phase: 'concentric' | 'hold' | 'eccentric';
  startTime: number;
  duration: number;
  avgAngle: number;
  quality: QualityLevel;
}

export interface Rutina {
  id: string;
  paciente_id: string;
  fisioterapeuta_id: string | null;
  nombre: string;
  descripcion: string | null;
  ejercicios: Ejercicio[];
  activa: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
}

export interface SesionCompletada {
  id: string;
  paciente_id: string;
  rutina_id: string | null;
  ejercicio_nombre: string;
  duracion_segundos: number;
  repeticiones: number | null;
  metricas: Record<string, unknown> | null;
  calidad_ejecucion: number | null;
  dolor_reportado: number | null;
  notas: string | null;
  fecha: string;
}

export interface ActivationToken {
  id: string;
  token: string;
  terapeuta_id: string | null;
  paciente_id?: string | null;
  diagnostico: string | null;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface LogroDefinicion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  categoria: 'progreso' | 'rom' | 'racha' | 'tiempo';
  condicion: Record<string, number>;
  threshold?: number;
  label?: string;
  icon?: string;
}

export interface DocumentoClinico {
  id: string;
  paciente_id: string | null;
  fisioterapeuta_id: string | null;
  imagen_url: string;
  diagnostico_extraido: string | null;
  rom_objetivo: Record<string, unknown> | null;
  extremidad: string | null;
  ocr_status: string;
}

export type QualityLevel = 'excellent' | 'good' | 'needs_improvement';

export interface FormFeedback {
  type: 'correction' | 'praise' | 'warning';
  message: string;
  cue: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface MovementDataPoint {
  timestamp: number;
  angle: number;
  velocity: number;
  quality: QualityLevel;
  phase: 'starting' | 'concentric' | 'hold' | 'eccentric' | 'rest';
}
