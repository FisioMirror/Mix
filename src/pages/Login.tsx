import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation, useReducedMotion } from 'framer-motion';
import { Icon } from '../components/ui/Icon';
import { Spinner } from '../components/ui/Loader';
import { ShimmerText } from '../components/ui/ShimmerText';
import { PinInput } from '../components/ui/PinInput';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ui/ToastProvider';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import MascotAnimation, { type MascotType } from '../components/ui/MascotAnimation';
import { SparkleEffect } from '../components/auth/SparkleEffect';

type AuthMode = 'login' | 'register';
type LoginRole = 'paciente' | 'fisioterapeuta';
type FisioStep = 1 | 2;
type ImageState = 'idle' | 'typing' | 'loading' | 'error';
type GlowPhase = 'pulse' | 'settled' | 'error';

interface EspecialidadRow { id: string; nombre: string }

const GLOW_COLORS = {
  teal: '0, 80, 77',
  cyan: '6, 182, 212',
  coral: '251, 146, 60',
  red: '186, 26, 26',
};

const LOGIN_BG_URL = '/login.png';

function CharacterGlow({ side, colorRgb, phase, reduceMotion }: { side: 'left' | 'right'; colorRgb: string; phase: GlowPhase; reduceMotion: boolean | null }) {
  const variants = {
    pulse: {
      opacity: [0.2, 0.7, 0.2, 0.7, 0.35],
      scale: [1, 1.05, 1, 1.05, 1],
      transition: { duration: 1, times: [0, 0.25, 0.5, 0.75, 1], ease: 'easeInOut' as const },
    },
    settled: {
      opacity: 0.3,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeInOut' as const },
    },
    error: {
      opacity: [0.3, 0.9, 0.3, 0.9, 0.3],
      transition: { duration: 1, ease: 'easeInOut' as const },
    },
  };

  return (
    <motion.div
      className={cn('pointer-events-none absolute top-0 h-full w-1/2', side === 'left' ? 'left-0' : 'right-0')}
      initial={{ opacity: 0 }}
      animate={reduceMotion ? { opacity: 0.3 } : variants[phase]}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${side === 'left' ? '65%' : '35%'} 55%, rgba(${colorRgb}, 0.5) 0%, rgba(${colorRgb}, 0.2) 35%, rgba(${colorRgb}, 0) 70%)`,
          filter: 'blur(32px)',
        }}
      />
      <div
        className="absolute"
        style={{
          [side]: '10%',
          top: '28%',
          width: '50%',
          height: '55%',
          borderRadius: '9999px',
          boxShadow: `0 0 100px 50px rgba(${colorRgb}, 0.3)`,
        } as React.CSSProperties}
      />
    </motion.div>
  );
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];
  const colors = ['bg-error', 'bg-error', 'bg-warning', 'bg-success', 'bg-success'];
  return { score, label: labels[score], color: colors[score] };
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function Login() {
  const { signIn, signInWithToken, signInPatientWithEmail, linkTokenToEmail, signUpFisio, loading, error, clearError } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const imageControls = useAnimation();

  const [mode, setMode] = useState<AuthMode>('login');
  const [loginRole, setLoginRole] = useState<LoginRole>('paciente');
  const [fisioStep, setFisioStep] = useState<FisioStep>(1);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [cedula, setCedula] = useState('');
  const [universidad, setUniversidad] = useState('');
  const [colegiadoId, setColegiadoId] = useState('');
  const [telefono, setTelefono] = useState('');
  const [anioEgreso, setAnioEgreso] = useState('');
  const [especialidadesSel, setEspecialidadesSel] = useState<string[]>([]);
  const [especialidadesOpts, setEspecialidadesOpts] = useState<string[]>([]);
  const [especialidadInput, setEspecialidadInput] = useState('');
  const [credencialFile, setCredencialFile] = useState<File | null>(null);
  const [credencialPreview, setCredencialPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [confirmPatientPassword, setConfirmPatientPassword] = useState('');
  const [showLinkEmailForm, setShowLinkEmailForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const [imageState, setImageState] = useState<ImageState>('idle');
  const [glowPhase, setGlowPhase] = useState<GlowPhase>('pulse');
  const [errorShake, setErrorShake] = useState(false);
  const glowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const isPaciente = loginRole === 'paciente';
  const isFisio = loginRole === 'fisioterapeuta';
  const isRegister = mode === 'register';
  const showImagePanel = !isRegister || (isRegister && isPaciente);

  const isTyping = email.length > 0 || password.length > 0 || token.length > 0;

  const characterMascotType: MascotType = loading ? 'loading' : error ? 'error' : isTyping ? 'speaking' : 'greeting';

  const pwStrength = useMemo(() => getPasswordStrength(password), [password]);
  const greeting = useMemo(() => getTimeGreeting(), []);

  useEffect(() => {
    if (user) {
      navigate(user.role === 'fisioterapeuta' ? '/dashboard-fisio' : '/dashboard-paciente', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  useEffect(() => {
    if (loading) { setImageState('loading'); return; }
    if (error) {
      setImageState('error');
      setGlowPhase('error');
      setErrorShake(true);
      if (!reduceMotion) {
        void imageControls.start({ x: [0, -12, 12, -10, 10, 0], transition: { duration: 0.6, ease: 'easeInOut' } });
      }
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => {
        setGlowPhase('settled');
        setErrorShake(false);
        setImageState(isTyping ? 'typing' : 'idle');
      }, 1500);
      return () => { if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current); };
    }
    setImageState(isTyping ? 'typing' : 'idle');
  }, [loading, error, isTyping]);

  useEffect(() => {
    return () => {
      if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const loadEspecialidades = async () => {
    if (especialidadesOpts.length > 0) return;
    try {
      const { data, error: err } = await supabase.from('especialidades').select('id, nombre').order('nombre');
      if (err) { toast.error('Error cargando especialidades'); return; }
      if (data) setEspecialidadesOpts((data as EspecialidadRow[]).map((e) => e.nombre));
    } catch {
      toast.error('Error cargando especialidades');
    }
  };

  const switchRole = (role: LoginRole) => {
    setLoginRole(role);
    clearError();
    setToken('');
    setEmail('');
    setPassword('');
    setGlowPhase('pulse');
    if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
    glowTimeoutRef.current = setTimeout(() => setGlowPhase('settled'), 1000);
    if (role === 'fisioterapeuta' && mode === 'register') loadEspecialidades();
    setTimeout(() => {
      if (role === 'fisioterapeuta' && window.innerWidth >= 768) emailRef.current?.focus();
    }, 400);
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setFisioStep(1);
    clearError();
    if (m === 'register') { setLoginRole('fisioterapeuta'); loadEspecialidades(); }
  };

  const handleTokenSubmit = async (tokenValue: string) => {
    if (cooldown > 0) return;
    const ok = await signInWithToken(tokenValue);
    if (ok) {
      toast.success('Bienvenido a FisioMirror');
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 5) { setCooldown(900); toast.error('Cuenta bloqueada por 15 minutos.'); }
      else if (newAttempts >= 3) { setCooldown(60); toast.error('Demasiados intentos. Espera 60 segundos.'); }
    }
  };

  const handleCredencialFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCredencialFile(file);
    const reader = new FileReader();
    reader.onload = () => setCredencialPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadCredencial = async (userId: string): Promise<string | null> => {
    if (!credencialFile) return null;
    setUploading(true);
    try {
      const ext = credencialFile.name.split('.').pop() ?? 'jpg';
      const path = `${userId}/credencial-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('credenciales_profesionales').upload(path, credencialFile, { upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from('credenciales_profesionales').getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      toast.warning('No se pudo subir la credencial', { description: 'Puedes subirla más tarde desde tu perfil. Tu cuenta se creará igualmente.' });
      return null;
    } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    if (isPaciente) {
      if (showLinkEmailForm) {
        // Flujo de vincular email/password al token
        if (!patientEmail.trim() || !patientPassword.trim()) {
          toast.error('Email y contraseña son requeridos');
          return;
        }
        if (patientPassword !== confirmPatientPassword) {
          toast.error('Las contraseñas no coinciden');
          return;
        }
        const ok = await linkTokenToEmail(token, patientEmail, patientPassword, undefined);
        if (ok) {
          toast.success('Cuenta vinculada. Bienvenido a FisioMirror');
        } else {
          const currentError = useAuthStore.getState().error;
          if (currentError?.includes('Demasiados intentos')) {
            setCooldown(60);
            toast.error('Demasiados intentos. Espera un minuto.');
          }
        }
        return;
      }
      const tokenValue = token;
      if (!tokenValue.trim() || tokenValue.length < 4) { toast.error('Ingresa tu token completo'); return; }
      await handleTokenSubmit(tokenValue);
      return;
    }
    if (mode === 'login') {
      const ok = await signIn(email, password);
      if (ok) toast.success('Bienvenido a FisioMirror');
      else {
        const currentError = useAuthStore.getState().error;
        if (currentError?.includes('Demasiados intentos')) {
          setCooldown(60);
          toast.error('Demasiados intentos. Espera un minuto.');
        }
      }
      return;
    }
    if (password !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }
    if (fisioStep === 1) {
      if (!fullName.trim() || !email.trim() || !password.trim() || !cedula.trim()) { toast.error('Completa los campos requeridos'); return; }
      if (!telefono.trim()) { toast.error('El número de teléfono es obligatorio'); return; }
      setFisioStep(2);
      return;
    }
    const tempId = crypto.randomUUID();
    const url = await uploadCredencial(tempId);
    const ok = await signUpFisio(email, password, fullName, {
      cedula, universidad, colegiadoId, especialidades: especialidadesSel,
      credencialUrl: url ?? undefined, anioEgreso: anioEgreso || undefined,
      telefono: telefono.trim(),
    });
    if (ok) { setShowSuccess(true); toast.success('Cuenta creada. Bienvenido a FisioMirror'); }
    else {
      const currentError = useAuthStore.getState().error;
      if (currentError?.includes('Demasiados intentos')) {
        setCooldown(60);
        toast.error('Demasiados intentos. Espera un minuto.');
      }
    }
  };

  const fillFisioDemo = () => { switchRole('fisioterapeuta'); setMode('login'); setEmail('fisio@demo.com'); setPassword('demo1234'); };
  const fillPacienteDemo = () => { switchRole('paciente'); setMode('login'); setToken('123456'); };

  const addEspecialidad = () => {
    const val = especialidadInput.trim();
    if (val && !especialidadesSel.includes(val)) { setEspecialidadesSel([...especialidadesSel, val]); setEspecialidadInput(''); }
  };
  const removeEspecialidad = (esp: string) => setEspecialidadesSel(especialidadesSel.filter((e) => e !== esp));

  const canSubmitFisioStep1 = fullName.trim() && email.trim() && password.trim() && confirmPassword.trim() && password === confirmPassword && cedula.trim() && telefono.trim();

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) { toast.error('Ingresa tu correo electrónico'); return; }
    setResetLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), { redirectTo: window.location.origin + '/reset-password' });
      if (err) throw err;
      toast.success('Si el correo está registrado, recibirás un enlace de recuperación.');
    } catch {
      toast.success('Si el correo está registrado, recibirás un enlace de recuperación.');
    } finally {
      setResetLoading(false);
      setShowResetModal(false);
      setResetEmail('');
    }
  };

  const breathingScale = imageState === 'typing' ? [1, 1.01, 1] : [1, 1.025, 1];
  const breathingDuration = imageState === 'typing' ? 3 : 5;
  const glowColorRgb = glowPhase === 'error' ? GLOW_COLORS.red : (isPaciente ? GLOW_COLORS.coral : GLOW_COLORS.teal);

  const statusMessage = !loginRole && !loading
    ? 'Selecciona tu rol para comenzar'
    : loading
    ? 'Preparando tu espacio...'
    : error
    ? 'Revisa tus credenciales'
    : isPaciente
    ? 'Tu recuperación empieza aquí'
    : 'Gestión clínica de alto rendimiento';

  return (
    <div className="min-h-dvh flex font-body-lg text-on-surface relative overflow-hidden bg-gradient-to-br from-teal-50 via-teal-50/50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950">
      {/* ═══════════════════════════════════════════════════
          LEFT PANEL — FORM (40% on desktop, full on mobile)
          ═══════════════════════════════════════════════════ */}
      <div className="w-full md:w-[42%] flex flex-col items-center justify-center px-4 py-6 md:px-8 md:py-10 relative z-20 overflow-y-auto">
        {/* Top bar: logo + theme toggle */}
        <div className="w-full max-w-md flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-11 w-auto shrink-0" />
            <ShimmerText text="FisioMirror" className="font-display font-headline-md text-headline-md gradient-text-editorial" />
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="glass-panel p-2.5 rounded-full hover:scale-105 transition-transform touch-manipulation hover-lift breathe-badge"
          >
            <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} className="text-primary" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'glass-card w-full p-6 sm:p-8 rounded-[2rem] shadow-ambient-teal flex flex-col relative overflow-hidden',
            isFisio && isRegister ? 'max-w-2xl gap-y-5' : 'max-w-md gap-y-6',
          )}
        >
          <div className="blob-teal w-40 h-40 -top-10 -right-10 opacity-30" />
          <div className="blob-blue w-32 h-32 bottom-0 -left-10 opacity-20" />
          {/* Registration branding header */}
          {isFisio && isRegister && (
            <div className="hidden md:flex items-center justify-between mb-2">
              <div>
                <ShimmerText text="FisioMirror" className="font-headline-md text-headline-md" />
                <p className="text-on-surface-variant font-body-md mt-1">Tu evolución profesional comienza aquí.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-24 bg-on-surface/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: fisioStep === 1 ? '50%' : '100%' }} />
                </div>
                <span className="font-label-sm text-label-sm text-primary whitespace-nowrap">Paso {fisioStep}/2</span>
              </div>
            </div>
          )}

          {/* Role selector — hidden during registration */}
          {(!isFisio || !isRegister) && (
            <div className="relative bg-surface-container-high/40 p-1.5 rounded-2xl flex items-center w-full">
              <motion.div
                className="absolute h-[calc(100%-12px)] w-[calc(50%-6px)] bg-white rounded-xl shadow-sm dark:bg-surface-container/80"
                animate={{ left: isPaciente ? '6px' : 'calc(50% + 0px)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              <button onClick={() => switchRole('paciente')} className={cn('relative flex-1 py-3 font-title-md text-body-lg z-10 transition-colors flex items-center justify-center gap-2', isPaciente ? 'text-primary' : 'text-on-surface-variant')}>
                <Icon name="person" filled size={18} /> Paciente
              </button>
              <button onClick={() => switchRole('fisioterapeuta')} className={cn('relative flex-1 py-3 font-title-md text-body-lg z-10 transition-colors flex items-center justify-center gap-2', isFisio ? 'text-primary' : 'text-on-surface-variant')}>
                <Icon name="medical_services" filled size={18} /> Fisioterapeuta
              </button>
            </div>
          )}

          {/* Header — hidden during registration */}
          {(!isFisio || !isRegister) && (
            <div className="text-center space-y-1.5">
              <p className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest">{greeting}</p>
              <h2 className="font-display font-headline-md text-headline-md gradient-text-editorial relative z-10">
                {isPaciente ? 'Comienza tu recuperación hoy' : 'Gestión Clínica de Alto Rendimiento'}
              </h2>
              <p className="text-on-surface-variant font-body-lg">
                {isPaciente ? 'Ingresa para acceder a tu plan personalizado.' : 'Accede a tu panel de control y pacientes.'}
              </p>
            </div>
          )}

          {/* Registration header (mobile) */}
          {isFisio && isRegister && (
            <header className="md:hidden">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-headline-md text-headline-md text-on-surface">Bienvenido, Doctor.</h2>
                <div className="px-2 py-1 bg-primary/10 rounded-full"><span className="font-label-sm text-label-sm text-primary">Etapa {fisioStep}/2</span></div>
              </div>
              <p className="text-on-surface-variant font-body-lg">Completa tus datos profesionales para validar tu acceso.</p>
            </header>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative overflow-hidden min-h-[280px]">
            <AnimatePresence mode="wait">
              {/* PACIENTE FLOW */}
              {isPaciente && !isRegister && (
                <motion.div key="patient-flow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="flex flex-col gap-y-6">
                  <AnimatePresence mode="wait">
                    {showLinkEmailForm ? (
                      <motion.div key="patient-email-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-y-5">
                        <div className="space-y-4">
                          <div className="relative">
                            <Icon name="alternate_email" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                            <input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} placeholder="Correo electrónico" aria-label="Correo electrónico" autoComplete="email" className="glass-input w-full pl-12 pr-4 py-4 rounded-xl font-body-lg focus:outline-none bg-white/20 border border-white/40 focus:bg-white/50 focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(0,80,77,0.1)] transition-all" required />
                          </div>
                          <div className="relative">
                            <Icon name="lock" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                            <input type={showPassword ? 'text' : 'password'} value={patientPassword} onChange={(e) => setPatientPassword(e.target.value)} placeholder="Contraseña" aria-label="Contraseña" autoComplete="new-password" className="glass-input w-full pl-12 pr-12 py-4 rounded-xl font-body-lg focus:outline-none bg-white/20 border border-white/40 focus:bg-white/50 focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(0,80,77,0.1)] transition-all" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                              <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                            </button>
                          </div>
                          <div className="relative">
                            <Icon name="lock" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                            <input type="password" value={confirmPatientPassword} onChange={(e) => setConfirmPatientPassword(e.target.value)} placeholder="Confirmar contraseña" aria-label="Confirmar contraseña" autoComplete="new-password" className="glass-input w-full pl-12 pr-4 py-4 rounded-xl font-body-lg focus:outline-none bg-white/20 border border-white/40 focus:bg-white/50 focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(0,80,77,0.1)] transition-all" required />
                          </div>
                        </div>
                        <div className="flex justify-between px-1">
                          <button type="button" onClick={() => setShowLinkEmailForm(false)} className="text-label-sm font-label-sm text-on-surface-variant hover:text-on-surface transition-colors">Volver al token</button>
                        </div>
                        {error && <motion.div initial={{ opacity: 0, x: -10 }} animate={errorShake ? { x: [-10, 10, -8, 8, 0] } : { x: 0 }} transition={{ duration: 0.4 }} role="alert" className="px-4 py-3 rounded-xl bg-error-container/30 text-error text-sm font-bold border border-error/30 shadow-[0_0_20px_rgba(186,26,26,0.2)]">{error}</motion.div>}
                        <button type="submit" disabled={loading || cooldown > 0} aria-busy={loading} className="premium-btn w-full bg-primary py-4 rounded-2xl text-on-primary font-title-md text-title-md shadow-glow-primary hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 breathe-teal relative z-10">
                          {loading ? <Spinner size={20} className="text-current" /> : 'Vincular Cuenta'}
                          {!loading && <Icon name="link" size={20} />}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="patient-token-form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="flex flex-col gap-y-6">
                        <div className="space-y-3">
                          <label className="block font-label-sm text-label-sm text-outline uppercase tracking-widest px-1 text-center">Código de Acceso (6 dígitos)</label>
                          <PinInput
                            value={token}
                            onChange={setToken}
                            onComplete={(full) => setToken(full)}
                            disabled={loading || cooldown > 0}
                            autoFocus
                          />
                        </div>
                        <button type="submit" disabled={loading || cooldown > 0} className="premium-btn w-full bg-primary py-4 rounded-2xl text-on-primary font-title-md text-title-md shadow-glow-primary hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 breathe-teal relative z-10">
                          {loading ? <Spinner size={20} className="text-current" /> : cooldown > 0 ? `Espera ${cooldown}s` : 'Ingresar con Token'}
                          {!loading && cooldown === 0 && <Icon name="arrow_forward" size={20} />}
                        </button>
                        <div className="flex items-center justify-center gap-2 text-on-surface-variant text-label-sm">
                          <span>¿Quieres usar email y contraseña?</span>
                          <button type="button" onClick={() => setShowLinkEmailForm(true)} className="text-primary font-bold hover:underline">Vincular ahora</button>
                        </div>
                        <p className="text-center text-on-surface-variant text-label-sm">¿No tienes un token? Contacta a tu fisioterapeuta.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* FISIO LOGIN FLOW */}
              {isFisio && !isRegister && (
                <motion.div key="physio-login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="flex flex-col gap-y-5">
                  <div className="space-y-4">
                    <div className="relative">
                      <Icon name="alternate_email" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                      <input ref={emailRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" aria-label="Correo electrónico" autoComplete="email" className="glass-input w-full pl-12 pr-4 py-4 rounded-xl font-body-lg focus:outline-none bg-white/20 border border-white/40 focus:bg-white/50 focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(0,80,77,0.1)] transition-all" required />
                    </div>
                    <div className="relative">
                      <Icon name="lock" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" aria-label="Contraseña" autoComplete="current-password" className="glass-input w-full pl-12 pr-12 py-4 rounded-xl font-body-lg focus:outline-none bg-white/20 border border-white/40 focus:bg-white/50 focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(0,80,77,0.1)] transition-all" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                        <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end px-1">
                    <button type="button" onClick={() => setShowResetModal(true)} className="text-label-sm font-label-sm text-primary hover:underline">¿Olvidaste tu contraseña?</button>
                  </div>
                  {error && <motion.div initial={{ opacity: 0, x: -10 }} animate={errorShake ? { x: [-10, 10, -8, 8, 0] } : { x: 0 }} transition={{ duration: 0.4 }} role="alert" className="px-4 py-3 rounded-xl bg-error-container/30 text-error text-sm font-bold border border-error/30 shadow-[0_0_20px_rgba(186,26,26,0.2)]">{error}</motion.div>}
                  <button type="submit" disabled={loading || cooldown > 0} aria-busy={loading} className="premium-btn w-full bg-primary py-4 rounded-2xl text-on-primary font-title-md text-title-md shadow-glow-primary hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 breathe-teal relative z-10">
                    {loading ? <Spinner size={20} className="text-current" /> : 'Iniciar Sesión'}
                    {!loading && <Icon name="login" size={20} />}
                  </button>
                  <div className="flex items-center gap-2 text-on-surface-variant justify-center text-label-sm">
                    <span>¿Nuevo en FisioMirror?</span>
                    <button type="button" onClick={() => switchMode('register')} className="text-primary font-bold hover:underline">Crear Cuenta</button>
                  </div>
                </motion.div>
              )}

              {/* FISIO REGISTER FLOW */}
              {isFisio && isRegister && (
                <motion.div key="physio-register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="flex flex-col gap-y-5">
                  <AnimatePresence mode="wait">
                    {fisioStep === 1 ? (
                      <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="font-label-sm text-label-sm text-on-surface-variant px-1 block mb-1">Nombre Completo</label>
                            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Roberto Silva" className="recessed-input w-full px-4 py-3 rounded-xl font-body-lg text-on-surface bg-white/40 border border-primary/10 focus:bg-white/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,80,77,0.05)] transition-all outline-none" required />
                          </div>
                          <div>
                            <label className="font-label-sm text-label-sm text-on-surface-variant px-1 block mb-1">Email Profesional</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="roberto.fisio@ejemplo.com" className="recessed-input w-full px-4 py-3 rounded-xl font-body-lg text-on-surface bg-white/40 border border-primary/10 focus:bg-white/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,80,77,0.05)] transition-all outline-none" required />
                          </div>
                          <div>
                            <label className="font-label-sm text-label-sm text-on-surface-variant px-1 block mb-1">Contraseña</label>
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="recessed-input w-full px-4 py-3 rounded-xl font-body-lg text-on-surface bg-white/40 border border-primary/10 focus:bg-white/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,80,77,0.05)] transition-all outline-none" required />
                          </div>
                          <div>
                            <label className="font-label-sm text-label-sm text-on-surface-variant px-1 block mb-1">Confirmar Contraseña</label>
                            <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={cn('recessed-input w-full px-4 py-3 rounded-xl font-body-lg text-on-surface bg-white/40 border focus:bg-white/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,80,77,0.05)] transition-all outline-none', confirmPassword && password !== confirmPassword ? 'border-error' : 'border-primary/10')} required />
                          </div>
                        </div>
                        {password.length > 0 && (
                          <div className="flex items-center gap-2 px-1">
                            <div className="flex-1 h-1.5 rounded-full bg-on-surface/10 overflow-hidden">
                              <motion.div className={cn('h-full rounded-full', pwStrength.color)} initial={{ width: 0 }} animate={{ width: `${(pwStrength.score / 4) * 100}%` }} transition={{ duration: 0.3 }} />
                            </div>
                            <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">{pwStrength.label}</span>
                          </div>
                        )}
                        <div className="h-px bg-on-surface/5 my-1" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="font-label-sm text-label-sm text-on-surface-variant px-1 block mb-1 flex items-center gap-1">Cédula de Identidad <Icon name="info" size={14} className="text-outline" /></label>
                            <input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="000000-F" className="recessed-input w-full px-4 py-3 rounded-xl font-body-lg text-on-surface bg-white/40 border border-primary/10 focus:bg-white/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,80,77,0.05)] transition-all outline-none" required />
                          </div>
                          <div>
                            <label className="font-label-sm text-label-sm text-on-surface-variant px-1 block mb-1">Universidad</label>
                            <input value={universidad} onChange={(e) => setUniversidad(e.target.value)} placeholder="Nombre de la Institución" className="recessed-input w-full px-4 py-3 rounded-xl font-body-lg text-on-surface bg-white/40 border border-primary/10 focus:bg-white/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,80,77,0.05)] transition-all outline-none" />
                          </div>
                          <div>
                            <label className="font-label-sm text-label-sm text-on-surface-variant px-1 block mb-1">Año de Formación</label>
                            <select value={anioEgreso} onChange={(e) => setAnioEgreso(e.target.value)} className="recessed-input w-full px-4 py-3 rounded-xl font-body-lg text-on-surface bg-white/40 border border-primary/10 focus:bg-white/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,80,77,0.05)] transition-all outline-none cursor-pointer">
                              <option value="">Selecciona un año</option>
                              {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map((y) => <option key={y} value={y}>{y}</option>)}
                              <option value="anterior">Anterior</option>
                            </select>
                          </div>
                          <div>
                            <label className="font-label-sm text-label-sm text-on-surface-variant px-1 block mb-1">Colegiado ID</label>
                            <input value={colegiadoId} onChange={(e) => setColegiadoId(e.target.value)} placeholder="Cód. Institución" className="recessed-input w-full px-4 py-3 rounded-xl font-body-lg text-on-surface bg-white/40 border border-primary/10 focus:bg-white/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,80,77,0.05)] transition-all outline-none" />
                          </div>
                          <div>
                            <label className="font-label-sm text-label-sm text-on-surface-variant px-1 block mb-1 flex items-center gap-1">Número de teléfono <span className="text-error text-xs">*</span></label>
                            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+58 412-1234567" inputMode="tel" className="recessed-input w-full px-4 py-3 rounded-xl font-body-lg text-on-surface bg-white/40 border border-primary/10 focus:bg-white/70 focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,80,77,0.05)] transition-all outline-none" required />
                          </div>
                        </div>
                        <div className="space-y-2 mt-1">
                          <label className="font-label-sm text-label-sm text-on-surface-variant px-1 block">Especialidades</label>
                          <div className="flex flex-wrap gap-2 p-2 recessed-input rounded-xl min-h-[48px] items-center bg-white/40 border border-primary/10">
                            {especialidadesSel.map((esp) => (
                              <div key={esp} className="bg-primary text-on-primary flex items-center gap-1 px-3 py-1 rounded-full font-label-sm text-label-sm">
                                {esp}<button type="button" onClick={() => removeEspecialidad(esp)} className="hover:opacity-70 transition-opacity"><Icon name="close" size={14} /></button>
                              </div>
                            ))}
                            {especialidadesOpts.length > 0 && (
                              <select value="" onChange={(e) => { if (e.target.value && !especialidadesSel.includes(e.target.value)) setEspecialidadesSel([...especialidadesSel, e.target.value]); }} className="bg-transparent border-none focus:ring-0 font-body-lg text-on-surface px-2 outline-none cursor-pointer text-sm">
                                <option value="">+ Añadir...</option>
                                {especialidadesOpts.filter((o) => !especialidadesSel.includes(o)).map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            )}
                            <input value={especialidadInput} onChange={(e) => setEspecialidadInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEspecialidad())} placeholder="O escribe una..." className="bg-transparent border-none focus:ring-0 font-body-lg text-on-surface px-2 flex-grow min-w-[100px] outline-none text-sm" />
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                        <div>
                          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Carga de credencial profesional (opcional)</label>
                          <div className="border-2 border-dashed border-primary/20 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all" onClick={() => document.getElementById('credencial-input')?.click()}>
                            {credencialPreview ? (
                              <div className="flex flex-col items-center gap-2">
                                {credencialFile?.type.startsWith('image/') ? <img src={credencialPreview} alt="Credencial" className="max-h-32 rounded-lg" /> : <div className="flex items-center gap-2 text-primary"><Icon name="description" size={32} /><span className="text-sm font-medium">{credencialFile?.name}</span></div>}
                                <p className="text-xs text-outline">Click para cambiar</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container"><Icon name="upload_file" size={32} /></div>
                                <p className="font-title-md text-title-md text-primary">Cédula Profesional o Título</p>
                                <p className="font-label-sm text-label-sm text-on-surface-variant">Arrastra y suelta tu PDF o imagen aquí</p>
                                <button type="button" className="mt-2 px-6 py-2 rounded-full border border-primary/20 text-primary font-label-sm text-label-sm hover:bg-primary/5 transition-colors">Seleccionar archivo</button>
                              </div>
                            )}
                            <input id="credencial-input" type="file" accept="image/*,application/pdf" onChange={handleCredencialFile} className="hidden" />
                          </div>
                        </div>
                        <div className="flex gap-4 p-4 bg-secondary-container/30 rounded-xl">
                          <Icon name="verified_user" filled size={20} className="text-secondary shrink-0" />
                          <p className="font-label-sm text-label-sm text-on-secondary-container leading-relaxed">Tu cuenta se activará tras la validación administrativa. Este proceso suele tomar menos de 24 horas.</p>
                        </div>
                        <button type="button" onClick={() => setFisioStep(1)} className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm hover:text-primary transition-colors"><Icon name="arrow_back" size={18} /> Volver</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {error && <motion.div initial={{ opacity: 0, x: -10 }} animate={errorShake ? { x: [-10, 10, -8, 8, 0] } : { x: 0 }} transition={{ duration: 0.4 }} role="alert" className="px-4 py-3 rounded-xl bg-error-container/30 text-error text-sm font-bold border border-error/30 shadow-[0_0_20px_rgba(186,26,26,0.2)]">{error}</motion.div>}
                  <button type="submit" disabled={loading || uploading || cooldown > 0 || (fisioStep === 1 && !canSubmitFisioStep1)} aria-busy={loading} className="premium-btn w-full bg-primary text-on-primary py-4 rounded-2xl font-title-md text-title-md shadow-glow-primary hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 breathe-teal relative z-10">
                    {loading || uploading ? <Spinner size={20} className="text-current" /> : fisioStep === 1 ? <>Continuar <Icon name="arrow_forward" size={20} /></> : <>Crear cuenta y Finalizar <Icon name="arrow_forward" size={20} /></>}
                  </button>
                  <button type="button" onClick={() => switchMode('login')} className="text-center text-on-surface-variant font-label-sm text-label-sm hover:text-primary transition-colors w-full">¿Ya tienes cuenta? Inicia sesión</button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        {/* Demo buttons */}
        {!isRegister && (
          <div className="w-full max-w-md flex flex-col items-center gap-y-2 mt-5">
            <p className="text-label-sm font-label-sm text-outline uppercase tracking-[0.2em]">Explora la plataforma</p>
            <div className="flex gap-3">
              <button onClick={fillFisioDemo} className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-white/60 active:scale-95 transition-all text-on-surface-variant font-label-sm border border-white/40 hover-lift breathe-badge">
                <Icon name="medical_services" size={16} /> Demo Fisio
              </button>
              <button onClick={fillPacienteDemo} className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-white/60 active:scale-95 transition-all text-on-surface-variant font-label-sm border border-white/40 hover-lift breathe-badge">
                <Icon name="personal_injury" size={16} /> Demo Paciente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT PANEL — INTERACTIVE IMAGE (58% desktop, hidden mobile)
          ═══════════════════════════════════════════════════ */}
      {showImagePanel && (
        <div className="relative hidden md:block md:w-[58%] overflow-hidden">
          <motion.div className="relative h-full w-full" animate={imageControls}>
            {/* Breathing background image */}
            <motion.div
              className="h-full w-full"
              animate={reduceMotion ? undefined : { scale: breathingScale }}
              transition={{ duration: breathingDuration, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img
                src={LOGIN_BG_URL}
                alt="Sesion de rehabilitacion fisioterapeutica"
                className="h-full w-full object-cover object-center"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/18 pointer-events-none" />
              {/* Glassmorphic fade on top and bottom edges */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/80 dark:from-slate-950/80 to-transparent backdrop-blur-sm pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/80 dark:from-slate-950/80 to-transparent backdrop-blur-sm pointer-events-none" />
            </motion.div>

            {/* Interactive mascot */}
            <AnimatePresence>
              {isFisio && !isRegister && (
                <motion.div key="char-physio" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
                  <div className="relative w-[60%] h-[90%] max-h-[420px] flex items-center justify-center">
                    <SparkleEffect active={true} color="teal" />
                    <CharacterGlow side="left" colorRgb={glowColorRgb} phase={glowPhase} reduceMotion={reduceMotion} />
                    <MascotAnimation type={characterMascotType} size="md" className="!w-[200px] !h-[200px] lg:!w-[260px] lg:!h-[260px]" />
                  </div>
                </motion.div>
              )}
              {isPaciente && !isRegister && (
                <motion.div key="char-patient" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
                  <div className="relative w-[60%] h-[90%] max-h-[420px] flex items-center justify-center">
                    <SparkleEffect active={true} color="coral" />
                    <CharacterGlow side="right" colorRgb={glowColorRgb} phase={glowPhase} reduceMotion={reduceMotion} />
                    <MascotAnimation type={characterMascotType} size="md" className="!w-[200px] !h-[200px] lg:!w-[260px] lg:!h-[260px]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status message */}
            <AnimatePresence>
              {!loading && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-none"
                >
                  <div className="rounded-full glass-card px-8 py-3 shadow-ambient-teal shimmer-border">
                    <p className="font-title-sm text-title-sm gradient-text-teal">{statusMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading overlay */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-surface-dim/50 backdrop-blur-md"
                >
                  <motion.div
                    animate={reduceMotion ? undefined : { rotate: 360, scale: [1, 0.9, 1] }}
                    transition={reduceMotion ? undefined : { rotate: { repeat: Infinity, duration: 1, ease: 'linear' }, scale: { repeat: Infinity, duration: 0.8 } }}
                  >
                    <Icon name="progress_activity" size={64} filled className="text-primary animate-spin" />
                  </motion.div>
                  <motion.p
                    animate={reduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
                    transition={reduceMotion ? undefined : { repeat: Infinity, duration: 1.6 }}
                    className="text-on-surface font-headline-sm text-headline-sm"
                  >
                    Preparando tu espacio...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error flash */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="rounded-2xl bg-error/10 backdrop-blur-md px-8 py-4 border border-error/20">
                    <div className="flex items-center gap-3 text-error">
                      <Icon name="error" filled size={24} />
                      <span className="font-title-sm text-title-sm">Revisa tus credenciales e intenta de nuevo</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Registration full-width image panel */}
      {isFisio && isRegister && (
        <div className="relative hidden md:block md:w-[60%] overflow-hidden">
          <motion.div className="relative h-full w-full">
            <motion.div
              className="h-full w-full"
              animate={reduceMotion ? undefined : { scale: [1, 1.02, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img
                src={LOGIN_BG_URL}
                alt="Fisioterapeuta en clínica"
                className="h-full w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/20 pointer-events-none" />
              {/* Glassmorphic fade on top and bottom edges */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/80 dark:from-slate-950/80 to-transparent backdrop-blur-sm pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/80 dark:from-slate-950/80 to-transparent backdrop-blur-sm pointer-events-none" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-md px-8">
                <div className="w-16 h-16 rounded-3xl bg-primary/15 flex items-center justify-center mx-auto mb-6">
                  <Icon name="verified_user" filled size={36} className="text-primary" />
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Validación Profesional Premium</h3>
                <p className="text-on-surface-variant font-body-lg leading-relaxed">
                  Tu cuenta pasa por un proceso de verificación para garantizar la seguridad de todos los pacientes.
                  Suele completarse en menos de 24 horas.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Password recovery modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setShowResetModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-panel rounded-3xl p-8 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 breathe-teal">
                <Icon name="lock_reset" filled size={28} className="text-primary animate-breathe-icon" />
              </div>
              <h3 className="font-headline-lg text-headline-lg gradient-text-editorial text-center mb-2">Recuperar Contraseña</h3>
              <p className="text-on-surface-variant text-sm text-center mb-6">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
              <div className="relative mb-4">
                <Icon name="alternate_email" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="Correo electrónico" className="glass-input w-full pl-12 pr-4 py-3 rounded-xl font-body-lg focus:outline-none bg-white/20 border border-white/40 focus:bg-white/50 focus:border-primary/50 transition-all" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowResetModal(false)} className="flex-1 py-3 rounded-xl bg-surface-variant/40 text-on-surface-variant font-bold hover:bg-surface-variant/60 transition-all">Cancelar</button>
                <button onClick={handleResetPassword} disabled={resetLoading} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold hover:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {resetLoading ? <Spinner size={18} className="text-current" /> : <Icon name="send" size={18} />}
                  {resetLoading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-surface/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full glass-card p-10 rounded-[40px] text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary breathe-teal glow-teal">
                <Icon name="check_circle" filled size={48} className="animate-breathe-icon" />
              </div>
              <h3 className="font-headline-lg text-headline-lg gradient-text-editorial">¡Todo listo, Doctor!</h3>
              <p className="font-body-lg text-on-surface-variant">Hemos recibido tus datos. Tu cuenta está lista para explorar. Sube tu credencial para verificar tu cuenta.</p>
              <button onClick={() => { setShowSuccess(false); setMode('login'); setFisioStep(1); }} className="w-full py-4 bg-primary text-on-primary rounded-2xl font-title-md text-title-md active:scale-95 transition-all">Ir a Iniciar Sesión</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
