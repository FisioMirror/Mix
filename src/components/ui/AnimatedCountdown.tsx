import NumberFlow from '@number-flow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface AnimatedCountdownProps {
  initialCount?: number;
  onComplete?: () => void;
  className?: string;
}

export function AnimatedCountdown({ initialCount = 60, onComplete, className }: AnimatedCountdownProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c === 0) {
          onComplete?.();
          return initialCount;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPaused, initialCount, onComplete]);

  useEffect(() => { setCount(initialCount); }, [resetTrigger, initialCount]);

  const minutes = Math.floor(count / 60);
  const seconds = count % 60;

  return (
    <div className={cn('relative flex flex-col items-center justify-center', className)}>
      <div className="font-display-lg text-display-lg font-bold tabular-nums text-primary">
        <NumberFlow value={minutes} spinTiming={{ duration: 0.3 }} />
        <span className="text-on-surface-variant/40">:</span>
        <NumberFlow value={seconds} spinTiming={{ duration: 0.3 }} />
      </div>
      <div className="flex w-fit items-center gap-2 mt-4">
        <motion.button
          aria-label={isPaused ? 'Reanudar' : 'Pausar'}
          onClick={() => setIsPaused((p) => !p)}
          whileTap={{ scale: 0.9 }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:opacity-80"
        >
          <AnimatePresence initial={false} mode="wait">
            {isPaused ? (
              <motion.span
                key="play"
                initial={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
                transition={{ duration: 0.1 }}
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </motion.span>
            ) : (
              <motion.span
                key="pause"
                initial={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
                transition={{ duration: 0.1 }}
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                pause
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <button
          aria-label="Reiniciar"
          onClick={() => { setResetTrigger((prev) => prev + 1); setIsPaused(false); }}
          className="glass-panel rounded-full px-4 py-1.5 text-sm text-on-surface-variant hover:bg-white/60 transition-colors"
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
}
