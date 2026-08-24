import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface AILoaderProps {
  /** Texto que se muestra letra a letra (por defecto "Generando"). */
  label?: string;
  className?: string;
  /** Tamaño del texto en px. */
  textSize?: number;
  /** Anchura de la barra de progreso en px. */
  barWidth?: number;
}

/**
 * Loader animado estilo "IA generando…".
 *
 * Muestra cada letra de la palabra (por defecto "Generando") rebotando con
 * un retardo escalonado y, debajo, una barra de progreso teal indeterminada.
 * Toda la animación vive en framer-motion/Tailwind — sin CSS externo.
 */
export function AILoader({
  label = 'Generando',
  className,
  textSize = 18,
  barWidth = 160,
}: AILoaderProps) {
  const letters = Array.from(label);

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-end" style={{ height: textSize * 1.4 }}>
        {letters.map((letter, i) => (
          <motion.span
            key={`${i}-${letter}`}
            className="inline-block font-semibold leading-none"
            style={{
              color: '#14b8a6',
              fontSize: textSize,
            }}
            animate={{ y: [0, -textSize * 0.35, 0] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.08,
            }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </motion.span>
        ))}
      </div>

      {/* Barra de progreso indeterminada */}
      <div
        className="relative overflow-hidden rounded-full bg-teal-500/15"
        style={{ width: barWidth, height: 4 }}
      >
        <motion.div
          className="absolute inset-y-0 rounded-full"
          style={{ width: '40%', backgroundColor: '#14b8a6' }}
          animate={{ x: ['-100%', `${barWidth}px`] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </div>
  );
}

export default AILoader;
