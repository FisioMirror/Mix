import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface OrbitAndScrewProps {
  onComplete?: (value: string) => void;
  length?: number;
  className?: string;
}

export default function OrbitAndScrew({ onComplete, length = 4, className }: OrbitAndScrewProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const [phase, setPhase] = useState<'input' | 'orbit' | 'verified'>('input');
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, val: string) => {
    if (val.length > 1) return;
    const next = [...values];
    next[index] = val;
    setValues(next);
    if (val && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
    if (next.every((v) => v !== '')) {
      setPhase('orbit');
      setTimeout(() => {
        setPhase('verified');
        onComplete?.(next.join(''));
      }, 1200);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const reset = () => {
    setValues(Array(length).fill(''));
    setPhase('input');
    refs.current[0]?.focus();
  };

  const radius = 60;

  return (
    <div className={cn('flex items-center justify-center', className)} onClick={phase === 'verified' ? reset : undefined}>
      <div className="relative" style={{ width: 200, height: 200 }}>
        <AnimatePresence mode="wait">
          {phase === 'input' && (
            <motion.div
              key="input"
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 h-full"
            >
              {values.map((val, i) => (
                <input
                  key={i}
                  ref={(el) => { refs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={val}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl glass-panel border border-teal-500/20 focus:border-teal-500 focus:outline-none text-on-surface"
                />
              ))}
            </motion.div>
          )}

          {phase === 'orbit' && (
            <motion.div key="orbit" className="relative h-full" initial={{ opacity: 1 }}>
              {values.map((val, i) => {
                const angle = (i / length) * Math.PI * 2;
                return (
                  <motion.div
                    key={i}
                    className="absolute w-12 h-14 flex items-center justify-center text-xl font-bold rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(angle) * radius,
                      y: Math.sin(angle) * radius,
                      rotate: 360,
                      scale: 0.6,
                    }}
                    transition={{ duration: 1, ease: 'easeInOut' }}
                  >
                    {val}
                  </motion.div>
                );
              })}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
              />
            </motion.div>
          )}

          {phase === 'verified' && (
            <motion.div
              key="verified"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center h-full"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center"
              >
                <Check className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
