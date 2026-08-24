import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { GlassPanel } from '../components/ui/Glass';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { cn } from '../lib/utils';
import { Spinner } from '../components/ui/Loader';
import { SkeletonCard } from '../components/ui/Skeleton';
import { MedicalIcon } from '../components/ui/MedicalIcon';
import { celebrateAchievement } from '../lib/confetti';
import { GlassModal } from '../components/ui/GlassModal';
import { ExerciseImage } from '../components/ui/ExerciseImage';
import { getExerciseImage } from '../data/exerciseImages';
import { SkeletonDemo } from '../components/rehabilitation/SkeletonDemo';
import { buildExerciseDefinition, getExerciseDescription } from '../data/exercisePresets';

interface Exercise {
  id: string;
  nombre: string;
  descripcion: string | null;
  detailed_description: string | null;
  articulacion: string | null;
  grupo_muscular: string | null;
  series: number | null;
  repeticiones: number | null;
  duracion_segundos: number | null;
  angulo_objetivo: number | null;
  fase_recuperacion: string | null;
  lado: string | null;
  categoria: string | null;
}



const filters = ['Todos', 'Hombro', 'Rodilla', 'Cuello', 'Brazos', 'Piernas'];

export function ExercisesPage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeFilter, setActiveFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [prevExerciseCount, setPrevExerciseCount] = useState(0);
  const isFisio = user?.role === 'fisioterapeuta';
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [descriptionExercise, setDescriptionExercise] = useState<Exercise | null>(null);
  const [assignExercise, setAssignExercise] = useState<Exercise | null>(null);
  const [patients, setPatients] = useState<{ id: string; nombre: string; apellido: string | null }[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [form, setForm] = useState({
    nombre: '', descripcion: '', detailed_description: '', articulacion: '', grupo_muscular: '',
    series: 3, repeticiones: 10, duracion_segundos: 60, angulo_objetivo: 90,
    fase_recuperacion: 'inicial', lado: 'bilateral', categoria: 'movilidad',
  });

  useEffect(() => {
    loadExercises();
  }, [user?.id]);

  useEffect(() => {
    const milestones = [3, 5, 10, 20];
    if (prevExerciseCount > 0 && exercises.length > prevExerciseCount && milestones.includes(exercises.length)) {
      celebrateAchievement();
    }
    setPrevExerciseCount(exercises.length);
  }, [exercises.length, prevExerciseCount]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      if (isFisio) {
        const { data, error } = await supabase.from('exercises').select('*').order('nombre');
        if (error) throw error;
        if (data) setExercises(data as Exercise[]);
      } else {
        const { data: assigned, error: assignedError } = await supabase
          .from('patient_exercises')
          .select('id, ejercicio_nombre, series, repeticiones, ejercicio:exercises(detailed_description)')
          .eq('paciente_id', user?.id);
        if (assignedError) throw assignedError;
        if (assigned && assigned.length > 0) {
          setExercises(assigned.map((a: any) => ({
            id: a.id,
            nombre: a.ejercicio_nombre || 'Ejercicio',
            descripcion: null,
            detailed_description: a.ejercicio?.detailed_description ?? null,
            articulacion: null,
            grupo_muscular: null,
            series: a.series,
            repeticiones: a.repeticiones,
          })) as Exercise[]);
        }
      }
    } catch {
      toast.error('Error cargando ejercicios');
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('rol', 'paciente')
        .order('nombre');
      if (error) throw error;
      setPatients((data || []).map((p: any) => ({ id: p.id, nombre: p.nombre, apellido: null })));
    } catch {
      toast.error('Error cargando pacientes');
    }
  };

  const openAssignModal = (ex: Exercise) => {
    setAssignExercise(ex);
    setSelectedPatientId(null);
    setPatientSearch('');
    loadPatients();
  };

  const handleAssignExercise = async () => {
    if (!assignExercise || !selectedPatientId) {
      toast.error('Selecciona un paciente');
      return;
    }
    setAssigning(true);
    try {
      const { data: activeRoutine } = await supabase
        .from('rutinas')
        .select('id, ejercicios')
        .eq('paciente_id', selectedPatientId)
        .eq('activa', true)
        .maybeSingle();

      if (activeRoutine) {
        const currentExercises = Array.isArray(activeRoutine.ejercicios) ? activeRoutine.ejercicios : [];
        const updatedExercises = [...currentExercises, {
          id: assignExercise.id,
          nombre: assignExercise.nombre,
          series: assignExercise.series ?? 3,
          repeticiones: assignExercise.repeticiones ?? 10,
          duracion_segundos: assignExercise.duracion_segundos ?? 60,
        }];
        const { error: updateErr } = await supabase
          .from('rutinas')
          .update({ ejercicios: updatedExercises, updated_at: new Date().toISOString() })
          .eq('id', activeRoutine.id);
        if (updateErr) throw updateErr;
        toast.success(`Ejercicio asignado a la rutina activa`);
      } else {
        const { error: insertErr } = await supabase.from('rutinas').insert({
          paciente_id: selectedPatientId,
          fisioterapeuta_id: user?.id,
          nombre: `Rutina - ${new Date().toLocaleDateString('es-ES')}`,
          descripcion: 'Rutina creada al asignar ejercicio individual',
          ejercicios: [{
            id: assignExercise.id,
            nombre: assignExercise.nombre,
            series: assignExercise.series ?? 3,
            repeticiones: assignExercise.repeticiones ?? 10,
            duracion_segundos: assignExercise.duracion_segundos ?? 60,
          }],
          activa: true,
          status: 'activa',
          fecha_inicio: new Date().toISOString().split('T')[0],
        });
        if (insertErr) throw insertErr;
        toast.success(`Nueva rutina creada con el ejercicio asignado`);
      }

      const { error: peErr } = await supabase.from('patient_exercises').insert({
        paciente_id: selectedPatientId,
        ejercicio_id: assignExercise.id,
        ejercicio_nombre: assignExercise.nombre,
        series: assignExercise.series ?? 3,
        repeticiones: assignExercise.repeticiones ?? 10,
      });
      if (peErr) console.error('Error inserting patient_exercise:', peErr.message);

      setAssignExercise(null);
      setSelectedPatientId(null);
    } catch (e) {
      toast.error('Error al asignar ejercicio: ' + (e as Error).message);
    } finally {
      setAssigning(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      nombre: '', descripcion: '', detailed_description: '', articulacion: '', grupo_muscular: '',
      series: 3, repeticiones: 10, duracion_segundos: 60, angulo_objetivo: 90,
      fase_recuperacion: 'inicial', lado: 'bilateral', categoria: 'movilidad',
    });
    setShowModal(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditing(ex);
    setForm({
      nombre: ex.nombre,
      descripcion: ex.descripcion ?? '',
      detailed_description: ex.detailed_description ?? '',
      articulacion: ex.articulacion ?? '',
      grupo_muscular: ex.grupo_muscular ?? '',
      series: ex.series ?? 3,
      repeticiones: ex.repeticiones ?? 10,
      duracion_segundos: ex.duracion_segundos ?? 60,
      angulo_objetivo: ex.angulo_objetivo ?? 90,
      fase_recuperacion: ex.fase_recuperacion ?? 'inicial',
      lado: ex.lado ?? 'bilateral',
      categoria: ex.categoria ?? 'movilidad',
    });
    setShowModal(true);
  };

  const saveExercise = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase.from('exercises').update({
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          detailed_description: form.detailed_description || null,
          articulacion: form.articulacion || null,
          grupo_muscular: form.grupo_muscular || null,
          series: form.series,
          repeticiones: form.repeticiones,
          duracion_segundos: form.duracion_segundos,
          angulo_objetivo: form.angulo_objetivo,
          fase_recuperacion: form.fase_recuperacion,
          lado: form.lado,
          categoria: form.categoria,
        }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Ejercicio actualizado');
      } else {
        const { error } = await supabase.from('exercises').insert({
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          detailed_description: form.detailed_description || null,
          articulacion: form.articulacion || null,
          grupo_muscular: form.grupo_muscular || null,
          series: form.series,
          repeticiones: form.repeticiones,
          duracion_segundos: form.duracion_segundos,
          angulo_objetivo: form.angulo_objetivo,
          fase_recuperacion: form.fase_recuperacion,
          lado: form.lado,
          categoria: form.categoria,
          fisio_id: user?.id,
        });
        if (error) throw error;
        toast.success('Ejercicio creado');
      }
      setShowModal(false);
      loadExercises();
    } catch (e) {
      toast.error('Error guardando ejercicio');
    }
  };

  const deleteExercise = async (id: string) => {
    try {
      const { error } = await supabase.from('exercises').delete().eq('id', id);
      if (error) throw error;
      toast.success('Ejercicio eliminado');
      loadExercises();
    } catch {
      toast.error('Error eliminando ejercicio');
    }
  };

  const cloneExercise = async (ex: Exercise) => {
    try {
      const { error } = await supabase.from('exercises').insert({
        nombre: `${ex.nombre} (copia)`,
        descripcion: ex.descripcion,
        detailed_description: ex.detailed_description,
        articulacion: ex.articulacion,
        grupo_muscular: ex.grupo_muscular,
        series: ex.series,
        repeticiones: ex.repeticiones,
        fisio_id: user?.id,
      });
      if (error) throw error;
      toast.success('Ejercicio clonado');
      loadExercises();
    } catch {
      toast.error('Error clonando ejercicio');
    }
  };

  const filtered = exercises.filter((e) => {
    const matchesSearch = !search || e.nombre.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 0 || (e.grupo_muscular ?? e.articulacion) === filters[activeFilter];
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living">Biblioteca de Ejercicios</h1>
          <p className="text-on-surface-variant font-body-lg">Crea, edita y gestiona ejercicios para tus pacientes.</p>
        </div>
        {isFisio && (
        <button onClick={openCreate} className="hidden lg:flex premium-btn bg-primary text-on-primary px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 items-center gap-2 transition-all">
          <Icon name="add" size={20} /> Nuevo Ejercicio
        </button>
        )}
      </div>

      {/* Floating action button — visible on mobile only */}
      {isFisio && (
        <button onClick={openCreate} aria-label="Nuevo Ejercicio" className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-primary text-on-primary shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 flex items-center justify-center transition-all">
          <Icon name="add" size={28} />
        </button>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ejercicios..."
            className="w-full pl-12 pr-4 py-3 rounded-xl glass-teal border border-outline-variant/30 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {filters.map((f, i) => (
            <button
              key={f}
              onClick={() => setActiveFilter(i)}
              className={cn(
                'px-4 py-2 rounded-full font-label-md whitespace-nowrap transition-all',
                i === activeFilter ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state-premium flex flex-col items-center justify-center py-16 text-center">
          <MedicalIcon name="exercise" size={56} className="text-primary/40 mb-4 animate-breathe-icon" />
          <p className="text-on-surface-variant font-body-lg">No se encontraron ejercicios para tu búsqueda. ¡No te desanimes! Cada esfuerzo te acerca a tu recuperación. Prueba ajustar los filtros o crea un nuevo ejercicio.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((ex, i) => (
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -6, scale: 1.02 }}
          >
            <GlassPanel className="p-6 rounded-3xl group card-glow-hover vibrant-hover">
              <ExerciseImage src={getExerciseImage(ex.id)} name={ex.nombre} />
              <p className="text-sm text-on-surface-variant -mt-2 mb-4 line-clamp-2">{ex.descripcion || 'Sin descripción'}</p>
              <div className="grid grid-cols-3 gap-2 py-4 border-y border-outline-variant/10">
                <div>
                  <p className="text-[10px] uppercase text-outline font-bold">Series</p>
                  <span className="font-bold">{ex.series ?? '-'}</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-outline font-bold">Repet.</p>
                  <span className="font-bold">{ex.repeticiones ?? '-'}</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-outline font-bold">Grupo</p>
                  <span className="font-bold text-sm flex items-center gap-1">
                    {ex.grupo_muscular === 'Hombro' || ex.articulacion === 'hombro' ? (
                      <MedicalIcon name="shoulder" size={16} className="text-primary" />
                    ) : ex.grupo_muscular === 'Rodilla' || ex.articulacion === 'rodilla' ? (
                      <MedicalIcon name="knee" size={16} className="text-primary" />
                    ) : ex.grupo_muscular === 'Cuello' || ex.articulacion === 'cervical' ? (
                      <MedicalIcon name="spine" size={16} className="text-primary" />
                    ) : null}
                    {ex.grupo_muscular ?? ex.articulacion ?? '-'}
                  </span>
                </div>
              </div>
              <button onClick={() => setDescriptionExercise(ex)} className="w-full mt-4 py-2.5 rounded-xl bg-surface-variant/20 text-on-surface-variant font-bold text-sm hover:bg-surface-variant/40 transition-all flex items-center justify-center gap-1.5">
                <Icon name="menu_book" size={16} /> Ver descripción
              </button>
              {isFisio && (
              <button onClick={() => openAssignModal(ex)} className="w-full mt-2 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5">
                <Icon name="person_add" size={16} /> Asignar a paciente
              </button>
              )}
              {isFisio && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => openEdit(ex)} className="flex-1 py-3 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all flex items-center justify-center gap-1">
                  <Icon name="edit" size={16} /> Editar
                </button>
                <button onClick={() => cloneExercise(ex)} className="flex-1 py-3 rounded-xl bg-surface-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-variant/50 transition-all flex items-center justify-center gap-1">
                  <Icon name="content_copy" size={16} /> Clonar
                </button>
                <button onClick={() => deleteExercise(ex.id)} aria-label="Eliminar ejercicio" className="py-3 px-3 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all">
                  <Icon name="delete" size={16} />
                </button>
              </div>
              )}
            </GlassPanel>
          </motion.div>
        ))}
      </div>
      )}

      {/* Create/Edit modal */}
      <AnimatePresence>
      {showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="glass-panel rounded-3xl p-5 sm:p-6 lg:p-8 max-w-full lg:max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living">{editing ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</h3>
              <button onClick={() => setShowModal(false)} aria-label="Cerrar ventana de ejercicio" className="text-outline hover:text-error"><Icon name="close" size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Nombre</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Nombre del ejercicio" />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none" rows={3} placeholder="Descripción del ejercicio" />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Descripción detallada</label>
                <textarea value={form.detailed_description} onChange={(e) => setForm({ ...form, detailed_description: e.target.value })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none" rows={5} placeholder="Instrucciones detalladas paso a paso, precauciones y recomendaciones que verá el paciente al pulsar 'Ver descripción'." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Articulación</label>
                  <select value={form.articulacion} onChange={(e) => setForm({ ...form, articulacion: e.target.value })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">Seleccionar...</option>
                    <option value="hombro">Hombro</option>
                    <option value="codo">Codo</option>
                    <option value="rodilla">Rodilla</option>
                    <option value="cadera">Cadera</option>
                    <option value="tobillo">Tobillo</option>
                    <option value="cervical">Cervical</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Grupo Muscular</label>
                  <input value={form.grupo_muscular} onChange={(e) => setForm({ ...form, grupo_muscular: e.target.value })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ej: Hombro" />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Series</label>
                  <input type="number" value={form.series} onChange={(e) => setForm({ ...form, series: parseInt(e.target.value) || 1 })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none" min={1} />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Repeticiones</label>
                  <input type="number" value={form.repeticiones} onChange={(e) => setForm({ ...form, repeticiones: parseInt(e.target.value) || 1 })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none" min={1} />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Duración (segundos)</label>
                  <input type="number" value={form.duracion_segundos} onChange={(e) => setForm({ ...form, duracion_segundos: parseInt(e.target.value) || 30 })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none" min={5} />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Ángulo Objetivo (°)</label>
                  <input type="number" value={form.angulo_objetivo} onChange={(e) => setForm({ ...form, angulo_objetivo: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none" min={0} max={360} />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Fase de Recuperación</label>
                  <select value={form.fase_recuperacion} onChange={(e) => setForm({ ...form, fase_recuperacion: e.target.value })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="inicial">Inicial</option>
                    <option value="intermedia">Intermedia</option>
                    <option value="avanzada">Avanzada</option>
                    <option value="mantenimiento">Mantenimiento</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Lado</label>
                  <select value={form.lado} onChange={(e) => setForm({ ...form, lado: e.target.value })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="bilateral">Bilateral</option>
                    <option value="derecho">Derecho</option>
                    <option value="izquierdo">Izquierdo</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Categoría</label>
                  <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full px-4 py-3 rounded-xl glass-teal border border-outline-variant/20 focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="movilidad">Movilidad</option>
                    <option value="fortalecimiento">Fortalecimiento</option>
                    <option value="estiramiento">Estiramiento</option>
                    <option value="propiocepcion">Propiocepción</option>
                    <option value="funcional">Funcional</option>
                  </select>
                </div>
              </div>
              {/* Live 3D preview */}
              {form.nombre.trim() && form.articulacion && (
                <div className="pt-2">
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Icon name="3d_rotation" size={16} /> Vista previa de demostración 3D
                  </p>
                  <div className="flex justify-center">
                    <SkeletonDemo
                      exercise={buildExerciseDefinition(
                        editing?.id || 'preview',
                        form.nombre,
                        form.series,
                        form.repeticiones,
                        form.articulacion,
                        form.lado,
                        form.angulo_objetivo,
                        form.detailed_description || null
                      )}
                      userRole="physio"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl bg-surface-variant/40 text-on-surface-variant font-bold hover:bg-surface-variant/60 transition-all">Cancelar</button>
                <button onClick={saveExercise} className="premium-btn flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold hover:scale-[0.98] transition-all">{editing ? 'Guardar' : 'Crear'}</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Description modal */}
      <GlassModal isOpen={!!descriptionExercise} onClose={() => setDescriptionExercise(null)} size="lg">
        {descriptionExercise && (
          <div className="space-y-4">
            <h3 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living pr-8">
              {descriptionExercise.nombre}
            </h3>
            <ExerciseImage src={getExerciseImage(descriptionExercise.id)} name={descriptionExercise.nombre} heightClass="h-44" />
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-2">Descripción detallada</p>
              {descriptionExercise.detailed_description ? (
                <p className="text-on-surface font-body-lg whitespace-pre-wrap leading-relaxed">
                  {descriptionExercise.detailed_description}
                </p>
              ) : (
                <p className="text-on-surface font-body-lg whitespace-pre-wrap leading-relaxed">
                  {getExerciseDescription(descriptionExercise.nombre, descriptionExercise.articulacion ?? undefined)}
                </p>
              )}
            </div>

            {/* Skeleton Demo */}
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-2">Demostración con esqueleto articulado</p>
              <div className="flex justify-center">
                <SkeletonDemo
                  exercise={buildExerciseDefinition(
                    descriptionExercise.id,
                    descriptionExercise.nombre,
                    descriptionExercise.series ?? 3,
                    descriptionExercise.repeticiones ?? 10,
                    descriptionExercise.articulacion ?? undefined,
                    descriptionExercise.lado ?? undefined,
                    descriptionExercise.angulo_objetivo ?? undefined,
                    descriptionExercise.detailed_description
                  )}
                  userRole="physio"
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

      {/* Assign to patient modal */}
      <GlassModal isOpen={!!assignExercise} onClose={() => setAssignExercise(null)} size="md">
        <div className="p-6">
          <h3 className="text-xl font-bold text-on-surface mb-1">Asignar a paciente</h3>
          <p className="text-sm text-on-surface-variant mb-4">
            Ejercicio: <span className="font-bold text-primary">{assignExercise?.nombre}</span>
          </p>

          <label className="block text-sm font-bold text-on-surface-variant mb-2">Buscar paciente</label>
          <div className="relative mb-3">
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Nombre del paciente..."
              className="w-full px-4 py-3 pl-10 rounded-xl bg-surface-variant/20 text-on-surface border border-divider focus:border-primary focus:outline-none transition-colors"
            />
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
            {patients
              .filter((p) => p.nombre.toLowerCase().includes(patientSearch.toLowerCase()))
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`w-full px-4 py-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                    selectedPatientId === p.id
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-variant/10 text-on-surface hover:bg-surface-variant/20'
                  }`}
                >
                  <Icon name="person" size={20} />
                  <span>{p.nombre}</span>
                </button>
              ))}
            {patients.length === 0 && (
              <p className="text-center text-on-surface-variant text-sm py-4">No hay pacientes disponibles</p>
            )}
          </div>

          <button
            onClick={handleAssignExercise}
            disabled={!selectedPatientId || assigning}
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {assigning ? (
              <><Spinner size={20} /> Asignando...</>
            ) : (
              <><Icon name="check_circle" size={20} /> Asignar ejercicio</>
            )}
          </button>
        </div>
      </GlassModal>
    </div>
  );
}
