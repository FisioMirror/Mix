import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface WaveformVisualizerProps {
  isActive?: boolean;
  onToggle?: (active: boolean) => void;
  className?: string;
}

export function WaveformVisualizer({ isActive: externalActive, onToggle, className }: WaveformVisualizerProps) {
  const bars = 7;
  const getRandomHeights = () => Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2);
  const [heights, setHeights] = useState(getRandomHeights());
  const [internalActive, setInternalActive] = useState(false);
  const isActive = externalActive ?? internalActive;

  useEffect(() => {
    if (!isActive) { setHeights(Array(bars).fill(0.1)); return; }
    const id = setInterval(() => setHeights(getRandomHeights()), 120);
    return () => clearInterval(id);
  }, [isActive]);

  return (
    <motion.button
      onClick={() => {
        const next = !isActive;
        setInternalActive(next);
        onToggle?.(next);
      }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'flex items-center gap-1 rounded-full glass-panel p-3 border border-white/30 transition-all',
        isActive && 'ring-2 ring-primary/30',
        className,
      )}
      aria-label={isActive ? 'Detener grabación' : 'Iniciar grabación de voz'}
    >
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className={cn('w-1.5 rounded-full', isActive ? 'bg-primary' : 'bg-on-surface-variant/30')}
          animate={{ height: Math.max(2, h * 18) }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        />
      ))}
      <span className="ml-2 material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: isActive ? "'FILL' 1" : 'none' }}>
        {isActive ? 'stop' : 'mic'}
      </span>
    </motion.button>
  );
}
