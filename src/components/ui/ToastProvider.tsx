import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "../../lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  description?: ReactNode;
  timeout?: number;
}

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: ReactNode;
  description?: ReactNode;
}

export interface ToastApi {
  success: (message: ReactNode, options?: ToastOptions) => string;
  error: (message: ReactNode, options?: ToastOptions) => string;
  warning: (message: ReactNode, options?: ToastOptions) => string;
  info: (message: ReactNode, options?: ToastOptions) => string;
  close: (key: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let toastIdCounter = 0;

interface VariantConfig {
  icon: typeof CheckCircle2;
  borderClass: string;
  iconClass: string;
}

const variantConfig: Record<ToastVariant, VariantConfig> = {
  success: {
    icon: CheckCircle2,
    borderClass: "border-l-emerald-500 dark:border-l-emerald-400",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: AlertCircle,
    borderClass: "border-l-red-500 dark:border-l-red-400",
    iconClass: "text-red-600 dark:text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    borderClass: "border-l-amber-500 dark:border-l-amber-400",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  info: {
    icon: Info,
    borderClass: "border-l-blue-500 dark:border-l-blue-400",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
};

export function ToastProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (variant: ToastVariant, message: ReactNode, options?: ToastOptions): string => {
      const id = `toast-${++toastIdCounter}`;
      setToasts((prev) => [
        ...prev,
        { id, variant, message, description: options?.description },
      ]);

      const timeout = options?.timeout ?? 5000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, timeout);

      return id;
    },
    [],
  );

  const success = useCallback(
    (message: ReactNode, options?: ToastOptions) => addToast("success", message, options),
    [addToast],
  );

  const error = useCallback(
    (message: ReactNode, options?: ToastOptions) => addToast("error", message, options),
    [addToast],
  );

  const warning = useCallback(
    (message: ReactNode, options?: ToastOptions) => addToast("warning", message, options),
    [addToast],
  );

  const info = useCallback(
    (message: ReactNode, options?: ToastOptions) => addToast("info", message, options),
    [addToast],
  );

  const close = useCallback((key: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== key));
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  const api: ToastApi = { success, error, warning, info, close, clear };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onClose={close} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "fixed z-[200] pointer-events-none",
        "top-5 left-1/2 -translate-x-1/2",
        "flex flex-col gap-2 items-center",
      )}
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = variantConfig[toast.variant];
          const Icon = config.icon;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className={cn(
                "pointer-events-auto",
                "flex items-start gap-3 px-4 py-3 rounded-xl",
                "bg-white/95 dark:bg-slate-800/95",
                "backdrop-blur-xl",
                "border border-black/5 dark:border-teal-500/25",
                "shadow-glass-lg",
                "min-w-[280px] max-w-[420px]",
                "border-l-4",
                config.borderClass,
              )}
            >
              <div className="shrink-0 mt-0.5">
                <Icon className={cn("w-7 h-7", config.iconClass)} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-medium text-primary-800 dark:text-white">
                  {toast.message}
                </p>
                {toast.description && (
                  <p className="mt-0.5 text-xs text-primary-700/70 dark:text-white/70">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => onClose(toast.id)}
                aria-label="Cerrar"
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-lg shrink-0",
                  "text-primary-600/60 dark:text-white/60",
                  "hover:bg-primary-50 dark:hover:bg-white/10",
                  "hover:text-primary-800 dark:hover:text-white",
                  "transition-colors duration-200",
                  "cursor-pointer outline-none",
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de un <ToastProvider>");
  }
  return ctx;
}

export default ToastProvider;
