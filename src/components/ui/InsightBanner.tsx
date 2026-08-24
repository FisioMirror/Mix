import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface InsightBannerProps {
  title: string;
  description: string;
  icon?: ReactNode;
  onDismiss?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function InsightBanner({ title, description, icon, onDismiss, variant = 'primary', className }: InsightBannerProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const handleDismiss = () => { setVisible(false); onDismiss?.(); };

  return (
    <div
      className={cn(
        'relative flex items-center gap-4 p-4 rounded-2xl shadow-lg text-white',
        variant === 'primary' ? 'bg-gradient-to-r from-primary to-primary-container' : 'bg-gradient-to-r from-secondary to-secondary/80',
        className,
      )}
    >
      <div className="shrink-0 text-2xl">
        {icon || <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>}
      </div>
      <div className="flex-1">
        <h4 className="font-title-sm text-title-sm font-semibold">{title}</h4>
        <p className="text-sm text-white/80">{description}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors"
        aria-label="Cerrar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
