import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { SkeletonList } from '../components/ui/Skeleton';
import { MedicalIcon } from '../components/ui/MedicalIcon';
import { CollapsibleProfile } from '../components/ui/CollapsibleProfile';
import { ProgressiveBlur } from '../components/ui/ProgressiveBlur';
import { AnimatedLink } from '../components/ui/AnimatedLink';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface PatientCard {
  id: string;
  name: string;
  fmId: string;
  status: string;
  statusColor: 'green' | 'red' | 'blue' | 'secondary';
  recoveryProgress: number;
  lastSession: string;
  condition: string;
  sessionCount: number;
  patologia?: string;
  medico_remitente?: string;
  documento_identidad?: string;
  telefono?: string;
}

const filters = ['Todos', 'Activos', 'Post-Op', 'En Recuperación', 'Requieren Revisión'];

export function PatientsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<PatientCard[]>([]);
  const [activeFilter, setActiveFilter] = useState(0);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  useEffect(() => {
    loadPatients();
  }, [user?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCmdPalette(true);
      }
      if (e.key === 'Escape') setShowCmdPalette(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const loadPatients = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: links } = await supabase
        .from('pacientes_terapeutas')
        .select('paciente_id')
        .eq('terapeuta_id', user.id);

      if (!links || links.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const patientIds = links.map((l) => l.paciente_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          id, full_name, diagnostico,
          patologia, medico_remitente, documento_identidad,
          telefono, fecha_nacimiento, extremidad_afectada
        `)
        .in('id', patientIds);

      if (!profiles || profiles.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const { data: sessions } = await supabase
        .from('sesiones_completadas')
        .select('paciente_id, fecha, calidad_ejecucion')
        .in('paciente_id', patientIds)
        .order('fecha', { ascending: false });

      const cards: PatientCard[] = profiles.map((p, i) => {
        const patientSessions = (sessions || []).filter(s => s.paciente_id === p.id);
        const lastSessionDate = patientSessions[0]?.fecha;
        const daysSinceLast = lastSessionDate
          ? Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / 86400000)
          : null;
        const avgQuality = patientSessions.length > 0
          ? Math.round(patientSessions.reduce((sum, s) => sum + (s.calidad_ejecucion || 0), 0) / patientSessions.length)
          : 0;

        let status = 'Sin Sesiones';
        let statusColor: PatientCard['statusColor'] = 'secondary';
        if (daysSinceLast === null) {
          status = 'Nuevo';
          statusColor = 'secondary';
        } else if (daysSinceLast > 7) {
          status = 'Requiere Revisión';
          statusColor = 'red';
        } else if (avgQuality >= 70) {
          status = 'Mejorando';
          statusColor = 'green';
        } else {
          status = 'Estable';
          statusColor = 'blue';
        }

        const lastSessionStr = lastSessionDate
          ? new Date(lastSessionDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
          : 'Sin sesiones';

        return {
          id: p.id,
          name: p.full_name,
          fmId: `FM-${1000 + i}`,
          status,
          statusColor,
          recoveryProgress: avgQuality,
          lastSession: lastSessionStr,
          condition: p.diagnostico || p.patologia || 'General',
          sessionCount: patientSessions.length,
          patologia: p.patologia || undefined,
          medico_remitente: p.medico_remitente || undefined,
          documento_identidad: p.documento_identidad || undefined,
          telefono: p.telefono || undefined,
        } as PatientCard;
      });

      setPatients(cards);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.patologia?.toLowerCase().includes(q)) ||
      (p.medico_remitente?.toLowerCase().includes(q)) ||
      (p.documento_identidad?.toLowerCase().includes(q)) ||
      (p.telefono?.toLowerCase().includes(q)) ||
      p.condition.toLowerCase().includes(q);
    const matchesFilter =
      activeFilter === 0 ||
      (activeFilter === 1 && p.statusColor === 'green') ||
      (activeFilter === 2 && p.condition.toLowerCase().includes('post')) ||
      (activeFilter === 3 && p.recoveryProgress > 0 && p.recoveryProgress < 70) ||
      (activeFilter === 4 && p.statusColor === 'red');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto relative overflow-x-hidden">
      <div className="flex flex-col gap-6 mb-10 relative">
        <div className="blob-blue w-48 h-48 -top-8 -left-8 opacity-40" />
        <div className="relative">
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living mb-2">Directorio de Pacientes</h1>
          <p className="text-on-surface-variant font-body-lg">Gestiona los procesos de recuperación y el desempeño clínico.</p>
        </div>
        <div className="relative flex-1 max-w-md">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar pacientes..." className="input-base pl-12 pr-4 py-3 rounded-full focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar relative">
          {filters.map((f, i) => (
            <button
              key={f}
              onClick={() => setActiveFilter(i)}
              className={cn(
                'px-5 py-2 rounded-full font-label-md whitespace-nowrap transition-all hover-lift',
                i === 0 ? 'bg-primary text-white shadow-glow-primary breathe-badge' :
                i === 4 ? 'bg-error-container text-on-error-container hover-lift-warm' :
                'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-2 relative">
          <span className="text-sm text-on-surface-variant font-bold">Vista:</span>
          <button onClick={() => setViewMode('cards')} className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-all active-scale', viewMode === 'cards' ? 'bg-primary text-on-primary shadow-glow-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high')}>
            Tarjetas
          </button>
          <button onClick={() => setViewMode('list')} className={cn('px-3 py-1.5 rounded-lg text-sm font-bold transition-all active-scale', viewMode === 'list' ? 'bg-primary text-on-primary shadow-glow-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high')}>
            Lista
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonList count={6} />
      ) : patients.length === 0 ? (
        <EmptyState type="patients" actionLabel="Generar Token" onAction={() => navigate('/tokens')} />
      ) : (
        <>
        {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPatients.map((patient, i) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/paciente/${patient.id}`)}
              className="glass-card hover-lift accent-teal p-6 rounded-3xl group cursor-pointer relative overflow-hidden shimmer-border"
            >
              <div className="blob-teal w-20 h-20 -top-4 -right-4 opacity-30 group-hover:opacity-60 transition-opacity" />
              <div className="flex justify-between items-start mb-6 relative">
                <div className="flex items-center gap-3">
                  <div className="avatar-ring w-14 h-14">
                    <div className="w-full h-full rounded-[inherit] bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-lg">
                      {patient.name.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-title-md text-title-md gradient-text-teal">{patient.name}</h3>
                    <p className="text-label-sm text-outline uppercase tracking-wider">ID: #{patient.fmId}</p>
                  </div>
                </div>
                <div className={cn(
                  'px-3 py-1 rounded-full flex items-center gap-1 text-xs font-bold breathe-badge',
                  patient.statusColor === 'green' && 'badge-lime',
                  patient.statusColor === 'red' && 'badge-warm',
                  patient.statusColor === 'blue' && 'badge-blue',
                  patient.statusColor === 'secondary' && 'bg-secondary-fixed text-on-secondary-fixed',
                )}>
                  <Icon name={patient.statusColor === 'green' ? 'check_circle' : patient.statusColor === 'red' ? 'warning' : patient.statusColor === 'blue' ? 'motion_sensor_active' : 'timer'} filled size={14} />
                  {patient.status}
                </div>
              </div>

              <div className="space-y-4">
                {patient.statusColor === 'secondary' && patient.recoveryProgress === 0 && (
                  <p className="text-xs text-outline flex items-center gap-1.5"><Icon name="hourglass_empty" size={14} /> Esperando escaneo inicial</p>
                )}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-on-surface-variant">Progreso de Recuperación</span>
                    <span className={cn('font-bold', patient.statusColor === 'red' ? 'text-error' : 'gradient-text-teal')}>{patient.recoveryProgress > 0 ? `${patient.recoveryProgress}%` : '—'}</span>
                  </div>
                  <div className="premium-progress w-full h-2 relative">
                    <div
                      className={cn('premium-progress-bar', patient.statusColor === 'red' && '!bg-error !animate-none')}
                      style={{ width: `${patient.recoveryProgress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y divider-teal relative">
                  <div>
                    <p className="text-[10px] uppercase text-outline font-bold mb-1">Última Sesión</p>
                    <div className="flex items-center gap-2">
                      <Icon name="calendar_today" size={16} className="text-outline" />
                      <span className="text-sm">{patient.lastSession}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-outline font-bold mb-1">Condición</p>
                    <span className="text-sm flex items-center gap-1.5">
                      <MedicalIcon name="spine" size={14} className="text-outline" />
                      {patient.condition}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <span onClick={(e) => e.stopPropagation()}>
                      <AnimatedLink onClick={() => navigate(`/paciente/${patient.id}`)} className="text-primary font-bold text-label-md">
                        {patient.statusColor === 'red' ? 'Revisar Sesión' : patient.statusColor === 'secondary' && patient.recoveryProgress === 0 ? 'Iniciar Onboarding' : 'Ver perfil'}
                      </AnimatedLink>
                    </span>
                  </div>
                  {/* Avatar stack - AI + PT indicators */}
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold border-2 border-surface breathe-blue" title="Physi"><Icon name="auto_awesome" size={12} /></div>
                    <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-[10px] font-bold border-2 border-surface" title="Fisioterapeuta"><Icon name="person" size={12} /></div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: patients.length * 0.1 }}
            onClick={() => navigate('/ocr-scanner')}
            className="border-2 border-dashed divider-teal rounded-3xl flex flex-col items-center justify-center p-10 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group hover-lift relative overflow-hidden"
          >
            <div className="blob-lime w-24 h-24 -top-4 -right-4 opacity-20 group-hover:opacity-50 transition-opacity" />
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline group-hover:bg-primary group-hover:text-white transition-all mb-4 animate-breathe-icon relative">
              <Icon name="add" size={32} />
            </div>
            <h4 className="font-title-md text-primary">Cargar Nuevo Paciente</h4>
            <p className="text-on-surface-variant text-center mt-2 max-w-[200px]">Ingresa los datos para iniciar el seguimiento AR.</p>
          </motion.div>
        </div>
        ) : (
        <div className="relative space-y-3 max-h-[70vh] overflow-y-auto pr-2">
          {filteredPatients.map((p) => (
            <CollapsibleProfile
              key={p.id}
              name={p.name}
              bio={`Diagnóstico: ${p.condition} · Última sesión: ${p.lastSession}`}
              stats={[{ label: 'sesiones', value: p.sessionCount }, { label: 'calidad', value: p.recoveryProgress }]}
              className="hover-lift accent-teal"
            />
          ))}
          <ProgressiveBlur position="bottom" />
        </div>
        )}
        </>
      )}

      {showCmdPalette && (
        <div
          className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-start justify-center pt-[153px] px-4"
          onClick={() => setShowCmdPalette(false)}
        >
          <div className="w-full max-w-2xl glass-panel rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 flex items-center border-b border-outline-variant/20">
              <Icon name="search" size={24} className="text-primary mr-3" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 font-title-md text-primary placeholder:text-outline/60 outline-none"
                placeholder="Buscar pacientes, sesiones o archivos clínicos..."
              />
              <span className="text-[10px] font-bold text-outline bg-surface-container px-2 py-1 rounded-md">ESC</span>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest px-4 py-2">Pacientes Recientes</p>
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { navigate(`/paciente/${p.id}`); setShowCmdPalette(false); }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Icon name="person" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-on-surface">{p.name}</p>
                    <p className="text-xs text-outline">{p.condition}</p>
                  </div>
                </button>
              ))}
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest px-4 py-2 mt-2">Acciones Rápidas</p>
              <div className="grid grid-cols-2 gap-2 px-2">
                <button onClick={() => { navigate('/ocr-scanner'); setShowCmdPalette(false); }} className="flex items-center gap-2 p-3 hover:bg-primary/5 rounded-xl transition-colors">
                  <Icon name="person_add" size={20} className="text-primary" /> <span className="text-sm font-medium">Agregar Paciente</span>
                </button>
                <button onClick={() => { navigate('/tokens'); setShowCmdPalette(false); }} className="flex items-center gap-2 p-3 hover:bg-primary/5 rounded-xl transition-colors">
                  <Icon name="key" size={20} className="text-primary" /> <span className="text-sm font-medium">Gestionar Tokens</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
