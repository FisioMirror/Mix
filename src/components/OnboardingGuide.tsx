import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Dumbbell, Camera, MessageCircle, TrendingUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface OnboardingStep {
  icon: typeof Heart;
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    icon: Heart,
    title: 'Bienvenido a FisioMirror',
    description:
      'Tu compañero de recuperación. Aquí podrás realizar tus ejercicios, recibir feedback en tiempo real y seguir tu progreso día a día.',
  },
  {
    icon: Dumbbell,
    title: 'Tus Ejercicios',
    description:
      'En la sección "Ejercicios" encontrarás la rutina que tu fisioterapeuta ha asignado para ti, con series, repeticiones y guía paso a paso.',
  },
  {
    icon: Camera,
    title: 'Espejo AR',
    description:
      'Inicia una sesión AR y tu cámara analizará tu movimiento en tiempo real, corrigiendo tu postura y midiendo tus ángulos articulares.',
  },
  {
    icon: MessageCircle,
    title: 'Physi',
    description:
      '¿Tienes dudas sobre tu recuperación? Chatea con Physi para resolver preguntas sobre tus ejercicios, dolor y progreso.',
  },
  {
    icon: TrendingUp,
    title: 'Tu Progreso',
    description:
      'Visualiza tu racha de días, sesiones completadas y minutos de práctica. Mantén la constancia para alcanzar tus objetivos.',
  },
];

export function OnboardingGuide() {
  const user = useAuthStore((s) => s.user);

  const [show, setShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Check whether the patient has already completed onboarding.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user?.id) return;
      // Only show onboarding for patients.
      if (user.role !== 'paciente') return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) return;
        if (!data) return;
        if (data.onboarding_completed === false) {
          setShow(true);
        }
      } catch {
        // If we can't determine status, don't block the dashboard.
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const completeOnboarding = useCallback(async () => {
    if (!user?.id) {
      setShow(false);
      return;
    }
    setCompleting(true);
    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch {
      // Even if the update fails, hide the guide so the user isn't stuck.
    } finally {
      setCompleting(false);
      setShow(false);
    }
  }, [user?.id]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    // Jump straight to completion.
    completeOnboarding();
  };

  if (!show) return null;

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="onboarding-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Glass panel */}
          <motion.div
            className="relative z-10 w-full max-w-[min(32rem,calc(100vw-2rem))] glass-panel rounded-3xl p-6 sm:p-8 shadow-glass-lg overflow-hidden overflow-y-auto overflow-x-hidden max-h-[calc(100vh-2rem)] break-words"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
          >
            {/* Skip / close control */}
            <button
              onClick={handleSkip}
              disabled={completing}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
              aria-label="Saltar guía"
            >
              <X size={20} />
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-8 bg-primary'
                      : i < currentStep
                        ? 'w-4 bg-primary/50'
                        : 'w-4 bg-on-surface-variant/20'
                  }`}
                />
              ))}
            </div>

            {/* Step content with transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-primary-container flex items-center justify-center text-on-primary-container mb-5 shadow-glow-primary animate-breathe-icon">
                  <StepIcon size={40} strokeWidth={1.8} />
                </div>
                <h3
                  id="onboarding-title"
                  className="font-headline-sm text-headline-sm text-on-surface mb-3 break-words whitespace-normal overflow-hidden"
                >
                  {step.title}
                </h3>
                <p className="text-on-surface-variant text-body-lg leading-relaxed max-w-sm break-words whitespace-normal overflow-hidden">
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={handleSkip}
                disabled={completing}
                className="px-4 py-3 rounded-2xl text-on-surface-variant font-label-md text-label-md hover:bg-on-surface-variant/10 transition-colors disabled:opacity-50"
              >
                Saltar
              </button>

              {isLast ? (
                <motion.button
                  onClick={completeOnboarding}
                  disabled={completing}
                  whileTap={{ scale: 0.96 }}
                  className="premium-btn bg-primary text-on-primary font-bold px-8 py-3 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-60"
                >
                  {completing ? 'Guardando…' : 'Entendido'}
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleNext}
                  whileTap={{ scale: 0.96 }}
                  className="premium-btn bg-primary text-on-primary font-bold px-8 py-3 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  Siguiente
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
