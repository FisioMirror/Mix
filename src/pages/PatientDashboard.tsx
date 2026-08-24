import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { SkeletonCard } from '../components/ui/Skeleton';
import { TypewriterText } from '../components/ui/TypewriterText';
import { InsightBanner } from '../components/ui/InsightBanner';
import { SimpleCalendar } from '../components/ui/SimpleCalendar';
import { MedicalIcon } from '../components/ui/MedicalIcon';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { runAIJob } from '../lib/ai';
import { OnboardingGuide } from '../components/OnboardingGuide';
import MascotAnimation from '../components/ui/MascotAnimation';
import { useToast } from '../components/ui/ToastProvider';
import { useGamification } from '../hooks/useGamification';
import { AchievementShowcase, AchievementUnlockModal } from '../components/AchievementShowcase';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';

interface PatientKpi {
  streak: number;
  totalSessions: number;
  weeklyMinutes: number;
  isDemo: boolean;
}

const emptyKpi: PatientKpi = { streak: 0, totalSessions: 0, weeklyMinutes: 0, isDemo: false };

// Mensajes motivacionales para estados vacíos (0 → humano)
const emptyMessages: Record<string, string> = {
  Racha: '¡Comienza hoy tu racha!',
  Sesiones: 'Aún no tienes sesiones. ¡Empieza tu primera!',
  Minutos: '¡Tu primer minuto cuenta!',
  Ejercicios: '¡Tu primer ejercicio te espera!',
};

interface AssignedExercise {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
}

interface WeekActivity {
  day: string;
  minutes: number;
}

interface EvolutionWeek {
  label: string;
  pct: number;
}

const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function PatientDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<PatientKpi>(emptyKpi);
  const [exercises, setExercises] = useState<AssignedExercise[]>([]);
  const [therapist, setTherapist] = useState<string | null>(null);
  const [weekActivity, setWeekActivity] = useState<WeekActivity[]>(weekDays.map(d => ({ day: d, minutes: 0 })));
  const [allSessionDates, setAllSessionDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [evolution] = useState<EvolutionWeek[] | null>([
    { label: 'Semana 1', pct: 45 },
    { label: 'Semana 2', pct: 58 },
    { label: 'Semana 3', pct: 67 },
    { label: 'Semana 4', pct: 78 },
  ]);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const toast = useToast();
  const gamification = useGamification();

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { count: sessions } = await supabase
        .from('sesiones_completadas')
        .select('*', { count: 'exact', head: true })
        .eq('paciente_id', user.id);

      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: recentSessions } = await supabase
        .from('sesiones_completadas')
        .select('duracion_segundos, fecha')
        .eq('paciente_id', user.id)
        .gte('fecha', weekAgo);

      const weeklyMin = (recentSessions?.reduce((sum, s) => sum + (s.duracion_segundos ?? 0), 0) ?? 0) / 60 || 0;

      const { data: allSessions } = await supabase
        .from('sesiones_completadas')
        .select('fecha')
        .eq('paciente_id', user.id)
        .order('fecha', { ascending: false });

      const streak = computeStreak(allSessions?.map(s => s.fecha) || []);
      setAllSessionDates((allSessions ?? []).map(s => new Date(s.fecha)).filter(d => !isNaN(d.getTime())));

      const dayMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().split('T')[0];
        dayMap.set(key, 0);
      }
      recentSessions?.forEach(s => {
        const key = new Date(s.fecha).toISOString().split('T')[0];
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + ((s.duracion_segundos ?? 0) / 60));
      });
      const activity: WeekActivity[] = [];
      const keys = Array.from(dayMap.keys());
      keys.forEach((k, idx) => {
        activity.push({ day: weekDays[idx], minutes: Math.round(dayMap.get(k) || 0) });
      });
      setWeekActivity(activity);

      const { data: patientExercises } = await supabase
        .from('patient_exercises')
        .select('id, ejercicio_nombre, series, repeticiones')
        .eq('paciente_id', user.id);

      const { data: therapistLink } = await supabase
        .from('pacientes_terapeutas')
        .select('terapeuta_id')
        .eq('paciente_id', user.id)
        .maybeSingle();

      let therapistName: string | null = null;
      if (therapistLink?.terapeuta_id) {
        const { data: therapistProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', therapistLink.terapeuta_id)
          .maybeSingle();
        therapistName = therapistProfile?.full_name ?? null;
      }

      setKpi({
        streak,
        totalSessions: sessions ?? 0,
        weeklyMinutes: Math.round(weeklyMin),
        isDemo: false,
      });

      // Si no hay datos reales (cuenta demo), inyectar datos ficticios para
      // que el paciente demo vea una experiencia poblada y realista.
      const isEmpty = (sessions ?? 0) === 0 && weeklyMin === 0 && streak === 0;
      if (isEmpty) {
        setKpi({
          streak: 4,
          totalSessions: 12,
          weeklyMinutes: 48,
          isDemo: true,
        });
        setWeekActivity([
          { day: 'L', minutes: 12 },
          { day: 'M', minutes: 0 },
          { day: 'X', minutes: 15 },
          { day: 'J', minutes: 0 },
          { day: 'V', minutes: 10 },
          { day: 'S', minutes: 11 },
          { day: 'D', minutes: 0 },
        ]);
        setExercises([
          { id: 'demo-ex-1', name: 'Flexión de hombro', subtitle: '3 series • 12 repet.', icon: 'self_improvement' },
          { id: 'demo-ex-2', name: 'Rotación externa', subtitle: '3 series • 15 repet.', icon: 'self_improvement' },
          { id: 'demo-ex-3', name: 'Circunducción', subtitle: '2 series • 10 repet.', icon: 'self_improvement' },
          { id: 'demo-ex-4', name: 'Estiramiento de trapecio', subtitle: '2 series • 4 repet.', icon: 'self_improvement' },
        ]);
        setAllSessionDates([
          new Date(Date.now() - 86400000),
          new Date(Date.now() - 2 * 86400000),
          new Date(Date.now() - 3 * 86400000),
          new Date(Date.now() - 5 * 86400000),
        ]);
      }

      if (patientExercises && patientExercises.length > 0) {
        setExercises(patientExercises.map((e) => ({
          id: e.id,
          name: e.ejercicio_nombre || 'Ejercicio',
          subtitle: `${e.series || 0} series • ${e.repeticiones || 0} repet.`,
          icon: 'self_improvement',
        })));
      }

      setTherapist(therapistName);

      // NOTE: Achievements are NOT advanced here. Counters must only increment
      // in response to an explicit user action (e.g. completing a session in
      // the AR mirror), never on dashboard mount/login. This component only
      // reads gamification state for display; it must not mutate it on load.
    } catch {
      // keep empty defaults
    } finally {
      setLoading(false);
    }
  };

  const computeStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;
    const uniqueDays = new Set(dates.map(d => new Date(d).toISOString().split('T')[0]));
    let streak = 0;
    let current = new Date();
    while (uniqueDays.has(current.toISOString().split('T')[0])) {
      streak++;
      current = new Date(current.getTime() - 86400000);
    }
    return streak;
  };

  const maxMinutes = Math.max(...weekActivity.map(d => d.minutes), 1);

  const kpiCards = [
    { label: 'Racha', value: kpi.streak, unit: 'días', icon: 'local_fire_department', glow: 'breathe-teal', blob: 'blob-teal', grad: 'gradient-text-teal', accent: 'accent-teal', iconAccent: 'icon-accent-teal' },
    { label: 'Sesiones', value: kpi.totalSessions, unit: 'en total', icon: 'check_circle', glow: 'breathe-emerald', blob: 'blob-emerald', grad: 'gradient-text-teal', accent: 'accent-cyan', iconAccent: 'icon-accent-cyan' },
    { label: 'Minutos', value: kpi.weeklyMinutes, unit: 'sem.', icon: 'timer', glow: 'breathe-teal', blob: 'blob-teal', grad: 'gradient-text-teal', accent: 'accent-emerald', iconAccent: 'icon-accent-emerald' },
  ];

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full px-4 lg:px-6">
      <OnboardingGuide />

      {/* Achievement Unlock Modal */}
      <AchievementUnlockModal
        achievement={gamification.newlyUnlocked}
        role="patient"
        onClose={gamification.dismissUnlock}
      />
      <section className="space-y-1 relative section-bg-teal p-4 rounded-3xl">
        <div className="blob-teal w-40 h-40 -top-6 -left-6 opacity-40" />
        <div className="flex items-center gap-4 relative z-10">
          <MascotAnimation type="greeting" size="md" />
          <div className="flex-1">
            <h2 className="font-display font-headline-lg-mobile text-headline-lg-mobile lg:text-headline-lg gradient-text-editorial relative">
              <TypewriterText text={`Hola, ${user?.full_name || 'paciente'}. Listo para tu recuperación?`} />
            </h2>
            <p className="text-on-surface-variant text-body-lg relative">Comienza tu recuperación hoy</p>
          </div>
        </div>
      </section>

      {kpi.totalSessions > 0 && kpi.weeklyMinutes > 0 && (
        <InsightBanner
          title="Sigue así!"
          description={`Has completado ${kpi.totalSessions} sesiones en total y ${kpi.weeklyMinutes} minutos esta semana.`}
        />
      )}

      {kpi.streak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 glass-card p-4 rounded-2xl section-bg-teal"
        >
          <MascotAnimation type="achievement" size="racha" className="shrink-0" />
          <div>
            <p className="font-bold text-on-surface">¡Llevas {kpi.streak} {kpi.streak === 1 ? 'día' : 'días'} de racha!</p>
            <p className="text-sm text-on-surface-variant">Mantén la constancia para seguir sumando días.</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: KPIs + AR session */}
        <div className="lg:col-span-2 space-y-6">
          <section className="grid grid-cols-3 lg:grid-cols-3 gap-3 section-bg-teal p-4 rounded-3xl">
            {kpiCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card shadow-ambient-teal p-5 rounded-3xl space-y-2 hover-lift ${card.glow} ${card.accent} relative overflow-hidden`}
              >
                <div className={`${card.blob} w-16 h-16 -top-3 -right-3 opacity-40`} />
                <div className={`${card.iconAccent} animate-breathe-icon relative`}>
                  <Icon name={card.icon} filled size={18} />
                </div>
                <p className="text-on-surface-variant font-label-sm text-label-sm uppercase relative">{card.label}</p>
                <div className="relative">
                  {card.value > 0 ? (
                    <>
                      <span className={`${card.grad} font-headline-lg-mobile text-headline-lg-mobile`}>{card.value}</span>
                      <span className="text-primary/70 font-label-sm text-label-sm ml-1">{card.unit}</span>
                    </>
                  ) : (
                    <span className="text-on-surface-variant font-label-md text-label-md italic leading-tight block">{emptyMessages[card.label]}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </section>

          <section className="section-bg-teal p-4 rounded-3xl">
            <div className="relative overflow-hidden glass-card vibrant-hover shadow-ambient-teal rounded-3xl p-6 min-h-[220px] flex flex-col justify-between group hover-lift accent-teal shimmer-border">
              <div className="blob-teal w-40 h-40 top-0 right-0 -mr-10 -mt-10 opacity-50" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1 bg-primary text-on-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 breathe-badge glow-teal relative z-10">
                  <Icon name="auto_awesome" filled size={14} className="animate-breathe-icon" /> Recomendado
                </div>
                <h3 className="font-title-md text-title-md text-on-surface mb-2 gradient-text-living relative z-10">Sesión AR Recomendada</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed max-w-[70%] relative z-10">
                  {exercises.length > 0 ? `${exercises[0].name} con asistencia por cámara en tiempo real.` : 'Inicia una sesión de seguimiento con cámara en tiempo real.'}
                </p>
              </div>
              <button
                onClick={() => navigate('/calibration')}
                className="premium-btn active:scale-95 bg-primary text-on-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-glow-primary transition-transform relative z-10 breathe-teal"
              >
                Iniciar Sesión <Icon name="play_arrow" size={20} />
              </button>
            </div>
          </section>

          <CollapsibleSection title="Mi Rutina Actual" icon="assignment" defaultOpen className="section-bg-cyan">
            <div className="flex justify-end mb-3 relative z-10">
              <button onClick={() => navigate('/exercises')} className="text-primary font-label-sm text-label-sm hover-lift">Ver Todo</button>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : exercises.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exercises.map((ex, i) => (
                  <motion.div
                    key={ex.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/calibration')}
                    className="glass-card shadow-ambient-teal p-4 rounded-2xl flex items-center gap-4 active:scale-95 cursor-pointer group hover-lift accent-cyan relative overflow-hidden"
                  >
                    <div className="blob-blue w-16 h-16 -top-3 -right-3 opacity-20 group-hover:opacity-50 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center icon-accent-cyan animate-breathe-icon breathe-teal relative">
                      <MedicalIcon name="exercise" size={24} />
                    </div>
                    <div className="flex-1 relative">
                      <p className="font-bold text-on-surface">{ex.name}</p>
                      <p className="text-sm text-on-surface-variant">{ex.subtitle}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-primary/20 group-hover:bg-primary group-hover:text-on-primary flex items-center justify-center transition-all breathe-badge relative">
                      <Icon name="play_arrow" size={20} />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-state-premium glass-card p-8 rounded-2xl text-center text-on-surface-variant flex flex-col items-center relative overflow-hidden hover-lift accent-cyan">
                <div className="blob-lime w-32 h-32 -top-8 -right-8 opacity-20" />
                <MedicalIcon name="clipboard" size={48} className="text-primary/40 mb-4 animate-breathe-icon relative" />
                <p className="font-medium relative">{emptyMessages.Ejercicios}</p>
                <p className="text-sm mt-1 relative">Tu fisioterapeuta preparará tu rutina pronto. ¡Ánimo, este es el primer paso de tu recuperación!</p>
              </div>
            )}
          </CollapsibleSection>
        </div>

        {/* Right column: Progress chart + therapist */}
        <div className="space-y-6 overflow-x-hidden lg:col-span-1 w-full">
          <CollapsibleSection title="Progreso Semanal" icon="trending_up" className="section-bg-emerald">
            <SimpleCalendar markedDates={allSessionDates} />
            <div className="glass-card shadow-ambient-teal rounded-3xl p-6 h-48 relative overflow-hidden flex flex-col justify-end hover-lift accent-emerald shimmer-border">
              <div className="h-full flex items-end justify-between gap-2">
                {weekActivity.map((d, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((d.minutes / maxMinutes) * 100, 5)}%` }}
                    transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-full rounded-t-lg ${i === weekActivity.length - 1 ? 'gradient-living glow-teal' : 'bg-primary/30'}`}
                      style={{ height: '100%' }}
                    />
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">{d.day}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            {/* Gráfica de evolución semanal con datos demo */}
            <div className="glass-card shadow-ambient-teal rounded-3xl p-6 space-y-4 relative overflow-hidden hover-lift accent-emerald">
              <div className="flex justify-between items-center relative z-10">
                <h4 className="font-title-sm text-title-sm gradient-text-emerald">Evolución</h4>
              </div>
              {evolution && evolution.length > 0 ? (
                <div className="space-y-3 relative z-10">
                  {evolution.map((w, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">{w.label}</span>
                        <span className="text-on-surface font-bold gradient-text-emerald">{w.pct}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-primary/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${w.pct}%` }}
                          transition={{ delay: i * 0.15, duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-full gradient-living glow-emerald"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6 gap-2 relative z-10">
                  <Icon name="trending_up" size={28} className="text-primary/40" />
                  <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">Completa tus primeras sesiones para ver tu progreso de adherencia aquí.</p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {therapist && (
            <section className="glass-card p-4 rounded-2xl flex items-center gap-3 hover-lift accent-emerald relative overflow-hidden">
              <div className="blob-teal w-20 h-20 -top-4 -right-4 opacity-30" />
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container icon-accent-emerald animate-breathe-icon breathe-emerald relative">
                <Icon name="person" size={20} />
              </div>
              <div className="relative">
                <p className="text-xs text-on-surface-variant">Tu fisioterapeuta</p>
                <p className="font-bold text-on-surface gradient-text-teal">{therapist}</p>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Bottom row: Achievements + AI Insight — full-width balanced grid to fill desktop space */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Achievement Showcase */}
        <CollapsibleSection title="Logros" icon="emoji_events" className="section-bg-amber w-full lg:col-span-2">
          <div className="glass-card rounded-2xl p-4 relative z-10 w-full">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {gamification.unlockedCount} desbloqueados
              </span>
              <span className="font-label-sm text-label-sm text-primary font-bold">
                {Math.round(gamification.totalProgress * 100)}% completado
              </span>
            </div>
            <AchievementShowcase achievements={gamification.achievements} compact={false} />
          </div>
        </CollapsibleSection>

        {/* AI Insight Card */}
        <CollapsibleSection title="Insights" icon="auto_awesome" className="shadow-ambient-blue hover-lift accent-teal breathe-teal w-full">
          <div className="relative overflow-hidden">
          <div className="blob-blue w-32 h-32 -top-6 -right-6 opacity-40" />
          <div className="flex items-center gap-2 relative">
            <div className="w-2 h-8 bg-primary rounded-full breathe-badge" />
            <h4 className="font-title-md text-title-md gradient-text-editorial">Sugerencia de Physi</h4>
          </div>
          <div className="p-4 bg-primary-container/20 rounded-2xl border border-primary/10 relative">
            {recLoading ? (
              <div className="flex items-center gap-2">
                <Icon name="progress_activity" size={16} className="text-primary animate-spin" />
                <p className="text-on-surface-variant italic leading-relaxed text-sm">Analizando tu progreso para generar una recomendación personalizada…</p>
              </div>
            ) : recommendation ? (
              <p className="text-on-surface-variant italic leading-relaxed text-sm whitespace-pre-wrap break-words">{recommendation}</p>
            ) : (
              <p className="text-on-surface-variant italic leading-relaxed text-sm">
                {kpi.streak >= 3
                  ? `¡Excelente! Vas ${kpi.streak} días seguidos. Tu adherencia está por encima del promedio. Mantén la constancia para maximizar tu recuperación.`
                  : 'Basado en tu actividad reciente, te sugerimos completar al menos una sesión diaria para mejorar tu progresión clínica.'}
              </p>
            )}
          </div>
          <button
            onClick={async () => {
              if (!recommendation && !recLoading) {
                setRecLoading(true);
                try {
                  const result = await runAIJob('insights', {
                    userPrompt: `Genera una recomendación clínica breve y personalizada para este paciente. Datos reales: sesiones totales=${kpi.totalSessions}, racha=${kpi.streak} días, minutos esta semana=${kpi.weeklyMinutes}. Responde SIEMPRE en español.`,
                  });
                  if (result.success && result.result) {
                    setRecommendation(result.result);
                    toast.success('Recomendación generada. Iniciando sesión…');
                  } else {
                    setRecommendation('Datos insuficientes para generar una recomendación personalizada. Completa más sesiones para obtener sugerencias específicas.');
                  }
                } catch {
                  toast.error('No se pudo conectar con Physi. Intenta de nuevo.');
                } finally {
                  setRecLoading(false);
                }
              }
              setTimeout(() => navigate('/calibration'), 800);
            }}
            disabled={recLoading}
            className="premium-btn w-full bg-primary text-on-primary py-3 rounded-xl font-bold hover:scale-[0.98] transition-transform flex items-center justify-center gap-2 glow-teal breathe-teal relative disabled:opacity-50"
          >
            <Icon name={recLoading ? 'progress_activity' : 'auto_awesome'} size={18} className={recLoading ? 'animate-spin' : 'animate-breathe-icon'} /> Aplicar Recomendación
          </button>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
