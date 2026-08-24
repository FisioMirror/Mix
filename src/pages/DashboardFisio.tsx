import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { GlassPanel } from '../components/ui/Glass';
import { Spinner } from '../components/ui/Loader';

import { MedicalIcon } from '../components/ui/MedicalIcon';
import { ExpandableToggle } from '../components/ui/ExpandableToggle';
import { CommandPalette, type CommandItem } from '../components/ui/CommandPalette';
import { InsightBanner } from '../components/ui/InsightBanner';
import { HelpGuideButton } from '../components/ui/HelpGuideButton';
import { OnboardingGuide } from '../components/OnboardingGuide';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { runAIJob } from '../lib/ai';
import { formatAIReport } from '../lib/formatReport';
import MascotAnimation from '../components/ui/MascotAnimation';

interface KpiData {
  activePatients: number;
  sessionsToday: number;
  weeklyAdherence: number;
  pendingTokens: number;
  isDemo: boolean;
}

const emptyKpi: KpiData = {
  activePatients: 0,
  sessionsToday: 0,
  weeklyAdherence: 0,
  pendingTokens: 0,
  isDemo: false,
};

const emptyDisplayKpi: KpiData = {
  activePatients: 0,
  sessionsToday: 0,
  weeklyAdherence: 0,
  pendingTokens: 0,
  isDemo: false,
};

interface Priority {
  text: string;
  subtitle: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
}

// ───────────────────────────────────────────────────────────────────────────
// Datos de demostración (fictional). Se muestran cuando no hay datos reales
// cargados desde la base de datos, para que la cuenta demo del fisioterapeuta
// vea una experiencia poblada y realista. No se persisten ni envían a Supabase.
// ───────────────────────────────────────────────────────────────────────────

interface DemoPatient {
  id: string;
  name: string;
  diagnosis: string;
  progress: number;
  sessionsCompleted: number;
  sessionsTotal: number;
  lastActive: string;
  routine: string;
  status: 'Activo' | 'En pausa' | 'Alta próxima';
  adherence: number;
}

const demoPatients: DemoPatient[] = [
  {
    id: 'demo-1',
    name: 'María Fernández',
    diagnosis: 'Lumbalgia crónica',
    progress: 78,
    sessionsCompleted: 14,
    sessionsTotal: 18,
    lastActive: 'Hace 2 horas',
    routine: 'Core + movilidad lumbar',
    status: 'Activo',
    adherence: 92,
  },
  {
    id: 'demo-2',
    name: 'Carlos Domínguez',
    diagnosis: 'Rehabilitación postoperatoria rodilla',
    progress: 45,
    sessionsCompleted: 9,
    sessionsTotal: 20,
    lastActive: 'Hace 1 día',
    routine: 'Fortalecimiento cuádriceps',
    status: 'Activo',
    adherence: 68,
  },
  {
    id: 'demo-3',
    name: 'Lucía Romero',
    diagnosis: 'Tendinopatía rotuliana',
    progress: 62,
    sessionsCompleted: 11,
    sessionsTotal: 16,
    lastActive: 'Hace 3 horas',
    routine: 'Eccéntricos + estiramientos',
    status: 'Activo',
    adherence: 81,
  },
  {
    id: 'demo-4',
    name: 'Javier Molina',
    diagnosis: 'Capsulitis adhesiva (hombro congelado)',
    progress: 30,
    sessionsCompleted: 6,
    sessionsTotal: 20,
    lastActive: 'Hace 4 días',
    routine: 'Movilidad glenohumeral',
    status: 'En pausa',
    adherence: 54,
  },
  {
    id: 'demo-5',
    name: 'Elena Castillo',
    diagnosis: 'Esguince de tobillo grado II',
    progress: 88,
    sessionsCompleted: 16,
    sessionsTotal: 18,
    lastActive: 'Hace 30 minutos',
    routine: 'Propiocepción + retorno a carrera',
    status: 'Alta próxima',
    adherence: 95,
  },
  {
    id: 'demo-6',
    name: 'Andrés Ruiz',
    diagnosis: 'Cervicalgia mecánica',
    progress: 71,
    sessionsCompleted: 12,
    sessionsTotal: 17,
    lastActive: 'Ayer',
    routine: 'Estiramientos cervicales + postural',
    status: 'Activo',
    adherence: 85,
  },
];

const demoPriorities: Priority[] = [
  { text: 'Revisar: Javier Molina', subtitle: 'Capsulitis adhesiva — sin actividad en 4 días', priority: 'ALTA' },
  { text: 'Revisar: Carlos Domínguez', subtitle: 'Adherencia 68%, por debajo del objetivo (80%)', priority: 'MEDIA' },
  { text: 'Revisar: Elena Castillo', subtitle: 'Alta próxima — programar evaluación final', priority: 'MEDIA' },
  { text: 'Revisar: María Fernández', subtitle: 'Progreso 78% — excelente evolución', priority: 'BAJA' },
  { text: 'Revisar: Lucía Romero', subtitle: 'Última sesión: 3 horas atrás — 81% calidad', priority: 'BAJA' },
];

const demoKpi: KpiData = {
  activePatients: demoPatients.length,
  sessionsToday: 4,
  weeklyAdherence: 79,
  pendingTokens: 2,
  isDemo: true,
};

const demoEvolution = [
  { week: 'Semana 1', value: 58 },
  { week: 'Semana 2', value: 64 },
  { week: 'Semana 3', value: 71 },
  { week: 'Semana 4', value: 79 },
];

const demoRoutines = [
  { patient: 'María Fernández', routine: 'Core + movilidad lumbar', exercises: 8, completion: 78 },
  { patient: 'Carlos Domínguez', routine: 'Fortalecimiento cuádriceps', exercises: 6, completion: 45 },
  { patient: 'Lucía Romero', routine: 'Eccéntricos + estiramientos', exercises: 5, completion: 62 },
  { patient: 'Elena Castillo', routine: 'Propiocepción + retorno a carrera', exercises: 7, completion: 88 },
];

const statusBadge: Record<DemoPatient['status'], string> = {
  'Activo': 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/20',
  'En pausa': 'bg-amber-500/15 text-amber-600 ring-amber-500/20',
  'Alta próxima': 'bg-cyan-500/15 text-cyan-600 ring-cyan-500/20',
};

export function DashboardFisio() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<KpiData>(emptyKpi);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [checkedPriorities, setCheckedPriorities] = useState<boolean[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [evolution, setEvolution] = useState<{ week: string; value: number }[]>([]);

  useEffect(() => {
    loadKpis();
    loadPriorities();
  }, [user?.id]);

  useEffect(() => {
    if (!kpi.isDemo) loadInsight();
  }, [kpi.isDemo]);

  const loadKpis = async () => {
    if (!user?.id) return;
    try {
      const { count: patientCount } = await supabase
        .from('pacientes_terapeutas')
        .select('*', { count: 'exact', head: true })
        .eq('terapeuta_id', user.id);

      const today = new Date().toISOString().split('T')[0];
      const { count: sessionCount } = await supabase
        .from('sesiones_completadas')
        .select('*', { count: 'exact', head: true })
        .gte('fecha', today);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: weekSessions } = await supabase
        .from('sesiones_completadas')
        .select('calidad_ejecucion')
        .eq('paciente_id', user.id)
        .gte('fecha', weekAgo);

      const { count: tokenCount } = await supabase
        .from('activation_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('terapeuta_id', user.id)
        .is('paciente_id', null);

      const adherence = weekSessions && weekSessions.length > 0
        ? Math.round(weekSessions.reduce((sum, s) => sum + (s.calidad_ejecucion || 0), 0) / weekSessions.length)
        : 0;

      setKpi({
        activePatients: patientCount ?? 0,
        sessionsToday: sessionCount ?? 0,
        weeklyAdherence: adherence,
        pendingTokens: tokenCount ?? 0,
        isDemo: false,
      });

      // Si no hay datos reales, inyecta datos de demostración para la cuenta demo.
      const isEmpty =
        (patientCount ?? 0) === 0 &&
        (sessionCount ?? 0) === 0 &&
        adherence === 0 &&
        (tokenCount ?? 0) === 0;
      if (isEmpty) {
        setKpi(demoKpi);
        setEvolution(demoEvolution);
      }
    } catch {
      // keep empty defaults
    } finally {
      setLoadingKpis(false);
    }
  };

  const loadPriorities = async () => {
    if (!user?.id) return;
    try {
      const { data: links } = await supabase
        .from('pacientes_terapeutas')
        .select('paciente_id')
        .eq('terapeuta_id', user.id);
      if (!links || links.length === 0) return;

      const patientIds = links.map((l) => l.paciente_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, diagnostico')
        .in('id', patientIds);

      const { data: recentSessions } = await supabase
        .from('sesiones_completadas')
        .select('paciente_id, fecha, calidad_ejecucion')
        .in('paciente_id', patientIds)
        .order('fecha', { ascending: false })
        .limit(10);

      if (profiles && profiles.length > 0) {
        const newPriorities: Priority[] = profiles.slice(0, 5).map((p) => {
          const patientSessions = recentSessions?.filter((s) => s.paciente_id === p.id) || [];
          const lastSession = patientSessions[0];
          const daysSinceLast = lastSession
            ? Math.floor((Date.now() - new Date(lastSession.fecha).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          const subtitle = lastSession
            ? `Última sesión: ${daysSinceLast} día(s) atrás - ${lastSession.calidad_ejecucion != null && lastSession.calidad_ejecucion > 0 ? `${lastSession.calidad_ejecucion}% calidad` : 'sin calificar'}`
            : 'Sin sesiones registradas';
          const priority: Priority['priority'] = daysSinceLast === null || daysSinceLast > 7 ? 'ALTA' : daysSinceLast > 3 ? 'MEDIA' : 'BAJA';
          return { text: `Revisar: ${p.full_name}`, subtitle: p.diagnostico || subtitle, priority };
        });
        setPriorities(newPriorities);
        setCheckedPriorities(new Array(newPriorities.length).fill(false));
      } else {
        // Sin pacientes reales: usa prioridades de demostración.
        setPriorities(demoPriorities);
        setCheckedPriorities(new Array(demoPriorities.length).fill(false));
      }
    } catch {
      // silently fail
    }
  };

  const loadInsight = async () => {
    setInsightLoading(true);
    setInsight(null);
    try {
      const { data: links } = await supabase
        .from('pacientes_terapeutas')
        .select('paciente_id')
        .eq('terapeuta_id', user?.id);

      let patientSummary = 'Sin datos de pacientes.';
      if (links && links.length > 0) {
        const ids = links.map((l) => l.paciente_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('full_name, diagnostico')
          .in('id', ids);
        const { data: sessions } = await supabase
          .from('sesiones_completadas')
          .select('paciente_id, calidad_ejecucion, fecha')
          .in('paciente_id', ids)
          .order('fecha', { ascending: false })
          .limit(20);

        const totalSessions = sessions?.length || 0;
        const avgAdherence = sessions && sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + (s.calidad_ejecucion || 0), 0) / sessions.length)
          : 0;

        patientSummary = `Pacientes: ${profiles?.length || 0}, Sesiones recientes: ${totalSessions}, Adherencia promedio: ${avgAdherence}%. ${profiles?.map(p => p.full_name).join(', ') || ''}`;
      }

      const result = await runAIJob('insights', {
        userPrompt: `Genera un insight clínico breve para el fisioterapeuta basado en estos datos reales: ${patientSummary}`,
      });
      if (result.success && result.result) {
        setInsight(result.result);
      } else {
        setInsight('No hay datos suficientes para generar un insight en este momento.');
      }
    } catch {
      setInsight('No se pudo conectar con Physi. Intenta más tarde.');
    } finally {
      setInsightLoading(false);
    }
  };

  const quickActions = [
    { title: 'Nueva Sesión AR', desc: 'Inicia un seguimiento remoto con biofeedback en tiempo real.', icon: 'videocam', color: 'bg-primary', cta: 'Comenzar ahora', route: '/patients' },
    { title: 'Cargar Paciente', desc: 'Sube historias clínicas o importa perfiles desde el sistema central.', icon: 'person_add', color: 'bg-secondary', cta: 'Importar', route: '/ocr-scanner' },
    { title: 'Generar Token', desc: 'Crea accesos temporales para nuevos usuarios o pacientes externos.', icon: 'generating_tokens', color: 'bg-tertiary', cta: 'Emitir llave', route: '/tokens' },
  ];

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const commandItems: CommandItem[] = quickActions.map((action) => ({
    label: action.title,
    icon: <Icon name={action.icon} size={18} className="text-primary" />,
    onSelect: () => navigate(action.route),
  }));

  const realIsEmpty =
    kpi.activePatients === 0 && kpi.sessionsToday === 0 && kpi.weeklyAdherence === 0 && kpi.pendingTokens === 0;
  const displayKpi = loadingKpis ? emptyDisplayKpi : kpi;

  const kpiCards = [
    { label: 'Pacientes Activos', value: displayKpi.activePatients, icon: 'group' },
    { label: 'Sesiones Hoy', value: displayKpi.sessionsToday, icon: 'calendar_today' },
    { label: 'Adherencia Semanal', value: displayKpi.weeklyAdherence > 0 ? `${displayKpi.weeklyAdherence}%` : '—', icon: 'verified' },
    { label: 'Tokens Pendientes', value: String(displayKpi.pendingTokens).padStart(2, '0'), icon: 'key' },
  ];

  return (
    <div className="space-y-8 overflow-x-hidden max-w-7xl mx-auto w-full">
      <OnboardingGuide />
      {/* Welcome */}
      <div className="relative">
        <div className="blob-teal w-40 h-40 -top-10 -left-10 opacity-60" />
        <div className="flex items-center gap-4 relative">
          <MascotAnimation type="greeting" size="md" />
          <div>
            <h2 className="font-display font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living">{greeting}, {user?.full_name?.split(' ')[0] || ''}</h2>
            <p className="text-outline font-title-md text-title-md">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="ml-auto">
            <HelpGuideButton />
          </div>
        </div>
      </div>

      {/* Search / Command palette */}
      <div className="w-full">
        <CommandPalette items={commandItems} />
      </div>

      {/* Insight banner */}
      <InsightBanner
        title="Bienvenido de vuelta"
        description={loadingKpis ? 'Cargando resumen...' : realIsEmpty ? 'Aún no hay datos suficientes para mostrar un resumen.' : `Tienes ${kpi.activePatients} paciente(s) activo(s) y ${kpi.sessionsToday} sesión(es) registradas hoy.`}
      />

      {/* KPI cards */}
      <div className="section-bg-teal grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="glass-card vibrant-hover p-6 rounded-3xl shadow-ambient-teal group cursor-default relative overflow-hidden accent-teal breathe-teal hover-lift"
          >
            <div className="blob-teal w-24 h-24 -top-6 -right-6 opacity-50" />
            <div className="flex justify-between items-start mb-4 relative">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center breathe-teal">
                <Icon name={card.icon} size={24} className="icon-accent-teal animate-breathe-icon" />
              </div>
            </div>
            <p className="text-on-surface-variant text-sm font-semibold uppercase tracking-wider relative">{card.label}</p>
            <h3 className="text-display-lg text-3xl lg:text-display-lg font-display-lg mt-1 gradient-text-living relative">{card.value}</h3>
            {loadingKpis ? (
              <p className="text-[10px] text-outline mt-1 inline-block px-2 py-0.5 rounded-full relative">Cargando...</p>
            ) : realIsEmpty ? (
              <p className="text-[10px] text-outline mt-1 badge-warm inline-block px-2 py-0.5 rounded-full relative">Sin datos suficientes</p>
            ) : (
              <p className="text-[10px] text-success mt-1 badge-lime inline-block px-2 py-0.5 rounded-full breathe-badge relative">Datos reales</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, i) => (
          <motion.button
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.route)}
            className="relative overflow-hidden group glass-panel p-8 rounded-[40px] text-left transition-all hover-lift"
          >
            <div className={`absolute -right-8 -bottom-8 w-48 h-48 ${action.color} opacity-10 blur-3xl group-hover:scale-150 transition-transform duration-500`} />
            <div className={`w-14 h-14 ${action.color} rounded-3xl shadow-lg flex items-center justify-center mb-4`}>
              <Icon name={action.icon} filled size={28} className="text-white" />
            </div>
            <h3 className="font-title-md text-title-md text-on-surface mb-2">{action.title}</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-4">{action.desc}</p>
            <span className="text-primary font-bold flex items-center gap-1 text-sm">
              {action.cta} <Icon name="arrow_forward" size={18} />
            </span>
          </motion.button>
        ))}
        <div className="flex items-center justify-center">
          <ExpandableToggle expandLabel="Acciones Rápidas" />
        </div>
      </div>

      {/* Insights & Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassPanel className="rounded-[32px] overflow-hidden shadow-[0_12px_40px_rgba(13,148,136,0.12)] hover-lift border-l-4 border-l-teal-400/60 dark:border-l-teal-600/40">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-primary/15">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
                  <MedicalIcon name="activity" size={28} className="text-primary animate-breathe-icon" />
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-sm lg:text-headline-md text-primary tracking-wide">Informe Clínico</h3>
                  <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">Physi Clínico</p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1.5 rounded-full ring-1 ring-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> IA Activa
              </span>
            </div>

            {/* Body */}
            <div className="px-8 py-6 bg-primary-container/10">
              {insightLoading ? (
                <div className="flex items-center gap-3 text-sm text-on-surface-variant py-8">
                  <Spinner size={20} className="text-primary" />
                  <span>Analizando datos clínicos...</span>
                </div>
              ) : insight ? (
                <div className="space-y-4">
                  {/* Severity badge */}
                  {(() => {
                    const lower = insight.toLowerCase();
                    let severity: 'baja' | 'media' | 'alta' | null = null;
                    if (lower.includes('urgente') || lower.includes('crítica') || lower.includes('alta') || lower.includes('inmediata')) severity = 'alta';
                    else if (lower.includes('moderada') || lower.includes('media') || lower.includes('atención')) severity = 'media';
                    else if (lower.includes('leve') || lower.includes('baja') || lower.includes('estable')) severity = 'baja';
                    if (!severity) return null;
                    const colors = { alta: 'bg-red-500/15 text-red-600 ring-red-500/20', media: 'bg-amber-500/15 text-amber-600 ring-amber-500/20', baja: 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/20' };
                    const labels = { alta: 'Prioridad Alta', media: 'Prioridad Media', baja: 'Prioridad Baja' };
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ${colors[severity]}`}>
                          <span className={`w-2 h-2 rounded-full ${severity === 'alta' ? 'bg-red-500' : severity === 'media' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                          {labels[severity]}
                        </span>
                      </div>
                    );
                  })()}
                  <div className="min-h-[120px] p-4 bg-primary-container/20 rounded-2xl border border-primary/10">
                    {formatAIReport(insight)}
                  </div>
                </div>
              ) : (
                <div className="min-h-[120px] p-4 bg-primary-container/20 rounded-2xl border border-primary/10 flex flex-col items-center justify-center text-center gap-3">
                  <Icon name="insights" size={32} className="text-primary/40" />
                  <p className="text-sm text-on-surface-variant leading-relaxed max-w-md">
                    Datos insuficientes para generar insights. Completa más sesiones para obtener recomendaciones personalizadas.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-8 py-4 bg-surface-variant/10 border-t border-outline-variant/20">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <Icon name="schedule" size={14} className="opacity-60" />
                <span>{new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <Icon name="auto_awesome" size={12} className="text-primary" />
                Generado por IA
              </span>
            </div>

            {/* Action */}
            <div className="px-8 pb-6">
              <button
                onClick={loadInsight}
                disabled={insightLoading}
                className="bg-primary text-white py-3 px-6 rounded-xl font-bold hover:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 premium-btn"
              >
                {insightLoading ? <Spinner size={18} className="text-current" /> : <Icon name="refresh" size={18} />}
                Actualizar Informe
              </button>
            </div>
          </GlassPanel>
        </motion.div>

        <GlassPanel className="p-8 rounded-[32px] hover-lift relative overflow-hidden border-l-4 border-l-teal-400/60 dark:border-l-teal-600/40 shadow-[0_8px_30px_rgba(13,148,136,0.10)]">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400/15 to-teal-500/10 blur-2xl pointer-events-none" />
          <div className="flex justify-between items-center mb-5 relative">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/15 to-cyan-400/10 flex items-center justify-center ring-1 ring-cyan-500/20 breathe-teal">
                <Icon name="flag" size={24} className="icon-accent-cyan animate-breathe-icon" />
              </div>
              <div>
                <h3 className="font-headline-md text-headline-sm lg:text-headline-md text-on-surface">Prioridades del Día</h3>
                <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">
                  {checkedPriorities.filter(Boolean).length} de {priorities.length} completadas
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {priorities.length > 0 && (
            <div className="h-1.5 bg-surface-variant/20 rounded-full overflow-hidden mb-5 relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${priorities.length ? (checkedPriorities.filter(Boolean).length / priorities.length) * 100 : 0}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-500"
              />
            </div>
          )}

          <div className="space-y-3 relative">
            {priorities.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">No hay prioridades pendientes. Asigna pacientes para ver recomendaciones.</p>
            ) : (
              priorities.map((p, i) => {
                const checked = checkedPriorities[i];
                const priorityColor =
                  p.priority === 'ALTA' ? 'text-cyan-600 bg-cyan-500/10 ring-cyan-500/20' :
                  p.priority === 'MEDIA' ? 'text-teal-600 bg-teal-500/10 ring-teal-500/20' :
                  'text-on-surface-variant bg-surface-variant/10 ring-outline-variant/20';
                return (
                  <motion.label
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl border transition-colors duration-300 ${
                      checked
                        ? 'bg-gradient-to-r from-cyan-500/10 to-teal-500/5 border-cyan-500/30'
                        : 'bg-surface-container-low/40 border-outline-variant/20 hover:border-cyan-500/20'
                    }`}
                  >
                    {/* Animated checkbox */}
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = [...checkedPriorities];
                          next[i] = !next[i];
                          setCheckedPriorities(next);
                        }}
                        className="sr-only peer"
                      />
                      <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                        checked
                          ? 'bg-gradient-to-br from-cyan-400 to-teal-500 border-transparent shadow-lg shadow-cyan-500/30'
                          : 'border-outline-variant/40 bg-surface-container-low/60'
                      }`}>
                        <motion.div
                          initial={false}
                          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <Icon name="check" size={18} className="text-white" />
                        </motion.div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium transition-all duration-300 ${checked ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                        {p.text}
                      </p>
                      <p className="text-xs text-outline mt-0.5">{p.subtitle}</p>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ring-1 ${priorityColor}`}>
                      {p.priority}
                    </span>
                  </motion.label>
                );
              })
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Remote monitoring hub */}
      <GlassPanel className="p-8 rounded-[40px] relative overflow-hidden hover-lift border-l-4 border-l-teal-400/60 dark:border-l-teal-600/40 shadow-[0_8px_30px_rgba(13,148,136,0.10)]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface mb-2">Monitoreo Remoto</h3>
              <p className="text-on-surface-variant text-sm">Sesiones y actividad reciente de tus pacientes</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
              <span className="text-xs font-bold text-success tracking-wider">SINCRONIZADO</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-6">
            <div className="flex -space-x-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-primary-container flex items-center justify-center text-on-primary-container font-bold">
                  P{i}
                </div>
              ))}
              <div className="w-12 h-12 rounded-full border-4 border-white bg-surface-container-highest flex items-center justify-center text-outline font-bold text-sm">
                +12
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/patients')}
            className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 px-6 py-3 font-bold text-primary hover:bg-white/30 transition-all"
          >
            Ver Pacientes
          </button>
        </div>
      </GlassPanel>

      {/* Exercises section */}
      <section className="section-bg-cyan relative">
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center ring-1 ring-cyan-500/20">
            <Icon name="self_improvement" size={26} className="icon-accent-cyan animate-breathe-icon" />
          </div>
          <div>
            <h3 className="font-headline-md text-headline-sm lg:text-headline-md text-on-surface">Ejercicios Asignados</h3>
            <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">Rutinas activas</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {realIsEmpty ? (
            <div className="col-span-full flex flex-col items-center justify-center text-center py-12 gap-3">
              <Icon name="sports_gymnastics" size={32} className="text-primary/40" />
              <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">Aún no has asignado rutinas a tus pacientes. Carga un paciente o crea una rutina para verla aquí.</p>
            </div>
          ) : (
            <div className="col-span-full glass-card p-6 rounded-2xl accent-cyan relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-title-md text-title-md text-on-surface">Rutinas activas</h4>
                  <p className="text-sm text-on-surface-variant mt-1">{kpi.activePatients} paciente(s) con rutinas asignadas</p>
                </div>
                <button onClick={() => navigate('/patients')} className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors">
                  Ver pacientes
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Progress section */}
      <section className="section-bg-emerald relative">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
              <Icon name="trending_up" size={26} className="icon-accent-emerald animate-breathe-icon" />
            </div>
            <div>
              <h3 className="font-headline-md text-headline-sm lg:text-headline-md text-on-surface">Progreso de Adherencia</h3>
              <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5">Evolución semanal</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-[32px] accent-emerald hover-lift relative overflow-hidden z-10">
          {evolution.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 gap-3">
              <Icon name="trending_up" size={32} className="text-primary/40" />
              <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">Completa tus primeras sesiones para ver tu progreso de adherencia aquí.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {evolution.map((e, i) => (
                <div key={e.week}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-on-surface font-medium">{e.week}</span>
                    <span className="icon-accent-emerald font-bold">{e.value}%</span>
                  </div>
                  <div className="h-3 bg-surface-variant/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${e.value}%` }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
