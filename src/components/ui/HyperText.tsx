import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface HyperTextProps {
  /** Texto final que se revela tras el scramble. */
  children: string;
  className?: string;
  /** Duración total del efecto en ms. */
  duration?: number;
  /** Si es true, el scramble se dispara al pasar el cursor. Si no, arranca en mount. */
  animateOnHover?: boolean;
}

/** Caracteres de los que se compone el "ruido" durante el scramble. */
const SCRAMBLE_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!<>-_\\/[]{}—=+*^?#________';

/** Devuelve un carácter aleatorio del set de scramble. */
function randomChar(): string {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

export const HyperText = memo(
  ({ children, className, duration = 800, animateOnHover = true }: HyperTextProps) => {
    const target = children;
    const [display, setDisplay] = useState(animateOnHover ? target : '');
    const frameRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);

    const stopAnimation = useCallback(() => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    }, []);

    const animate = useCallback(() => {
      stopAnimation();
      startTimeRef.current = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        const revealedCount = Math.floor(progress * target.length);
        let next = '';
        for (let i = 0; i < target.length; i++) {
          if (i < revealedCount) {
            next += target[i];
          } else if (target[i] === ' ') {
            next += ' ';
          } else {
            next += randomChar();
          }
        }
        setDisplay(next);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          setDisplay(target);
          frameRef.current = null;
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    }, [duration, stopAnimation, target]);

    // Cuando no se anima en hover, arranca al montar.
    useEffect(() => {
      if (!animateOnHover) {
        animate();
      }
      return stopAnimation;
    }, [animate, animateOnHover, stopAnimation]);

    // Reinicia la animación si el texto final cambia y no estamos en modo hover.
    useEffect(() => {
      if (!animateOnHover) {
        setDisplay('');
        animate();
      } else {
        setDisplay(target);
      }
    }, [target, animateOnHover, animate]);

    const handleMouseEnter = () => {
      if (animateOnHover) animate();
    };

    return (
      <span
        className={cn('inline-block', className)}
        onMouseEnter={handleMouseEnter}
        aria-label={target}
      >
        <AnimatePresence>
          {display.split('').map((char, i) => (
            <motion.span
              key={`${i}-${char}`}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.05, ease: 'easeOut' }}
              className="inline-block whitespace-pre"
              aria-hidden
            >
              {char}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    );
  },
);

HyperText.displayName = 'HyperText';
