import { cn } from '../../lib/utils';

interface ProgressiveBlurProps {
  position?: 'top' | 'bottom';
  height?: string;
  className?: string;
}

export function ProgressiveBlur({ position = 'top', height = '80px', className }: ProgressiveBlurProps) {
  const isTop = position === 'top';
  return (
    <div
      className={cn(
        'pointer-events-none absolute left-0 w-full select-none z-10',
        isTop ? 'top-0' : 'bottom-0',
        className,
      )}
      style={{
        height,
        background: isTop
          ? 'linear-gradient(to top, transparent, var(--color-surface, #f8fafb))'
          : 'linear-gradient(to bottom, transparent, var(--color-surface, #f8fafb))',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    />
  );
}
