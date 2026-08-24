import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface LightRaysProps {
  count?: number;
  color?: string;
  blur?: number;
  speed?: number;
  length?: string;
  className?: string;
}

type LightRay = {
  id: string;
  left: number;
  rotate: number;
  width: number;
  swing: number;
  delay: number;
  duration: number;
  intensity: number;
};

function createRays(count: number, cycle: number): LightRay[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i}-${Math.round(Math.random() * 100)}`,
    left: 8 + Math.random() * 84,
    rotate: -28 + Math.random() * 56,
    width: 160 + Math.random() * 160,
    swing: 0.8 + Math.random() * 1.8,
    delay: Math.random() * cycle,
    duration: cycle * (0.75 + Math.random() * 0.5),
    intensity: 0.6 + Math.random() * 0.5,
  }));
}

export function LightRays({
  count = 7,
  color = 'rgba(20, 184, 166, 0.15)',
  blur = 36,
  speed = 14,
  length = '70vh',
  className,
}: LightRaysProps) {
  const [rays, setRays] = useState<LightRay[]>([]);
  const cycleDuration = Math.max(speed, 0.1);

  useEffect(() => {
    setRays(createRays(count, cycleDuration));
  }, [count, cycleDuration]);

  return (
    <div className={cn('pointer-events-none absolute inset-0 isolate overflow-hidden rounded-[inherit]', className)}>
      {rays.map((ray) => (
        <motion.div
          key={ray.id}
          className="absolute -top-[12%] left-[var(--ray-left)] h-[var(--light-rays-length)] w-[var(--ray-width)] origin-top -translate-x-1/2 rounded-full bg-gradient-to-b from-[color-mix(in_srgb,var(--light-rays-color)_70%,transparent)] to-transparent opacity-0 mix-blend-screen blur-[var(--light-rays-blur)]"
          style={{
            '--ray-left': `${ray.left}%`,
            '--ray-width': `${ray.width}px`,
            '--light-rays-color': color,
            '--light-rays-blur': `${blur}px`,
            '--light-rays-length': length,
          } as React.CSSProperties}
          initial={{ rotate: ray.rotate }}
          animate={{
            opacity: [0, ray.intensity, 0],
            rotate: [ray.rotate - ray.swing, ray.rotate + ray.swing, ray.rotate - ray.swing],
          }}
          transition={{
            duration: ray.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: ray.delay,
            repeatDelay: ray.duration * 0.1,
          }}
        />
      ))}
    </div>
  );
}
