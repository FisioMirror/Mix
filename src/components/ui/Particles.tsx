import { useMemo } from 'react';

interface ParticlesProps {
  count?: number;
  className?: string;
  colors?: string[];
}

export function Particles({
  count = 20,
  className = '',
  colors = ['rgba(138, 211, 207, 0.4)', 'rgba(21, 105, 102, 0.3)', 'rgba(255, 218, 204, 0.3)'],
}: ParticlesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 6 + Math.random() * 10,
        delay: Math.random() * 5,
        color: colors[i % colors.length],
      })),
    [count, colors],
  );

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animation: `particleFloat ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-30px) translateX(10px); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export function Spotlight({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div
        className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(138, 211, 207, 0.12) 0%, transparent 70%)',
          animation: 'spotlightPulse 8s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes spotlightPulse {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.8; transform: translateX(-50%) scale(1.15); }
        }
      `}</style>
    </div>
  );
}

export function GradientSeparator({ icon }: { icon?: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      {icon && (
        <span className="material-symbols-outlined text-primary/40 text-lg">{icon}</span>
      )}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  );
}
