import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { GlassPanel } from '../components/ui/Glass';
import { GlassModal } from '../components/ui/GlassModal';
import { SkeletonCard } from '../components/ui/Skeleton';
import { MedicalIcon } from '../components/ui/MedicalIcon';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { ExerciseImage } from '../components/ui/ExerciseImage';
import { getExerciseImage } from '../data/exerciseImages';
import { SkeletonDemo } from '../components/rehabilitation/SkeletonDemo';
import { buildExerciseDefinition, getExerciseDescription } from '../data/exercisePresets';
import { saveExercises, getExercises } from '../lib/offlineDB';
import { buildGoogleCalendarUrl, buildIcsFileContent, type CalendarExercise } from '../lib/calendarExport';

interface AssignedExercise {
  id: string;
  ejercicio_nombre: string | null;
  ejercicio_id: string | null;
  ejercicio_detailed_description: string | null;
  series: number | null;
  repeticiones: number | null;
  frecuencia_semana: number | null;
  notas: string | null;
  activo: boolean | null;
  fecha_asignacion: string | null;
}

export function PatientExercisesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [exercises, setExercises] = useState<AssignedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [descriptionExercise, setDescriptionExercise] = useState<AssignedExercise | null>(null);

  useEffect(() => {
    loadExercises();
  }, [user?.id]);

  const loadExercises = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(false);
      const { data, error } = await supabase
        .from('patient_exercises')
        .select('id, ejercicio_nombre, ejercicio_id, series, repeticiones, frecuencia_semana, notas, activo, fecha_asignacion, ejercicio:exercises(detailed_description)')
        .eq('paciente_id', user.id)
        .eq('activo', true)
        .order('fecha_asignacion', { ascending: false });

      if (error) throw error;
      const normalized = (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        ejercicio_detailed_description: (row.ejercicio as Record<string, unknown> | null)?.detailed_description ?? null,
      }));
      setExercises(normalized as AssignedExercise[]);
      setIsOffline(false);
      saveExercises(normalized as unknown as Record<string, unknown>[]);
    } catch {
      const cached = await getExercises<AssignedExercise>();
      if (cached.length > 0) {
        setExercises(cached);
        setIsOffline(true);
      } else {
        setError(true);
        toast.error('Error cargando tu rutina');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div>
        <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-editorial">Mi Rutina de Ejercicios</h1>
        <p className="text-on-surface-variant font-body-lg">
          Estos son los ejercicios que tu fisioterapeuta ha asignado para tu recuperación.
        </p>
        {isOffline && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Icon name="cloud_off" size={18} className="text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">Modo sin conexión — mostrando rutina guardada</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="empty-state-premium glass-panel rounded-3xl p-8">
          <MedicalIcon name="activity" size={56} className="text-error/60 mb-4" />
          <p className="text-on-surface-variant font-body-lg mb-4">
            No pudimos cargar tu rutina. Verifica tu conexión e inténtalo nuevamente.
          </p>
          <button
            onClick={loadExercises}
            className="premium-btn px-6 py-3 bg-primary text-on-primary rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
          >
            <Icon name="refresh" size={20} /> Reintentar
          </button>
        </div>
      ) : exercises.length === 0 ? (
        <div className="empty-state-premium glass-panel rounded-3xl p-12">
          <div className="empty-icon">
            <MedicalIcon name="exercise" size={32} />
          </div>
          <h3 className="font-title-lg text-title-lg text-primary mb-2">
            Aún no tienes ejercicios asignados
          </h3>
          <p className="text-on-surface-variant max-w-md">
            Tu fisioterapeuta aún no ha configurado tu rutina de ejercicios. 
            Una vez que asigne tu plan de rehabilitación, lo verás aquí con todas 
            las instrucciones necesarias para tu recuperación.
          </p>
          <p className="text-on-surface-variant text-sm mt-4">
            ¿Ya hablaste con tu fisioterapeuta? Puedes contactarlo para acelerar el proceso.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => {
                const calExercises: CalendarExercise[] = exercises.map((ex) => ({
                  nombre: ex.ejercicio_nombre || 'Ejercicio',
                  series: ex.series,
                  repeticiones: ex.repeticiones,
                  frecuencia_semana: ex.frecuencia_semana,
                }));
                const url = buildGoogleCalendarUrl(calExercises, user?.full_name || 'Paciente');
                if (url) window.open(url, '_blank');
                else toast.info('No hay ejercicios para exportar');
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-all text-sm font-bold"
            >
              <Icon name="event" size={18} /> Google Calendar
            </button>
            <button
              onClick={() => {
                const calExercises: CalendarExercise[] = exercises.map((ex) => ({
                  nombre: ex.ejercicio_nombre || 'Ejercicio',
                  series: ex.series,
                  repeticiones: ex.repeticiones,
                  frecuencia_semana: ex.frecuencia_semana,
                }));
                const ics = buildIcsFileContent(calExercises, user?.full_name || 'Paciente');
                if (!ics) { toast.info('No hay ejercicios para exportar'); return; }
                const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'rutina-fisiomirror.ics';
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Archivo de calendario descargado');
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-all text-sm font-bold"
            >
              <Icon name="download" size={18} /> Descargar .ics
            </button>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exercises.map((ex, i) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassPanel className="p-6 rounded-3xl card-glow-hover group">
                <ExerciseImage src={getExerciseImage(ex.ejercicio_id)} name={ex.ejercicio_nombre || 'Ejercicio asignado'} />
                {ex.notas && (
                  <p className="text-sm text-on-surface-variant -mt-2 mb-4 line-clamp-2">{ex.notas}</p>
                )}

                <div className="grid grid-cols-3 gap-2 py-4 border-y border-outline-variant/10">
                  <div>
                    <p className="text-[10px] uppercase text-outline font-bold">Series</p>
                    <span className="font-bold text-lg">{ex.series ?? '-'}</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-outline font-bold">Repet.</p>
                    <span className="font-bold text-lg">{ex.repeticiones ?? '-'}</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-outline font-bold">Frec.</p>
                    <span className="font-bold text-lg">{ex.frecuencia_semana ?? '-'}x/sem</span>
                  </div>
                </div>

                <button
                  onClick={() => setDescriptionExercise(ex)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-surface-variant/20 text-on-surface-variant font-bold text-sm hover:bg-surface-variant/40 transition-all flex items-center justify-center gap-1.5"
                >
                  <Icon name="menu_book" size={16} /> Ver descripción
                </button>

                <button
                  onClick={() =>
                    navigate(`/ar-mirror?ejercicio=${encodeURIComponent(ex.ejercicio_nombre || 'Ejercicio')}`)
                  }
                  className="premium-btn w-full mt-2 py-3 bg-primary text-on-primary rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  aria-label={`Iniciar sesión de ${ex.ejercicio_nombre || 'ejercicio'}`}
                >
                  <Icon name="play_arrow" size={20} /> Iniciar Sesión AR
                </button>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
        </div>
      )}

      {/* Description modal */}
      <GlassModal isOpen={!!descriptionExercise} onClose={() => setDescriptionExercise(null)} size="lg">
        {descriptionExercise && (
          <div className="space-y-4">
            <h3 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living pr-8">
              {descriptionExercise.ejercicio_nombre || 'Ejercicio asignado'}
            </h3>
            <ExerciseImage src={getExerciseImage(descriptionExercise.ejercicio_id)} name={descriptionExercise.ejercicio_nombre || 'Ejercicio asignado'} heightClass="h-44" />
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-2">Descripción detallada</p>
              {descriptionExercise.ejercicio_detailed_description ? (
                <p className="text-on-surface font-body-lg whitespace-pre-wrap leading-relaxed">
                  {descriptionExercise.ejercicio_detailed_description}
                </p>
              ) : (
                <p className="text-on-surface font-body-lg whitespace-pre-wrap leading-relaxed">
                  {getExerciseDescription(descriptionExercise.ejercicio_nombre || '')}
                </p>
              )}
            </div>

            {/* Skeleton Demo */}
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-2">Demostración con esqueleto articulado</p>
              <div className="flex justify-center">
                <SkeletonDemo
                  exercise={buildExerciseDefinition(
                    descriptionExercise.ejercicio_id || descriptionExercise.id,
                    descriptionExercise.ejercicio_nombre || 'Ejercicio',
                    descriptionExercise.series ?? 3,
                    descriptionExercise.repeticiones ?? 10,
                    undefined, undefined, undefined,
                    descriptionExercise.ejercicio_detailed_description
                  )}
                  userRole="patient"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setDescriptionExercise(null)} className="premium-btn px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold hover:scale-[1.02] active:scale-95 transition-all">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
}
