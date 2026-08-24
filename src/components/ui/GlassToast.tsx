import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

type GlassToastType = 'success' | 'error' | 'info' | 'warning';

interface GlassToastItem {
  id: number;
  message: string;
  type: GlassToastType;
}

interface GlassToastApi {
  show: (message: string, type?: GlassToastType) => void;
}

const GlassToastContext = createContext<GlassToastApi | null>(null);

export function GlassToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<GlassToastItem[]>([]);

  const show = useCallback((message: string, type: GlassToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const iconMap: Record<GlassToastType, string> = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  // Borde izquierdo de color por tipo (verde/rojo/ámbar/azul)
  // + acento teal en modo oscuro como borde base.
  const accentMap: Record<GlassToastType, string> = {
    success: 'border-l-emerald-500 dark:border-l-emerald-400',
    error: 'border-l-red-500 dark:border-l-red-400',
    warning: 'border-l-amber-500 dark:border-l-amber-400',
    info: 'border-l-blue-500 dark:border-l-blue-400',
  };

  const iconColorMap: Record<GlassToastType, string> = {
    success: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <GlassToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none w-[92%] max-w-md">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 100) dismiss(toast.id);
              }}
              className={cn(
                'flex items-center gap-3 px-5 py-4 rounded-2xl backdrop-blur-2xl',
                'shadow-xl min-w-[280px] max-w-[420px] pointer-events-auto',
                // Modo claro: superficie crema/blanca con texto oscuro
                'bg-white/95 border border-black/5',
                // Modo oscuro: superficie slate-800, texto blanco, acento teal
                'dark:bg-slate-800/95 dark:border-teal-500/25',
                // Borde izquierdo de color según el tipo
                'border-l-4',
                accentMap[toast.type],
              )}
            >
              <span
                className={cn(
                  'material-symbols-outlined text-2xl shrink-0',
                  iconColorMap[toast.type],
                )}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {iconMap[toast.type]}
              </span>
              <span className="text-sm font-semibold flex-1 leading-snug text-primary-800 dark:text-white">
                {toast.message}
              </span>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-primary-600/60 dark:text-white/60 hover:text-primary-800 dark:hover:text-white transition-colors"
                aria-label="Cerrar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GlassToastContext.Provider>
  );
}

export function useGlassToast(): GlassToastApi {
  const ctx = useContext(GlassToastContext);
  if (!ctx) throw new Error('useGlassToast debe usarse dentro de GlassToastProvider');
  return ctx;
}
