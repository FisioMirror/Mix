import { motion, AnimatePresence } from 'framer-motion';
import { useLoadingMessages, type LoadingContext } from '../../hooks/useLoadingMessages';
import { cn } from '../../lib/utils';

interface LoadingTextProps {
  context?: LoadingContext;
  className?: string;
  /** Show the primary spinner next to the text. */
  withSpinner?: boolean;
  spinnerSize?: number;
}

/**
 * Rotating contextual loading message. Use anywhere a generic
 * "Cargando…" / "Analizando…" label would otherwise be hardcoded.
 */
export function LoadingText({
  context = 'general',
  className,
  withSpinner = false,
  spinnerSize = 18,
}: LoadingTextProps) {
  const message = useLoadingMessages(context);

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {withSpinner && (
        <svg
          className="animate-spin shrink-0"
          width={spinnerSize}
          height={spinnerSize}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      <AnimatePresence mode="wait">
        <motion.span
          key={message}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="inline-block"
        >
          {message}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
