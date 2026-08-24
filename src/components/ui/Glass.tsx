import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassPanel({ children, className, onClick }: GlassPanelProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-panel',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GlassCard({ children, className, onClick }: GlassPanelProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card rounded-3xl',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
