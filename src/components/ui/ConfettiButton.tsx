import { forwardRef, useCallback, type ButtonHTMLAttributes, type ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { cn } from '../../lib/utils';

export interface ConfettiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  /** Colores personalizados para los confettis. Por defecto, paleta teal/app. */
  colors?: string[];
  /** Número de partículas a lanzar. */
  particleCount?: number;
  /** Dispersión inicial del confetti. */
  spread?: number;
  /** Velocidad inicial de las partículas. */
  startVelocity?: number;
}

const DEFAULT_COLORS = ['#14b8a6', '#8ad3cf', '#156966', '#34d399', '#ffffff'];

/**
 * Botón que dispara confetti desde su propio centro al hacer clic.
 * Útil para celebraciones: completar un reto, guardar un logro, etc.
 *
 * Acepta todas las props nativas de `<button>`, incluido `onClick` (se invoca
 * después de lanzar el confetti).
 */
export const ConfettiButton = forwardRef<HTMLButtonElement, ConfettiButtonProps>(
  (
    {
      children,
      className,
      colors = DEFAULT_COLORS,
      particleCount = 90,
      spread = 70,
      startVelocity = 35,
      onClick,
      ...buttonProps
    },
    ref,
  ) => {
    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        const defaults = {
          origin: { x, y },
          colors,
          particleCount,
          spread,
          startVelocity,
          scalar: 0.9,
          ticks: 220,
          zIndex: 9999,
        };

        // Tres ráfagas a distintos ángulos para un efecto más festivo.
        confetti({ ...defaults, angle: 60 });
        confetti({ ...defaults, angle: 120 });
        confetti({
          ...defaults,
          angle: 90,
          particleCount: Math.round(particleCount / 2),
          scalar: 1.2,
        });

        onClick?.(event);
      },
      [colors, particleCount, spread, startVelocity, onClick],
    );

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2',
          'text-sm font-medium transition-transform active:scale-95',
          'bg-primary text-white hover:bg-primary/90 focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary/40',
          className,
        )}
        onClick={handleClick}
        {...buttonProps}
      >
        {children}
      </button>
    );
  },
);

ConfettiButton.displayName = 'ConfettiButton';
