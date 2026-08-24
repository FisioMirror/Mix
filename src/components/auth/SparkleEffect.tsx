import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SparkleProps {
  active: boolean;
  color: 'teal' | 'coral';
}

const sparks = [
  { x: '-15%', y: '-10%', size: 14, delay: 0 },
  { x: '105%', y: '-5%', size: 18, delay: 0.1 },
  { x: '-10%', y: '45%', size: 12, delay: 0.2 },
  { x: '105%', y: '55%', size: 16, delay: 0.05 },
  { x: '10%', y: '102%', size: 15, delay: 0.15 },
  { x: '85%', y: '98%', size: 12, delay: 0.25 },
  { x: '50%', y: '-20%', size: 20, delay: 0.08 },
];

export const SparkleEffect: React.FC<SparkleProps> = ({ active, color }) => {
  const glowColor = color === 'teal' ? 'rgba(20, 184, 166, 0.6)' : 'rgba(244, 63, 94, 0.6)';
  const sparkColor = color === 'teal' ? '#2DD4BF' : '#FB7185';

  return (
    <AnimatePresence>
      {active && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
          <motion.div
            initial={{ scale: 0.85, opacity: 0.9 }}
            animate={{ scale: [1, 1.25, 1.4], opacity: [0.8, 0.3, 0] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-0 rounded-3xl border-2"
            style={{ borderColor: sparkColor, boxShadow: `0 0 25px ${glowColor}` }}
          />
          <motion.div
            animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.98, 1.02, 0.98] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-3xl"
            style={{ background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)` }}
          />
          {sparks.map((s, i) => (
            <motion.svg
              key={i}
              viewBox="0 0 24 24"
              style={{ position: 'absolute', left: s.x, top: s.y, width: s.size, height: s.size, fill: sparkColor }}
              initial={{ scale: 0, opacity: 0, rotate: 0 }}
              animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0], rotate: [0, 90, 180] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
            >
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </motion.svg>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};
