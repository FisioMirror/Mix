import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useToast } from './ui/ToastProvider';
import { Icon } from './ui/Icon';

import { Spinner } from './ui/Loader';
import { cn } from '../lib/utils';


/**
 * Biblioteca de ejercicios disponibles para asignar.
 * Cada entrada describe un ejercicio reutilizable con su articulación principal
 * y un rango de series/repeticiones por defecto razonable.
 */
interface ExerciseLibraryItem {
  id: string;
  nombre: string;
  articulacion: 'hombro' | 'codo' | 'rodilla' | 'cadera' | 'tobillo' | 'cervical';
  descripcion: string;
  seriesDefault: number;
  repsDefault: number;
  lado: 'bilateral' | 'derecho' | 'izquierdo';
}

const EXERCISE_LIBRARY: ExerciseLibraryItem[] = [
  { id: 'flx-hombro', nombre: 'Flexión de hombro', articulacion: 'hombro', seriesDefault: 3, repsDefault: 12, lado: 'bilateral', descripcion: 'Elevación del brazo hacia adelante hasta 120°.' },
  { id: 'abd-hombro', nombre: 'Abducción de hombro', articulacion: 'hombro', seriesDefault: 3, repsDefault: 12, lado: 'bilateral', descripcion: 'Apertura del brazo hacia el lado hasta 90°.' },
  { id: 'rot-ext-hombro', nombre: 'Rotación externa de hombro', articulacion: 'hombro', seriesDefault: 3, repsDefault: 15, lado: 'bilateral', descripcion: 'Rotación externa con codo fijo a 90°.' },
  { id: 'circ-hombro', nombre: 'Circunducción de hombro', articulacion: 'hombro', seriesDefault: 2, repsDefault: 10, lado: 'bilateral', descripcion: 'Círculos completos del brazo con codo extendido.' },
  { id: 'flx-codo', nombre: 'Flexión de codo', articulacion: 'codo', seriesDefault: 3, repsDefault: 12, lado: 'bilateral', descripcion: 'Curl de bíceps llevando la mano al hombro.' },
  { id: 'ext-rodilla', nombre: 'Extensión de rodilla', articulacion: 'rodilla', seriesDefault: 3, repsDefault: 10, lado: 'bilateral', descripcion: 'Extensión completa de rodilla sentado.' },
  { id: 'flx-rodilla-pie', nombre: 'Flexión de rodilla en pie', articulacion: 'rodilla', seriesDefault: 3, repsDefault: 12, lado: 'bilateral', descripcion: 'Lleva el talón al glúteo de pie.' },
  { id: 'sentadilla', nombre: 'Sentadilla parcial', articulacion: 'rodilla', seriesDefault: 3, repsDefault: 10, lado: 'bilateral', descripcion: 'Sentadilla a 45° de flexión de rodilla.' },
  { id: 'puente', nombre: 'Puente de glúteos', articulacion: 'cadera', seriesDefault: 3, repsDefault: 12, lado: 'bilateral', descripcion: 'Elevación de cadera desde supino.' },
  { id: 'abd-cadera', nombre: 'Abducción de cadera', articulacion: 'cadera', seriesDefault: 3, repsDefault: 12, lado: 'bilateral', descripcion: 'Separa la pierna hacia el lado con control.' },
  { id: 'dorsiflex-tobillo', nombre: 'Movilidad de tobillo', articulacion: 'tobillo', seriesDefault: 3, repsDefault: 15, lado: 'bilateral', descripcion: 'Dorsiflexión y flexión plantar alternantes.' },
  { id: 'trap-estiramiento', nombre: 'Estiramiento de trapecio', articulacion: 'cervical', seriesDefault: 2, repsDefault: 4, lado: 'bilateral', descripcion: 'Inclinación cervical con tracción suave.' },
  { id: 'mov-cervical', nombre: 'Movilidad cervical', articulacion: 'cervical', seriesDefault: 2, repsDefault: 10, lado: 'bilateral', descripcion: 'Rotación cervical suave hacia ambos lados.' },
  { id: 'equilibrio', nombre: 'Equilibrio sobre una pierna', articulacion: 'rodilla', seriesDefault: 3, repsDefault: 3, lado: 'derecho', descripcion: 'Apoyo unipodal con leve flexión de rodilla.' },
];

const ARTICULACION_LABELS: Record<ExerciseLibraryItem['articulacion'], string> = {
  hombro: 'Hombro',
  codo: 'Codo',
  rodilla: 'Rodilla',
  cadera: 'Cadera',
  tobillo: 'Tobillo',
  cervical: 'Cervical',
};

const LADO_LABELS: Record<ExerciseLibraryItem['lado'], string> = {
  bilateral: 'Bilateral',
  derecho: 'Lado derecho',
  izquierdo: 'Lado izquierdo',
};

/** Maps each articulation to a distinct Material Symbol glyph for visual variety. */
const ARTICULACION_ICON: Record<ExerciseLibraryItem['articulacion'], string> = {
  hombro: 'accessibility',
  codo: 'back_hand',
  rodilla: 'directions_walk',
  cadera: 'rotate_right',
  tobillo: 'footprint',
  cervical: 'psychology',
};

/** Ejercicio seleccionado con configuración de series/repeticiones. */
interface SelectedExercise {
  libraryId: string;
  nombre: string;
  articulacion: ExerciseLibraryItem['articulacion'];
  lado: ExerciseLibraryItem['lado'];
  series: number;
  repeticiones: number;
}

type Step = 0 | 1 | 2;

interface ReassignRoutineModalProps {
  open: boolean;
  onClose: () => void;
  /** ID del paciente whose routine is being reassigned. */
  pacienteId: string;
  /** ID del fisioterapeuta que reasigna (auth user id). */
  fisioterapeutaId: string;
  /** Nombre del paciente para mostrar en el resumen. */
  pacienteNombre: string;
  /** Callback tras guardar exitosamente (para recargar la página). */
  onSaved: () => void;
}

export function ReassignRoutineModal({
  open,
  onClose,
  pacienteId,
  fisioterapeutaId,
  pacienteNombre,
  onSaved,
}: ReassignRoutineModalProps) {
  const toast = useToast();
  const [step, setStep] = useState<Step>(0);
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [search, setSearch] = useState('');
  const [filtroArt, setFiltroArt] = useState<ExerciseLibraryItem['articulacion'] | 'todas'>('todas');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredLibrary = useMemo(() => {
    const q = search.toLowerCase().trim();
    return EXERCISE_LIBRARY.filter((ex) => {
      const matchSearch = !q || ex.nombre.toLowerCase().includes(q) || ex.descripcion.toLowerCase().includes(q);
      const matchArt = filtroArt === 'todas' || ex.articulacion === filtroArt;
      return matchSearch && matchArt;
    });
  }, [search, filtroArt]);

  const toggleExercise = (item: ExerciseLibraryItem) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.libraryId === item.id);
      if (exists) return prev.filter((p) => p.libraryId !== item.id);
      return [
        ...prev,
        {
          libraryId: item.id,
          nombre: item.nombre,
          articulacion: item.articulacion,
          lado: item.lado,
          series: item.seriesDefault,
          repeticiones: item.repsDefault,
        },
      ];
    });
  };

  const updateConfig = (libraryId: string, field: 'series' | 'repeticiones', value: number) => {
    setSelected((prev) =>
      prev.map((p) =>
        p.libraryId === libraryId ? { ...p, [field]: Math.max(1, Math.min(99, value || 1)) } : p,
      ),
    );
  };

  const removeSelected = (libraryId: string) => {
    setSelected((prev) => prev.filter((p) => p.libraryId !== libraryId));
  };

  const canNextFromStep0 = selected.length > 0;
  const canConfirm = selected.length > 0 && !saving;

  const reset = () => {
    setStep(0);
    setSelected([]);
    setSearch('');
    setFiltroArt('todas');
    setSaving(false);
    setError(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!canConfirm || !pacienteId || !fisioterapeutaId) return;
    setSaving(true);
    setError(null);
    try {
      // 1) Obtener la rutina activa actual (para rollback si algo falla).
      const { data: activeRoutines } = await supabase
        .from('rutinas')
        .select('id, nombre, ejercicios, fecha_inicio')
        .eq('paciente_id', pacienteId)
        .eq('activa', true);
      const activeRoutine = activeRoutines?.[0] ?? null;

      // 2) Archivar la rutina activa actual (NO eliminar).
      if (activeRoutine) {
        const { error: archiveErr } = await supabase
          .from('rutinas')
          .update({ status: 'archivada', activa: false, updated_at: new Date().toISOString() })
          .eq('id', activeRoutine.id);
        if (archiveErr) throw new Error(archiveErr.message);
      }

      // 3) Insertar la nueva rutina como activa.
      const now = new Date();
      const newRoutineName = `Rutina Reasignada - ${now.toLocaleDateString('es-ES')} ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
      const ejerciciosJson = selected.map((ex) => ({
        nombre: ex.nombre,
        series: ex.series,
        repeticiones: ex.repeticiones,
        articulacion: ex.articulacion,
        lado: ex.lado,
      }));

      const { data: newRoutine, error: rutinaErr } = await supabase
        .from('rutinas')
        .insert({
          paciente_id: pacienteId,
          fisioterapeuta_id: fisioterapeutaId,
          nombre: newRoutineName,
          descripcion: 'Rutina reasignada desde el expediente del paciente',
          ejercicios: ejerciciosJson,
          activa: true,
          status: 'activa',
          fecha_inicio: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (rutinaErr) {
        // Rollback: reactivar la rutina anterior si falló la inserción.
        if (activeRoutine) {
          await supabase.from('rutinas').update({ status: 'activa', activa: true }).eq('id', activeRoutine.id);
        }
        throw new Error(rutinaErr.message);
      }
      if (!newRoutine?.id) throw new Error('No se pudo obtener el ID de la nueva rutina');

      // 4) Reemplazar los ejercicios individuales del paciente.
      const { error: delErr } = await supabase.from('patient_exercises').delete().eq('paciente_id', pacienteId);
      if (delErr) {
        // Rollback: eliminar la rutina nueva y reactivar la anterior.
        await supabase.from('rutinas').delete().eq('id', newRoutine.id);
        if (activeRoutine) {
          await supabase.from('rutinas').update({ status: 'activa', activa: true }).eq('id', activeRoutine.id);
        }
        throw new Error(delErr.message);
      }

      const rows = selected.map((ex) => ({
        paciente_id: pacienteId,
        ejercicio_nombre: ex.nombre,
        series: ex.series,
        repeticiones: ex.repeticiones,
      }));

      if (rows.length > 0) {
        const { error: exErr } = await supabase.from('patient_exercises').insert(rows);
        if (exErr) {
          // Rollback parcial: reactivar rutina anterior y archivar la nueva.
          await supabase.from('rutinas').update({ status: 'archivada', activa: false }).eq('id', newRoutine.id);
          if (activeRoutine) {
            await supabase.from('rutinas').update({ status: 'activa', activa: true }).eq('id', activeRoutine.id);
          }
          throw new Error(exErr.message);
        }
      }

      toast.success('Rutina anterior archivada y nueva rutina activa');
      reset();
      onSaved();
    } catch (e) {
      const msg = (e as Error).message || 'Error desconocido';
      setError(msg);
      toast.error('Error al reasignar la rutina: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 0, label: 'Seleccionar ejercicios' },
    { num: 1, label: 'Configurar series y reps' },
    { num: 2, label: 'Confirmar' },
  ] as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-background overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-outline-variant/20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon name="autorenew" size={24} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-title-md text-title-md text-on-surface truncate">Reasignar Rutina</h2>
                  <p className="text-xs text-on-surface-variant truncate">
                    Paciente: <span className="font-semibold">{pacienteNombre}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={saving}
                aria-label="Cerrar"
                className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all flex items-center justify-center disabled:opacity-50"
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            {/* Stepper */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-4">
              <div className="flex items-center gap-2">
                {steps.map((s, i) => (
                  <div key={s.num} className="flex items-center gap-2 flex-1 last:flex-none">
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                        step === s.num
                          ? 'bg-primary text-on-primary'
                          : step > s.num
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-container text-on-surface-variant',
                      )}
                    >
                      <span
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                          step === s.num ? 'bg-on-primary text-primary' : step > s.num ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant',
                        )}
                      >
                        {step > s.num ? <Icon name="check" size={12} filled /> : i + 1}
                      </span>
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={cn('h-0.5 flex-1 rounded-full', step > s.num ? 'bg-primary/40' : 'bg-outline-variant/30')} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-32">
            {/* STEP 0 — Selección de ejercicios */}
            {step === 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                  <div className="relative flex-1">
                    <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar ejercicio..."
                      className="input-base w-full pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-primary/20 bg-surface-container border border-outline-variant/20"
                    />
                  </div>
                  <select
                    value={filtroArt}
                    onChange={(e) => setFiltroArt(e.target.value as typeof filtroArt)}
                    className="input-base px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/20 focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="todas">Todas las articulaciones</option>
                    {(Object.keys(ARTICULACION_LABELS) as ExerciseLibraryItem['articulacion'][]).map((a) => (
                      <option key={a} value={a}>{ARTICULACION_LABELS[a]}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredLibrary.map((ex) => {
                    const isSelected = selected.some((p) => p.libraryId === ex.id);
                    return (
                      <motion.button
                        type="button"
                        key={ex.id}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleExercise(ex)}
                        className={cn(
                          'text-left p-4 rounded-2xl border transition-all relative overflow-hidden',
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-md'
                            : 'bg-surface-container border-outline-variant/20 hover:border-primary/40',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isSelected ? 'bg-primary text-on-primary' : 'bg-secondary-container text-primary')}>
                            <Icon name={ARTICULACION_ICON[ex.articulacion]} size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-on-surface text-sm leading-tight">{ex.nombre}</p>
                            <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">{ex.descripcion}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                                {ARTICULACION_LABELS[ex.articulacion]}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                                {LADO_LABELS[ex.lado]}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow">
                            <Icon name="check" size={14} filled />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {filteredLibrary.length === 0 && (
                  <div className="text-center py-12">
                    <Icon name="search_off" size={48} className="mx-auto text-outline opacity-30 mb-2" />
                    <p className="text-on-surface-variant text-sm">No se encontraron ejercicios con ese criterio.</p>
                  </div>
                )}

                {selected.length > 0 && (
                  <div className="mt-5 p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2 text-sm">
                    <Icon name="check_circle" size={18} className="text-primary" />
                    <span className="text-on-surface font-semibold">{selected.length} ejercicio(s) seleccionado(s)</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 1 — Configuración de series y repeticiones */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                {selected.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-on-surface-variant">No has seleccionado ejercicios. Vuelve al paso anterior.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selected.map((ex) => (
                      <div key={ex.libraryId} className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-secondary-container text-primary flex items-center justify-center shrink-0">
                              <Icon name={ARTICULACION_ICON[ex.articulacion]} size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-on-surface text-sm truncate">{ex.nombre}</p>
                              <p className="text-[11px] text-on-surface-variant">
                                {ARTICULACION_LABELS[ex.articulacion]} · {LADO_LABELS[ex.lado]}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeSelected(ex.libraryId)}
                            aria-label="Quitar ejercicio"
                            className="w-8 h-8 rounded-lg bg-error-container/50 text-error hover:bg-error-container transition-all flex items-center justify-center shrink-0"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="block">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Series</span>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => updateConfig(ex.libraryId, 'series', ex.series - 1)}
                                className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface hover:bg-outline-variant/30 transition-all flex items-center justify-center"
                                aria-label="Reducir series"
                              >
                                <Icon name="remove" size={18} />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={ex.series}
                                onChange={(e) => updateConfig(ex.libraryId, 'series', parseInt(e.target.value, 10))}
                                className="input-base w-full text-center px-2 py-2 rounded-lg bg-surface border border-outline-variant/20 font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => updateConfig(ex.libraryId, 'series', ex.series + 1)}
                                className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface hover:bg-outline-variant/30 transition-all flex items-center justify-center"
                                aria-label="Aumentar series"
                              >
                                <Icon name="add" size={18} />
                              </button>
                            </div>
                          </label>
                          <label className="block">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Repeticiones</span>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => updateConfig(ex.libraryId, 'repeticiones', ex.repeticiones - 1)}
                                className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface hover:bg-outline-variant/30 transition-all flex items-center justify-center"
                                aria-label="Reducir repeticiones"
                              >
                                <Icon name="remove" size={18} />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={ex.repeticiones}
                                onChange={(e) => updateConfig(ex.libraryId, 'repeticiones', parseInt(e.target.value, 10))}
                                className="input-base w-full text-center px-2 py-2 rounded-lg bg-surface border border-outline-variant/20 font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => updateConfig(ex.libraryId, 'repeticiones', ex.repeticiones + 1)}
                                className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface hover:bg-outline-variant/30 transition-all flex items-center justify-center"
                                aria-label="Aumentar repeticiones"
                              >
                                <Icon name="add" size={18} />
                              </button>
                            </div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2 — Confirmación */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <Icon name="archive" size={24} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-on-surface text-sm">La rutina actual será archivada</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      La rutina activa existente cambiará a estado <span className="font-semibold">archivada</span> (no se elimina) y la nueva rutina quedará como <span className="font-semibold">activa</span>.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/20">
                  <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                    <Icon name="list_alt" size={20} className="text-primary" />
                    Resumen de la nueva rutina
                  </h3>
                  <div className="space-y-2">
                    {selected.map((ex) => (
                      <div key={ex.libraryId} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-secondary-container text-primary flex items-center justify-center shrink-0">
                            <Icon name={ARTICULACION_ICON[ex.articulacion]} size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-on-surface text-sm truncate">{ex.nombre}</p>
                            <p className="text-[11px] text-on-surface-variant">
                              {ARTICULACION_LABELS[ex.articulacion]} · {LADO_LABELS[ex.lado]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                          <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary">{ex.series} series</span>
                          <span className="px-2 py-1 rounded-lg bg-secondary/15 text-secondary">{ex.repeticiones} reps</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Total de ejercicios</span>
                    <span className="font-bold text-on-surface">{selected.length}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-error-container/50 border border-error/20 flex items-center gap-2 text-sm text-error">
                    <Icon name="error" size={18} />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Footer — acciones */}
          <div className="sticky bottom-0 bg-surface/95 backdrop-blur-md border-t border-outline-variant/20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
              <button
                onClick={step === 0 ? handleClose : () => setStep((s) => (s - 1) as Step)}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-container text-on-surface-variant font-bold hover:bg-surface-container-high transition-all disabled:opacity-50"
              >
                <Icon name="arrow_back" size={18} />
                {step === 0 ? 'Cancelar' : 'Atrás'}
              </button>

              {step < 2 ? (
                <button
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  disabled={(step === 0 && !canNextFromStep0) || saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100"
                >
                  Continuar
                  <Icon name="arrow_forward" size={18} />
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {saving ? (
                    <>
                      <Spinner size={18} className="text-on-primary" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Icon name="save" size={18} />
                      Confirmar y Guardar
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ReassignRoutineModal;
