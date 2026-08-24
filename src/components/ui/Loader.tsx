import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useLoadingMessages, type LoadingContext } from '../../hooks/useLoadingMessages';

interface LoaderProps {
  size?: number;
  className?: string;
  context?: LoadingContext;
}

export function Spinner({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('inline-block animate-spin', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="opacity-20"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function DotLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-2 h-2 rounded-full bg-current"
          style={{
            animation: 'dotBounce 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function BarLoader({ className }: { className?: string }) {
  return (
    <div className={cn('w-32 h-1 rounded-full overflow-hidden bg-primary/10', className)}>
      <div
        className="h-full rounded-full bg-primary"
        style={{ animation: 'barSlide 1.2s ease-in-out infinite' }}
      />
      <style>{`
        @keyframes barSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}

/**
 * Premium logo-based loader.
 *
 * Renders the FisioMirror logo as the centerpiece inside a softly breathing
 * glass disc, wrapped by a teal conic-gradient ring that spins smoothly via
 * framer-motion. Two staggered pulse rings emanate outward for a refined,
 * clinical feel that matches the app's teal aesthetic.
 */
export function LogoLoader({ size = 96, className }: { size?: number; className?: string }) {
  const logoSize = Math.round(size * 0.5);
  const ringThickness = Math.max(2, Math.round(size * 0.035));

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      {/* Ambient halo behind the logo */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-60 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(138,211,207,0.35) 0%, transparent 65%)',
        }}
      />

      {/* Expanding pulse rings */}
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-primary/30 pointer-events-none"
          style={{ width: size, height: size }}
          initial={{ scale: 0.85, opacity: 0.55 }}
          animate={{ scale: 1.35, opacity: 0 }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeOut',
            delay: i * 1.2,
          }}
        />
      ))}

      {/* Spinning conic-gradient ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          padding: ringThickness,
          background: `conic-gradient(from 0deg, transparent 0deg, var(--c-primary-300, #8ad3cf) 90deg, var(--c-primary, #156966) 180deg, transparent 260deg)`,
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - ' + ringThickness + 'px), #000 calc(100% - ' + ringThickness + 'px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - ' + ringThickness + 'px), #000 calc(100% - ' + ringThickness + 'px))',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />

      {/* Subtle track behind the ring */}
      <div
        className="absolute rounded-full border pointer-events-none"
        style={{
          width: size,
          height: size,
          borderWidth: ringThickness,
          borderColor: 'rgba(21, 105, 102, 0.08)',
        }}
      />

      {/* Glass disc holding the logo — gentle breathing scale */}
      <motion.div
        className="relative rounded-full flex items-center justify-center shadow-ambient-teal"
        style={{
          width: size - ringThickness * 2 - 6,
          height: size - ringThickness * 2 - 6,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(138,211,207,0.06) 100%)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src="/logo.png"
          alt="FisioMirror"
          className="object-contain select-none"
          style={{ width: logoSize, height: logoSize }}
          draggable={false}
        />
      </motion.div>
    </div>
  );
}

export function FullLoader({ size = 96, className, context = 'general' }: LoaderProps) {
  const message = useLoadingMessages(context);
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <LogoLoader size={size} className={className} />
      <motion.p
        className="text-sm text-on-surface-variant font-medium"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {message}
      </motion.p>
    </div>
  );
}

export function ButtonLoader({ size = 18 }: { size?: number }) {
  return <Spinner size={size} className="text-current" />;
}
