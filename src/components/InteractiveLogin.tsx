import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, HeartHandshake, User } from 'lucide-react';
import { ComingSoonModal } from './ui/ComingSoonModal';
import { PinInput } from './ui/PinInput';
import MascotAnimation from './ui/MascotAnimation';
import type { MascotType } from './ui/MascotAnimation';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Role = 'paciente' | 'fisioterapeuta';
type FormState = 'idle' | 'typing' | 'loading' | 'error' | 'success';
type ActiveField = 'email' | 'password';
type GlowPhase = 'pulse' | 'settled' | 'error';

interface InteractiveLoginProps {
  onLogin: (role: Role, email: string, password: string) => Promise<void>;
  onLoginSuccess?: () => void;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────
// Color tokens — teal / cyan for fisio, warm coral for paciente
// ─────────────────────────────────────────────────────────────

const COLORS = {
  teal: '13, 148, 136', // #0D9488
  cyan: '6, 182, 212', // #06B6D4
  coral: '251, 146, 60', // warm coral / amber for paciente
  red: '239, 68, 68', // soft red for error state
};

// ─────────────────────────────────────────────────────────────
// Character glow overlay
// ─────────────────────────────────────────────────────────────

interface CharacterGlowProps {
  side: 'left' | 'right';
  colorRgb: string;
  phase: GlowPhase;
}

function CharacterGlow({ side, colorRgb, phase }: CharacterGlowProps) {
  const variants = {
    pulse: {
      opacity: [0.25, 0.85, 0.25, 0.85, 0.5],
      transition: { duration: 1, times: [0, 0.25, 0.5, 0.75, 1], ease: 'easeInOut' as const },
    },
    settled: {
      opacity: 0.45,
      transition: { duration: 0.5, ease: 'easeInOut' as const },
    },
    error: {
      opacity: [0.45, 1, 0.45, 1, 0.45],
      transition: { duration: 1, ease: 'easeInOut' as const },
    },
  };

  return (
    <motion.div
      className={`pointer-events-none absolute top-0 h-full w-1/2 ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
      initial={{ opacity: 0 }}
      animate={variants[phase]}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${
            side === 'left' ? '65%' : '35%'
          } 55%, rgba(${colorRgb}, 0.55) 0%, rgba(${colorRgb}, 0.25) 35%, rgba(${colorRgb}, 0) 70%)`,
          filter: 'blur(28px)',
        }}
      />
      <div
        className="absolute"
        style={{
          [side]: '8%',
          top: '30%',
          width: '55%',
          height: '55%',
          borderRadius: '9999px',
          boxShadow: `0 0 80px 40px rgba(${colorRgb}, 0.35)`,
        } as React.CSSProperties}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function InteractiveLogin({
  onLogin,
  onLoginSuccess,
  errorMessage,
}: InteractiveLoginProps) {
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formState, setFormState] = useState<FormState>('idle');
  const [activeField, setActiveField] = useState<ActiveField>('email');
  const [glowPhase, setGlowPhase] = useState<GlowPhase>('pulse');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const imageControls = useAnimation();
  const glowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle role selection: pulse then settle
  const handleSelectRole = (nextRole: Role) => {
    setRole(nextRole);
    setFormState('idle');
    setGlowPhase('pulse');
    if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
    glowTimeoutRef.current = setTimeout(() => setGlowPhase('settled'), 1000);
  };

  // React to external error message: shake + red glow flash
  useEffect(() => {
    if (!errorMessage) return;

    setFormState('error');
    setGlowPhase('error');

    void imageControls.start({
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.5, ease: 'easeInOut' },
    });

    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      setGlowPhase('settled');
      setFormState('idle');
    }, 1000);

    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, [errorMessage, imageControls]);

  useEffect(() => {
    return () => {
      if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const markTyping = () => {
    if (formState === 'idle' || formState === 'typing') {
      setFormState('typing');
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setActiveField('email');
    markTyping();
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setActiveField('password');
    markTyping();
  };

  const handleTokenChange = (digits: string) => {
    setToken(digits);
    setActiveField('email');
    markTyping();
  };

  const isFormValid =
    role === 'fisioterapeuta'
      ? email.trim().length > 0 && password.trim().length > 0
      : role === 'paciente'
      ? token.length === 6
      : false;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role || !isFormValid || formState === 'loading') return;

    setFormState('loading');
    try {
      await onLogin(role, role === 'fisioterapeuta' ? email : token, password);
      setFormState('success');
      setGlowPhase('settled');
      onLoginSuccess?.();
    } catch {
      // Parent is expected to surface failures via the errorMessage prop.
      setFormState('idle');
    }
  };

  const mascotType: MascotType =
    formState === 'loading' ? 'loading'
    : formState === 'error' ? 'error'
    : formState === 'success' ? 'success'
    : formState === 'typing' ? 'speaking'
    : role === null ? 'greeting'
    : 'idle';
  const breathingAnimation =
    formState === 'typing'
      ? { scale: [1, 1.01, 1] }
      : { scale: [1, 1.02, 1] };
  const breathingDuration = formState === 'typing' ? 3 : 4;
  const isLoading = formState === 'loading';

  const glowColorRgb =
    glowPhase === 'error'
      ? COLORS.red
      : role === 'fisioterapeuta'
      ? COLORS.teal
      : COLORS.coral;

  return (
    <div className="flex min-h-screen w-full bg-[#FAFAFA]">
      {/* ── LEFT PANEL — FORM ── */}
      <div className="relative flex w-full items-center justify-center px-6 py-12 md:w-2/5">
        {/* Mesh gradient background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(at 0% 0%, rgba(13,148,136,0.10) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(6,182,212,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(251,146,60,0.06) 0px, transparent 60%)',
          }}
        />
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -left-10 top-20 h-40 w-40 rounded-full bg-[#0D9488]/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-0 h-32 w-32 rounded-full bg-[#06B6D4]/15 blur-3xl" />

        <div className="relative w-full max-w-[480px]">
          <div className="rounded-[2.5rem] border border-white/40 bg-white/30 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl sm:p-10">
            {/* Header */}
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-2 flex items-center gap-2.5">
                <img src="/logo.png" alt="" className="h-16 w-auto shrink-0" />
                <h1 className="font-sans text-4xl font-extrabold tracking-tight text-[#0D9488]">
                  FisioMirror
                </h1>
              </div>
              <p className="font-sans text-sm text-[#1E293B]/70">
                Seleccioná tu rol para comenzar
              </p>
            </div>

            {/* Segmented control with sliding indicator */}
            <div className="relative mb-8 flex items-center rounded-2xl bg-[#1E293B]/10 p-1.5">
              <motion.div
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl bg-white shadow-md"
                animate={{ left: role === 'fisioterapeuta' ? 'calc(50% + 0px)' : '6px' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              <button
                type="button"
                onClick={() => handleSelectRole('paciente')}
                className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold transition-colors duration-300 ${
                  role === 'paciente' ? 'text-[#0D9488]' : 'text-[#1E293B]/60'
                }`}
              >
                <User className="h-4 w-4" />
                Paciente
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('fisioterapeuta')}
                className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold transition-colors duration-300 ${
                  role === 'fisioterapeuta' ? 'text-[#0D9488]' : 'text-[#1E293B]/60'
                }`}
              >
                <HeartHandshake className="h-4 w-4" />
                Fisioterapeuta
              </button>
            </div>

            {/* Role title */}
            <AnimatePresence mode="wait">
              {role && (
                <motion.div
                  key={`title-${role}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="mb-6 text-center"
                >
                  <h2 className="font-sans text-xl font-bold tracking-tight text-[#1E293B]">
                    {role === 'paciente'
                      ? 'Comienza tu recuperación hoy'
                      : 'Gestión Clínica de Alto Rendimiento'}
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {role === 'fisioterapeuta' && (
                  <motion.div
                    key="therapist-fields"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1E293B]/40" />
                      <input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        onFocus={() => setActiveField('email')}
                        placeholder="Correo electrónico"
                        className="w-full rounded-xl border border-slate-200 bg-white/70 py-3 pl-10 pr-4 font-sans text-sm text-[#1E293B] outline-none transition-shadow focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20"
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1E293B]/40" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={handlePasswordChange}
                        onFocus={() => setActiveField('password')}
                        placeholder="Contraseña"
                        className="w-full rounded-xl border border-slate-200 bg-white/70 py-3 pl-10 pr-10 font-sans text-sm text-[#1E293B] outline-none transition-shadow focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1E293B]/40 hover:text-[#1E293B]/70"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="font-sans text-xs font-medium text-[#0D9488] hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  </motion.div>
                )}

                {role === 'paciente' && (
                  <motion.div
                    key="patient-fields"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <label className="mb-3 block text-center font-sans text-xs font-medium text-[#1E293B]/60">
                      Ingresá tu token de 6 dígitos
                    </label>
                    <PinInput
                      value={token}
                      onChange={handleTokenChange}
                      disabled={isLoading}
                      autoFocus
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {errorMessage && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg bg-red-50 px-3 py-2 text-center font-sans text-xs font-medium text-red-500"
                  >
                    {errorMessage}
                  </motion.p>
                )}
              </AnimatePresence>

              {role && (
                <motion.button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  whileTap={isFormValid && !isLoading ? { scale: 0.97 } : undefined}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold text-white transition-colors duration-300 ${
                    isFormValid && !isLoading
                      ? 'bg-[#0D9488] shadow-lg shadow-teal-500/30 hover:bg-[#0c847a]'
                      : 'cursor-not-allowed bg-slate-300'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </motion.button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — ARTICULATED CHARACTER ── */}
      <div className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#f0fdfa_46%,#dff7f2_100%)] md:flex md:w-3/5 md:items-center md:justify-end !pr-0 !mr-0">
        <motion.div
          className="relative flex h-full w-full items-center justify-end md:mr-0"
          animate={imageControls}
        >
          <motion.div
            key={formState === 'typing' ? 'typing' : formState}
            className="relative flex h-[88%] w-[78%] max-w-[560px] items-center justify-center overflow-visible md:mr-0 md:!pr-0"
            animate={breathingAnimation}
            transition={{
              duration: breathingDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`mascot-${mascotType}`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex h-full w-full items-center justify-center"
              >
                <MascotAnimation
                  type={mascotType}
                  size="md"
                  className="!w-[180px] !h-[180px] lg:!w-[240px] lg:!h-[240px]"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {role === 'fisioterapeuta' && (
              <CharacterGlow
                key="glow-therapist"
                side="left"
                colorRgb={glowColorRgb}
                phase={glowPhase}
              />
            )}
            {(role === 'paciente' || role === null) && (
              <CharacterGlow
                key="glow-patient"
                side="right"
                colorRgb={glowColorRgb}
                phase={glowPhase}
              />
            )}
          </AnimatePresence>

          {/* Idle prompt */}
          <AnimatePresence>
            {!role && formState !== 'loading' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <span className="rounded-full bg-white/70 px-6 py-3 font-sans text-sm font-medium text-[#1E293B] shadow-lg backdrop-blur-sm">
                  Seleccioná tu rol para comenzar
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/40"
              >
                <motion.div
                  animate={{ opacity: 0.6 }}
                  className="absolute inset-0 bg-black/20"
                />
                <Loader2 className="relative z-10 h-10 w-10 animate-spin text-white" />
                <p className="relative z-10 font-sans text-sm font-medium text-white">
                  Preparando tu espacio...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <ComingSoonModal
        open={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Recuperación de Contraseña"
        description="La funcionalidad de recuperación de contraseña estará disponible próximamente. Por ahora, contacta a tu fisioterapeuta para restablecer tu acceso."
      />
    </div>
  );
}
