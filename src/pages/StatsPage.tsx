import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import { Icon } from '../components/ui/Icon';
import { GlassPanel } from '../components/ui/Glass';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { exportSimplePDF } from '../lib/pdfExport';
import { useToast } from '../components/ui/ToastProvider';
import { AnimatedTabs } from '../components/ui/AnimatedTabs';
import { KpiCardSkeleton } from '../components/ui/PremiumSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { runAIJob } from '../lib/ai';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';

const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ---- Recharts theme palette (vivid, Material-inspired) ----
const CHART_COLORS = {
  primary: '#156966',
  primarySoft: '#4DB6AC',
  secondary: '#B85C00',
  tertiary: '#5C5CFF',
  warm: '#E8A33D',
  success: '#2E7D32',
  warning: '#F59E0B',
  error: '#D32F2F',
  info: '#0288D1',
  cyan: '#22d3ee',
  emerald: '#10b981',
};

const PIE_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.tertiary,
  CHART_COLORS.warm,
  CHART_COLORS.cyan,
  CHART_COLORS.info,
  CHART_COLORS.emerald,
  CHART_COLORS.success,
];

// ---- Shared tooltip styles ----
const tooltipStyle = {
  contentStyle: {
    background: 'rgba(20, 30, 35, 0.92)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(8px)',
  },
  itemStyle: { color: '#fff' },
  labelStyle: { color: '#9CB4B8', fontWeight: 700, marginBottom: 4 },
  cursor: { fill: 'rgba(21, 105, 102, 0.08)' },
};

interface SessionRow {
  paciente_id?: string;
  fecha: string;
  ejercicio_nombre: string | null;
  duracion_segundos: number | null;
  repeticiones: number | null;
  calidad_ejecucion: number | null;
}

interface PatientWithSessions {
  id: string;
  full_name: string;
  diagnostico: string | null;
  sessionCount: number;
  avgQuality: number;
  lastSessionDate: string | null;
}

export function StatsPage() {
  const user = useAuthStore((s) => s.user);
  const isFisio = user?.role === 'fisioterapeuta';
  const toast = useToast();

  // ---- Shared state ----
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [avgPrecision, setAvgPrecision] = useState(0);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [chartRange, setChartRange] = useState<'mensual' | 'semanal'>('mensual');

  // ---- Paciente-only state (gamification kept for patients) ----
  const [streak, setStreak] = useState(0);
  const [weekData, setWeekData] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  // ---- Fisioterapeuta-only state (clinical metrics) ----
  const [patients, setPatients] = useState<PatientWithSessions[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [totalPatients, setTotalPatients] = useState(0);
  const [activePatients, setActivePatients] = useState(0);
  const [dailySessions, setDailySessions] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const computeStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;
    const uniqueDays = new Set(dates.map(d => new Date(d).toISOString().split('T')[0]));
    let str = 0;
    let current = new Date();
    while (uniqueDays.has(current.toISOString().split('T')[0])) {
      str++;
      current = new Date(current.getTime() - 86400000);
    }
    return str;
  };

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      if (isFisio) {
        // ---- Fisioterapeuta: clinical practice metrics ----
        const { data: links } = await supabase
          .from('pacientes_terapeutas')
          .select('paciente_id')
          .eq('terapeuta_id', user.id);
        const patientIds = (links || []).map(l => l.paciente_id);

        setTotalPatients(patientIds.length);

        if (patientIds.length > 0) {
          const { data: allSessions } = await supabase
            .from('sesiones_completadas')
            .select('paciente_id, fecha, ejercicio_nombre, duracion_segundos, repeticiones, calidad_ejecucion')
            .in('paciente_id', patientIds)
            .order('fecha', { ascending: false });
          const s = (allSessions || []) as unknown as SessionRow[];

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, diagnostico')
            .in('id', patientIds);
          const pMap = new Map((profiles || []).map(p => [p.id, p]));
          const pw: PatientWithSessions[] = patientIds.map(pid => {
            const ps = s.filter(x => x.paciente_id === pid);
            return {
              id: pid,
              full_name: pMap.get(pid)?.full_name || 'Paciente',
              diagnostico: pMap.get(pid)?.diagnostico || null,
              sessionCount: ps.length,
              avgQuality: ps.length > 0 ? Math.round(ps.reduce((sum, r) => sum + (r.calidad_ejecucion || 0), 0) / ps.length) : 0,
              lastSessionDate: ps.length > 0 ? ps[0].fecha : null,
            };
          });
          setPatients(pw);
          setActivePatients(pw.filter(p => p.sessionCount > 0).length);

          applyFisioFilter(s, pw, '');
        }
      } else {
        // ---- Paciente: keep existing progress/streak display ----
        const { data: allSessions } = await supabase
          .from('sesiones_completadas')
          .select('fecha, ejercicio_nombre, duracion_segundos, repeticiones, calidad_ejecucion')
          .eq('paciente_id', user.id)
          .order('fecha', { ascending: false });
        const s = (allSessions || []) as unknown as SessionRow[];
        setSessions(s);
        setTotalSessions(s.length);
        setTotalMinutes(Math.round(s.reduce((sum, r) => sum + (r.duracion_segundos || 0), 0) / 60));
        setAvgPrecision(s.length > 0 ? Math.round(s.reduce((sum, r) => sum + (r.calidad_ejecucion || 0), 0) / s.length) : 0);
        setStreak(computeStreak(s.map(x => x.fecha)));
        loadWeekChart(s);
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, [user?.id, isFisio]);

  const applyFisioFilter = (allSessions: SessionRow[], _allPatients: PatientWithSessions[], patientId: string) => {
    const filtered = patientId ? allSessions.filter(s => s.paciente_id === patientId) : allSessions;
    setSessions(filtered);
    setTotalSessions(filtered.length);
    setTotalMinutes(Math.round(filtered.reduce((sum, r) => sum + (r.duracion_segundos || 0), 0) / 60));
    setAvgPrecision(filtered.length > 0 ? Math.round(filtered.reduce((sum, r) => sum + (r.calidad_ejecucion || 0), 0) / filtered.length) : 0);
    loadDailyChart(filtered);
  };

  const loadWeekChart = (s: SessionRow[]) => {
    // Mensual: last 6 weeks aggregated by week
    const sixWeeksAgo = new Date(Date.now() - 42 * 86400000).toISOString();
    const recent = s.filter(x => x.fecha >= sixWeeksAgo);
    const weekBuckets = [0, 0, 0, 0, 0, 0];
    recent.forEach(r => {
      const weeksAgo = Math.floor((Date.now() - new Date(r.fecha).getTime()) / (7 * 86400000));
      if (weeksAgo >= 0 && weeksAgo < 6) weekBuckets[5 - weeksAgo] += r.calidad_ejecucion || 0;
    });
    setWeekData(weekBuckets);
  };

  const loadDailyChart = (s: SessionRow[]) => {
    // Sessions per day for the last 7 days, indexed Mon..Sun aligned to current week
    const today = new Date();
    const last7 = [0, 0, 0, 0, 0, 0, 0];
    s.forEach(r => {
      const d = new Date(r.fecha);
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) {
        last7[6 - diff] += 1;
      }
    });
    setDailySessions(last7);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onPatientFilter = (patientId: string) => {
    setSelectedPatient(patientId);
    if (isFisio && patients.length > 0) {
      // Re-fetch all sessions for this fisio to filter accurately
      void reapplyFilter(patientId);
    }
  };

  const reapplyFilter = async (patientId: string) => {
    if (!user?.id) return;
    try {
      const { data: links } = await supabase
        .from('pacientes_terapeutas')
        .select('paciente_id')
        .eq('terapeuta_id', user.id);
      const patientIds = (links || []).map(l => l.paciente_id);
      if (patientIds.length === 0) return;
      const { data: allSessions } = await supabase
        .from('sesiones_completadas')
        .select('paciente_id, fecha, ejercicio_nombre, duracion_segundos, repeticiones, calidad_ejecucion')
        .in('paciente_id', patientIds)
        .order('fecha', { ascending: false });
      const s = (allSessions || []) as unknown as SessionRow[];
      applyFisioFilter(s, patients, patientId);
    } catch {
      /* network error — keep existing data */
    }
  };

  const generateInsight = async () => {
    setAiLoading(true);
    setAiInsight('');
    try {
      const dataContext = isFisio
        ? JSON.stringify({
            totalPatients,
            totalSessions,
            avgQuality: avgPrecision,
            topPatients: [...patients].sort((a, b) => b.sessionCount - a.sessionCount).slice(0, 5).map(p => ({ name: p.full_name, sessions: p.sessionCount, avgQuality: p.avgQuality })),
          })
        : JSON.stringify({ sessions: totalSessions, avgQuality: avgPrecision, streak });
      const result = await runAIJob('insights', {
        userPrompt: `Genera una recomendación clínica breve basada en estos datos reales: ${dataContext}`,
      });
      if (result.success && result.result) setAiInsight(result.result);
      else setAiInsight('No hay datos suficientes para generar una recomendación.');
    } catch {
      setAiInsight('Error conectando con Physi.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    const patientName = (isFisio && selectedPatient
      ? patients.find((p) => p.id === selectedPatient)?.full_name
      : user?.full_name) || 'Usuario';
    const weeklyMinutes = Math.round(
      sessions
        .filter((s) => (Date.now() - new Date(s.fecha).getTime()) / 86400000 < 7)
        .reduce((sum, s) => sum + (s.duracion_segundos || 0), 0) / 60,
    );
    setPdfLoading(true);
    // allow the loading state to paint before the (fast) synchronous generation
    await new Promise((r) => setTimeout(r, 50));
    try {
      exportSimplePDF(
        {
          patientName,
          diagnosis:
            isFisio && selectedPatient
              ? patients.find((p) => p.id === selectedPatient)?.diagnostico || undefined
              : undefined,
          evolutionData: !isFisio ? weekData : undefined,
          sessions: sessions.slice(0, 20).map((s) => ({
            fecha: s.fecha,
            ejercicio: s.ejercicio_nombre || 'Ejercicio',
            duracion_segundos: s.duracion_segundos || 0,
            repeticiones: s.repeticiones || 0,
            calidad_ejecucion: s.calidad_ejecucion || 0,
          })),
          globalMetrics: {
            totalSessions,
            avgQuality: avgPrecision,
            streak,
            weeklyMinutes,
          },
        },
        'Informe_Recuperacion_Paciente.pdf',
      );
      toast.success('Informe de recuperación descargado correctamente');
    } catch {
      toast.error('Error al generar el informe');
    } finally {
      setPdfLoading(false);
    }
  };

  // ---- KPI cards ----
  const fisioKpis = [
    { label: 'Pacientes Totales', value: totalPatients, icon: 'group', bg: 'bg-primary/10', color: 'text-primary', trend: '+2' },
    { label: 'Sesiones Supervisadas', value: totalSessions, icon: 'monitoring', bg: 'bg-secondary/10', color: 'text-secondary', trend: '+12%' },
    { label: 'Calidad Media', value: avgPrecision > 0 ? `${avgPrecision}%` : '—', icon: 'target', bg: 'bg-tertiary/10', color: 'text-tertiary', trend: 'Óptimo' },
    { label: 'Pacientes Activos', value: activePatients, icon: 'person_check', bg: 'bg-error/10', color: 'text-error', trend: 'Activo' },
  ];

  const patientKpis = [
    { label: 'Sesiones Totales', value: totalSessions, icon: 'analytics', bg: 'bg-primary/10', color: 'text-primary', trend: '+12%' },
    { label: 'Minutos Totales', value: totalMinutes, icon: 'timer', bg: 'bg-secondary/10', color: 'text-secondary', trend: '+4h' },
    { label: 'Precisión Media', value: avgPrecision > 0 ? `${avgPrecision}%` : '—', icon: 'target', bg: 'bg-tertiary/10', color: 'text-tertiary', trend: 'Óptimo' },
    { label: 'Racha', value: streak > 0 ? `${streak} días` : '—', icon: 'local_fire_department', bg: 'bg-error/10', color: 'text-error', trend: 'Activo' },
  ];

  const kpiCards = isFisio ? fisioKpis : patientKpis;

  // ---- Achievements (patient gamification) ----
  const achievements = [
    { name: 'Primera Sesión', desc: 'Completaste tu primera sesión', icon: 'check_circle', earned: totalSessions >= 1, date: sessions.length > 0 ? sessions[sessions.length - 1]?.fecha ?? null : null },
    { name: 'Constancia', desc: '3 días de racha consecutivos', icon: 'chronic', earned: streak >= 3, date: streak >= 3 ? sessions[0]?.fecha ?? null : null },
    { name: 'Dedicación', desc: '10 sesiones completadas', icon: 'verified', earned: totalSessions >= 10, date: totalSessions >= 10 ? sessions[sessions.length - 10]?.fecha ?? null : null },
    { name: 'Excelencia', desc: '90%+ calidad promedio', icon: 'military_tech', earned: avgPrecision >= 90, date: avgPrecision >= 90 ? sessions[0]?.fecha ?? null : null },
    { name: 'Imparable', desc: '7 días de racha consecutivos', icon: 'workspace_premium', earned: streak >= 7, date: streak >= 7 ? sessions[0]?.fecha ?? null : null },
    { name: 'Maestro', desc: '30 sesiones completadas', icon: 'emoji_events', earned: totalSessions >= 30, date: totalSessions >= 30 ? sessions[sessions.length - 30]?.fecha ?? null : null },
  ];
  const earnedAchievements = achievements.filter(a => a.earned);

  // ---- Chart data (memoized) ----
  // Fisio: sessions per day (last 7 days)
  const dailyChartData = useMemo(
    () => dailySessions.map((v, i) => ({ dia: dayLabels[i], sesiones: v })),
    [dailySessions],
  );

  // Fisio: top 5 most active patients
  const topPatients = useMemo(
    () => [...patients].sort((a, b) => b.sessionCount - a.sessionCount).slice(0, 5),
    [patients],
  );

  const topPatientsChartData = useMemo(
    () =>
      topPatients
        .filter((p) => p.sessionCount > 0)
        .map((p) => ({
          nombre: p.full_name.length > 14 ? p.full_name.slice(0, 12) + '…' : p.full_name,
          sesiones: p.sessionCount,
          calidad: p.avgQuality,
        })),
    [topPatients],
  );

  // Fisio: quality distribution (pie) — buckets across all filtered sessions
  const qualityDistribution = useMemo(() => {
    const buckets = { Excelente: 0, Bueno: 0, Regular: 0, Bajo: 0 };
    sessions.forEach((s) => {
      const q = s.calidad_ejecucion || 0;
      if (q >= 85) buckets.Excelente++;
      else if (q >= 70) buckets.Bueno++;
      else if (q >= 50) buckets.Regular++;
      else buckets.Bajo++;
    });
    return [
      { name: 'Excelente (≥85%)', value: buckets.Excelente, color: CHART_COLORS.success },
      { name: 'Bueno (70-84%)', value: buckets.Bueno, color: CHART_COLORS.primary },
      { name: 'Regular (50-69%)', value: buckets.Regular, color: CHART_COLORS.warm },
      { name: 'Bajo (<50%)', value: buckets.Bajo, color: CHART_COLORS.error },
    ].filter((d) => d.value > 0);
  }, [sessions]);

  // Fisio: diagnosis breakdown (pie)
  const diagnosisDistribution = useMemo(() => {
    const map = new Map<string, number>();
    patients.forEach((p) => {
      if (p.sessionCount === 0) return;
      const key = p.diagnostico || 'Sin diagnóstico';
      map.set(key, (map.get(key) || 0) + p.sessionCount);
    });
    return Array.from(map.entries())
      .map(([name, value], i) => ({
        name: name.length > 22 ? name.slice(0, 20) + '…' : name,
        value,
        color: PIE_PALETTE[i % PIE_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [patients]);

  // Paciente: 6-week quality evolution (area + line)
  const evolutionChartData = useMemo(
    () =>
      weekData.map((v, i) => ({
        semana: `Sem ${i + 1}`,
        calidad: v,
      })),
    [weekData],
  );

  // Paciente: per-session quality (line) — last 12 sessions chronological
  const sessionTrendData = useMemo(() => {
    return [...sessions]
      .slice(0, 12)
      .reverse()
      .map((s, i) => ({
        sesion: `S${i + 1}`,
        calidad: s.calidad_ejecucion || 0,
        ejercicio: s.ejercicio_nombre || 'Ejercicio',
      }));
  }, [sessions]);

  // Paciente: exercise distribution (pie)
  const exerciseDistribution = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      const key = s.ejercicio_nombre || 'Sin nombre';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value], i) => ({
        name: name.length > 20 ? name.slice(0, 18) + '…' : name,
        value,
        color: PIE_PALETTE[i % PIE_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [sessions]);

  // Paciente: weekly minutes bar chart
  const weeklyMinutesData = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0];
    sessions.forEach((s) => {
      const weeksAgo = Math.floor((Date.now() - new Date(s.fecha).getTime()) / (7 * 86400000));
      if (weeksAgo >= 0 && weeksAgo < 6) {
        buckets[5 - weeksAgo] += Math.round((s.duracion_segundos || 0) / 60);
      }
    });
    return buckets.map((m, i) => ({ semana: `Sem ${i + 1}`, minutos: m }));
  }, [sessions]);

  return (
    <div className="space-y-8 overflow-x-hidden max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living mb-2">
            {isFisio ? 'Métricas de Práctica Clínica' : 'Progreso de Recuperación'}
          </h2>
          {!isFisio && (
            <div className="flex items-center gap-2 bg-surface-container-highest px-4 py-1 rounded-full">
              <Icon name="local_fire_department" filled size={20} className="text-primary animate-breathe-icon" />
              <span className="font-bold text-on-surface">{streak > 0 ? `${streak} días de racha` : 'Sin racha activa'}</span>
            </div>
          )}
        </div>
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2">
          <Icon name="calendar_today" size={18} className="text-outline" />
          <span className="font-bold text-on-surface">{new Date().toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {isFisio && patients.length > 0 && (
        <div className="flex gap-3 items-center">
          <label htmlFor="patient-filter" className="text-sm font-bold text-on-surface-variant flex items-center gap-1">
            <Icon name="filter_list" size={18} /> Filtrar:
          </label>
          <select
            id="patient-filter"
            value={selectedPatient}
            onChange={(e) => onPatientFilter(e.target.value)}
            className="px-4 py-3 rounded-xl bg-surface-variant/20 border border-outline-variant/30 outline-none focus:ring-2 focus:ring-primary/20 text-on-surface w-full sm:min-w-[200px] sm:w-auto"
          >
            <option value="">Todos los pacientes</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
          {selectedPatient && (
            <button onClick={() => onPatientFilter('')} className="text-outline hover:text-primary transition-colors flex items-center gap-1 text-sm">
              <Icon name="close" size={16} /> Limpiar filtro
            </button>
          )}
        </div>
      )}

      {loading ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
          </div>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Icon name="progress_activity" size={32} className="text-primary animate-spin" />
            <p className="text-on-surface-variant text-sm">Cargando métricas…</p>
          </div>
        </>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpiCards.map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`glass-panel vibrant-hover p-6 rounded-2xl relative overflow-hidden group card-glow-hover ${i === 0 ? 'glass-teal' : i === 1 ? 'glass-blue' : i === 2 ? 'glass-warm' : ''}`}>
                <div className={`blob-${i === 0 ? 'teal' : i === 1 ? 'blue' : i === 2 ? 'warm' : 'teal'} absolute -top-8 -right-8 w-24 h-24 opacity-30 pointer-events-none`} />
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center animate-breathe-icon`}>
                    <Icon name={card.icon} size={24} className={card.color} />
                  </div>
                  <span className="text-xs font-bold text-primary">{card.trend}</span>
                </div>
                <p className="text-on-surface-variant text-sm font-semibold uppercase tracking-wider">{card.label}</p>
                <h3 className="text-display-lg text-3xl lg:text-display-lg font-display-lg number-flow tabular-nums">{card.value}</h3>
              </motion.div>
            ))}
          </div>

          {isFisio ? (
            <>
              {/* Sessions per day (last 7 days) + Quality distribution pie */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <GlassPanel className="lg:col-span-2 p-8 rounded-[2rem] flex flex-col relative overflow-hidden">
                  <div className="blob-teal absolute -top-12 -right-12 w-40 h-40 opacity-20 pointer-events-none" />
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-title-md text-title-md gradient-text-teal">Sesiones por Día</h3>
                      <p className="text-sm text-on-surface-variant">Últimos 7 días {selectedPatient ? `· ${patients.find(p => p.id === selectedPatient)?.full_name || ''}` : '· Todos los pacientes'}</p>
                    </div>
                    <Icon name="bar_chart" size={28} className="text-primary" />
                  </div>
                  <div className="h-72">
                    {dailySessions.every((v) => v === 0) ? (
                      <div className="flex flex-col items-center justify-center w-full h-full text-on-surface-variant empty-state-premium">
                        <Icon name="show_chart" size={48} className="opacity-30 mb-2 animate-breathe-icon" />
                        <p className="text-sm">No hay sesiones registradas en los últimos 7 días.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyChartData} margin={{ top: 20, right: 12, left: -12, bottom: 0 }}>
                          <defs>
                            <linearGradient id="barGradFisio" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={CHART_COLORS.primarySoft} stopOpacity={0.95} />
                              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.55} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="dia" tick={{ fill: '#9CB4B8', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fill: '#9CB4B8', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                          <Tooltip {...tooltipStyle} />
                          <Bar dataKey="sesiones" name="Sesiones" fill="url(#barGradFisio)" radius={[8, 8, 0, 0]} maxBarSize={56} animationDuration={900} animationEasing="ease-out">
                            <LabelList dataKey="sesiones" position="top" fill="#E6F4F1" fontSize={12} fontWeight={700} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </GlassPanel>

                <GlassPanel className="p-8 rounded-[2rem] flex flex-col card-glow-hover relative overflow-hidden">
                  <div className="blob-warm absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-title-md text-title-md gradient-text-editorial">Distribución de Calidad</h3>
                    <Icon name="pie_chart" size={24} className="text-tertiary" />
                  </div>
                  <div className="h-56 flex-1">
                    {qualityDistribution.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant empty-state-premium">
                        <Icon name="pie_chart" size={40} className="opacity-30 mb-2" />
                        <p className="text-sm">Sin sesiones para analizar.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={qualityDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={3}
                            animationDuration={900}
                            animationEasing="ease-out"
                          >
                            {qualityDistribution.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
                            ))}
                          </Pie>
                          <Tooltip {...tooltipStyle} />
                          <Legend
                            wrapperStyle={{ fontSize: 10, color: '#9CB4B8', fontWeight: 600 }}
                            iconType="circle"
                            iconSize={8}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </GlassPanel>
              </div>

              {/* Top patients bar chart + Diagnosis pie */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <GlassPanel className="p-8 rounded-[2rem] flex flex-col card-glow-hover relative overflow-hidden">
                  <div className="blob-blue absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-title-md text-title-md gradient-text-blue">Pacientes Más Activos</h3>
                    <Icon name="leaderboard" size={24} className="text-primary" />
                  </div>
                  <div className="h-64">
                    {topPatientsChartData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant empty-state-premium">
                        <Icon name="group" size={40} className="opacity-30 mb-2" />
                        <p className="text-sm">Aún no hay pacientes con sesiones registradas.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topPatientsChartData} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                          <defs>
                            <linearGradient id="barGradPatients" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={CHART_COLORS.info} stopOpacity={0.9} />
                              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.9} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: '#9CB4B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="nombre" tick={{ fill: '#E6F4F1', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
                          <Tooltip {...tooltipStyle} />
                          <Bar dataKey="sesiones" name="Sesiones" fill="url(#barGradPatients)" radius={[0, 8, 8, 0]} maxBarSize={26} animationDuration={900} animationEasing="ease-out">
                            <LabelList dataKey="sesiones" position="right" fill="#E6F4F1" fontSize={11} fontWeight={700} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </GlassPanel>

                <GlassPanel className="p-8 rounded-[2rem] flex flex-col card-glow-hover relative overflow-hidden">
                  <div className="blob-warm absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-title-md text-title-md gradient-text-editorial">Sesiones por Diagnóstico</h3>
                    <Icon name="medical_information" size={24} className="text-secondary" />
                  </div>
                  <div className="h-64">
                    {diagnosisDistribution.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant empty-state-premium">
                        <Icon name="medical_information" size={40} className="opacity-30 mb-2" />
                        <p className="text-sm">No hay diagnósticos con sesiones registradas.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={diagnosisDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={85}
                            paddingAngle={2}
                            animationDuration={1000}
                            animationEasing="ease-out"
                          >
                            {diagnosisDistribution.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
                            ))}
                          </Pie>
                          <Tooltip {...tooltipStyle} />
                          <Legend
                            wrapperStyle={{ fontSize: 10, color: '#9CB4B8', fontWeight: 600 }}
                            iconType="circle"
                            iconSize={8}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </GlassPanel>
              </div>

              {/* Patient summary table */}
              {patients.length > 0 && (
                <GlassPanel className="p-8 rounded-[2rem] relative overflow-hidden">
                  <div className="blob-warm absolute -bottom-12 -right-12 w-32 h-32 opacity-15 pointer-events-none" />
                  <h3 className="font-title-md text-title-md gradient-text-editorial mb-4">Resumen por Paciente</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-on-surface-variant border-b border-outline-variant/20">
                          <th className="text-left py-3 px-2 font-bold">Paciente</th>
                          <th className="text-left py-3 px-2 font-bold">Diagnóstico</th>
                          <th className="text-center py-3 px-2 font-bold">Sesiones</th>
                          <th className="text-center py-3 px-2 font-bold">Calidad Media</th>
                          <th className="text-right py-3 px-2 font-bold">Última Sesión</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map((p) => (
                          <tr key={p.id} className="border-b border-outline-variant/10 hover:bg-surface-variant/10 transition-colors cursor-pointer" onClick={() => onPatientFilter(p.id)}>
                            <td className="py-3 px-2 font-bold text-on-surface">{p.full_name}</td>
                            <td className="py-3 px-2 text-on-surface-variant">{p.diagnostico || '—'}</td>
                            <td className="py-3 px-2 text-center text-on-surface">{p.sessionCount > 0 ? p.sessionCount : '—'}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.avgQuality >= 80 ? 'bg-success/15 text-success' : p.avgQuality >= 50 ? 'bg-secondary/15 text-secondary' : 'bg-warning/15 text-warning'}`}>
                                {p.avgQuality > 0 ? `${p.avgQuality}%` : '—'}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right text-on-surface-variant">{p.lastSessionDate ? new Date(p.lastSessionDate).toLocaleDateString('es-ES') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassPanel>
              )}
            </>
          ) : (
            <>
              {/* Paciente: biomechanics evolution chart + recent sessions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <GlassPanel className="lg:col-span-2 p-8 rounded-[2rem] flex flex-col relative overflow-hidden">
                  <div className="blob-teal absolute -top-12 -right-12 w-40 h-40 opacity-20 pointer-events-none" />
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-title-md text-title-md gradient-text-teal">Evolución Biomecánica</h3>
                      <p className="text-sm text-on-surface-variant">Seguimiento de Calidad de Ejecución (6 semanas)</p>
                    </div>
                    <div className="flex gap-2">
                    <AnimatedTabs
                      className="[&>div:first-child]:border-none"
                      tabs={[
                        { id: 'mensual', label: 'Mensual', content: null },
                        { id: 'semanal', label: 'Semanal', content: null },
                      ]}
                      defaultTab={chartRange}
                      onTabChange={(id) => setChartRange(id as 'mensual' | 'semanal')}
                    />
                  </div>
                  </div>
                  <div className="h-72">
                    {totalSessions === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant empty-state-premium">
                        <Icon name="show_chart" size={48} className="opacity-30 mb-2 animate-breathe-icon" />
                        <p className="text-sm">Aún no hay datos suficientes para mostrar tu evolución. ¡Cada sesión cuenta y pronto verás tu progreso aquí!</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolutionChartData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
                          <defs>
                            <linearGradient id="areaGradPaciente" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.45} />
                              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="semana" tick={{ fill: '#9CB4B8', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#9CB4B8', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                          <Tooltip {...tooltipStyle} />
                          <Area
                            type="monotone"
                            dataKey="calidad"
                            name="Calidad de Ejecución"
                            stroke={CHART_COLORS.primary}
                            strokeWidth={3}
                            fill="url(#areaGradPaciente)"
                            dot={{ r: 4, fill: CHART_COLORS.primary, strokeWidth: 0 }}
                            activeDot={{ r: 7, fill: '#fff', stroke: CHART_COLORS.primary, strokeWidth: 3 }}
                            animationDuration={1100}
                            animationEasing="ease-out"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {/* Legend */}
                  <div className="flex gap-8 mt-4 pt-4 border-t border-outline-variant/10">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: CHART_COLORS.primary }}></span>
                      <span className="text-xs font-bold">Calidad de Ejecución</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-outline"></span>
                      <span className="text-xs font-bold text-on-surface-variant">Tendencia</span>
                    </div>
                  </div>
                </GlassPanel>

                <GlassPanel className="p-8 rounded-[2rem] flex flex-col card-glow-hover relative overflow-hidden">
                  <div className="blob-blue absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
                  <h3 className="font-title-md text-title-md gradient-text-editorial mb-4">Sesiones Recientes</h3>
                  <div className="space-y-4 flex-1 overflow-y-auto max-h-64">
                    {sessions.length === 0 ? (
                      <div className="empty-state-premium text-center py-4">
                        <p className="text-sm text-on-surface-variant">Todavía no hay sesiones registradas. Tu camino hacia la recuperación comienza con el primer paso. ¡Tú puedes!</p>
                      </div>
                    ) : (
                      sessions.slice(0, 5).map((s, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
                            <Icon name="trending_up" size={24} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{s.ejercicio_nombre || 'Sesión'}</p>
                            <p className="text-xs text-on-surface-variant">{new Date(s.fecha).toLocaleDateString('es-ES')}</p>
                            <p className="text-sm text-primary font-bold">{s.calidad_ejecucion != null && s.calidad_ejecucion > 0 ? `${s.calidad_ejecucion}% calidad` : 'Sin calificar'}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </GlassPanel>
              </div>

              {/* Paciente: per-session quality line + exercise distribution pie */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <GlassPanel className="lg:col-span-2 p-8 rounded-[2rem] flex flex-col relative overflow-hidden">
                  <div className="blob-blue absolute -top-12 -right-12 w-40 h-40 opacity-20 pointer-events-none" />
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-title-md text-title-md gradient-text-blue">Calidad por Sesión</h3>
                      <p className="text-sm text-on-surface-variant">Últimas 12 sesiones (orden cronológico)</p>
                    </div>
                    <Icon name="timeline" size={28} className="text-secondary" />
                  </div>
                  <div className="h-64">
                    {sessionTrendData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant empty-state-premium">
                        <Icon name="timeline" size={40} className="opacity-30 mb-2" />
                        <p className="text-sm">Aún no hay sesiones para mostrar tu tendencia.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sessionTrendData} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="sesion" tick={{ fill: '#9CB4B8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#9CB4B8', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                          <Tooltip {...tooltipStyle} />
                          <Line
                            type="monotone"
                            dataKey="calidad"
                            name="Calidad"
                            stroke={CHART_COLORS.secondary}
                            strokeWidth={3}
                            dot={{ r: 4, fill: CHART_COLORS.secondary, strokeWidth: 0 }}
                            activeDot={{ r: 7, fill: '#fff', stroke: CHART_COLORS.secondary, strokeWidth: 3 }}
                            animationDuration={1100}
                            animationEasing="ease-out"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </GlassPanel>

                <GlassPanel className="p-8 rounded-[2rem] flex flex-col card-glow-hover relative overflow-hidden">
                  <div className="blob-warm absolute -top-12 -right-12 w-32 h-32 opacity-20 pointer-events-none" />
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-title-md text-title-md gradient-text-editorial">Distribución de Ejercicios</h3>
                    <Icon name="pie_chart" size={24} className="text-tertiary" />
                  </div>
                  <div className="h-56 flex-1">
                    {exerciseDistribution.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant empty-state-premium">
                        <Icon name="pie_chart" size={40} className="opacity-30 mb-2" />
                        <p className="text-sm">Sin sesiones registradas todavía.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={exerciseDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={80}
                            paddingAngle={3}
                            animationDuration={900}
                            animationEasing="ease-out"
                          >
                            {exerciseDistribution.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
                            ))}
                          </Pie>
                          <Tooltip {...tooltipStyle} />
                          <Legend
                            wrapperStyle={{ fontSize: 10, color: '#9CB4B8', fontWeight: 600 }}
                            iconType="circle"
                            iconSize={8}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </GlassPanel>
              </div>

              {/* Paciente: weekly minutes bar chart + Logros grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GlassPanel className="p-8 rounded-[2rem] flex flex-col relative overflow-hidden">
                <div className="blob-teal absolute -top-12 -right-12 w-40 h-40 opacity-15 pointer-events-none" />
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-title-md text-title-md gradient-text-teal">Minutos de Entrenamiento</h3>
                    <p className="text-sm text-on-surface-variant">Distribución semanal (últimas 6 semanas)</p>
                  </div>
                  <Icon name="timer" size={28} className="text-primary" />
                </div>
                <div className="h-64">
                  {weeklyMinutesData.every((d) => d.minutos === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-on-surface-variant empty-state-premium">
                      <Icon name="timer" size={40} className="opacity-30 mb-2" />
                      <p className="text-sm">Aún no has registrado minutos de entrenamiento.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyMinutesData} margin={{ top: 20, right: 12, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="barGradMinutes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS.warm} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={CHART_COLORS.secondary} stopOpacity={0.6} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="semana" tick={{ fill: '#9CB4B8', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#9CB4B8', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="minutos" name="Minutos" fill="url(#barGradMinutes)" radius={[8, 8, 0, 0]} maxBarSize={64} animationDuration={900} animationEasing="ease-out">
                          <LabelList dataKey="minutos" position="top" fill="#E6F4F1" fontSize={12} fontWeight={700} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassPanel>

              {/* Paciente: Logros e Insignias (gamification kept for patients) */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg gradient-text-living">Logros e Insignias</h3>
                  <button onClick={() => setShowAllBadges(!showAllBadges)} className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    {showAllBadges ? 'Contraer Vitrina' : 'Expandir Vitrina'}
                    <Icon name={showAllBadges ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={18} />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {showAllBadges && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      {earnedAchievements.length === 0 ? (
                        <EmptyState type="achievements" />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                          {earnedAchievements.map((badge, i) => (
                            <motion.div
                              key={badge.name}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.08 }}
                              className="glass-panel p-5 rounded-2xl flex items-center gap-4 group hover:-translate-y-1 transition-all card-glow-hover hover-lift golden-flash"
                            >
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 relative">
                                <Icon name={badge.icon} filled size={28} className="text-primary animate-breathe-icon" />
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-on-surface">{badge.name}</p>
                                <p className="text-xs text-on-surface-variant">{badge.desc}</p>
                                <p className="text-[10px] text-primary font-bold mt-1 flex items-center gap-1">
                                  <Icon name="event_available" size={12} />
                                  {badge.date ? new Date(badge.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Desbloqueado'}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </div>
            </>
          )}

          {/* AI recommendation + PDF report (both roles) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <GlassPanel className="p-8 rounded-[2rem] bg-primary/5 border-primary/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="mascot-container w-14 h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                  <img src="/animations/mascot/consejo.webp" alt="Physi aconsejando" className="w-full h-full object-contain animate-breathe" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div>
                  <p className="font-bold text-primary">Recomendación de Physi</p>
                  {aiLoading ? (
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant"><Icon name="progress_activity" size={16} className="text-primary animate-spin" /> Analizando datos...</div>
                  ) : aiInsight ? (
                    <p className="text-sm text-on-surface-variant">{aiInsight}</p>
                  ) : (
                    <p className="text-sm text-on-surface-variant">Genera una recomendación basada en tus datos reales de progreso.</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={generateInsight} disabled={aiLoading} className="premium-btn text-primary font-bold text-sm underline decoration-primary/30 hover:decoration-primary disabled:opacity-50">
                  Generar Recomendación
                </button>
              </div>
            </GlassPanel>
            <GlassPanel className="p-8 rounded-[2rem] border-2 border-dashed border-outline-variant/30">
              <div className="flex flex-col items-center text-center gap-3">
                <Icon name="add_chart" size={40} className="text-outline" />
                <p className="text-on-surface-variant">Genera un reporte clínico en PDF de tu progreso.</p>
                <button
                  onClick={handleGeneratePDF}
                  disabled={pdfLoading}
                  className="premium-btn px-6 py-3 bg-surface-container-highest text-on-surface font-bold rounded-full text-xs hover:bg-surface-container-high transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {pdfLoading ? <Icon name="progress_activity" size={18} className="animate-spin" /> : <Icon name="download" size={18} />}
                  {pdfLoading ? 'Generando…' : 'Generar Reporte'}
                </button>
              </div>
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  );
}
