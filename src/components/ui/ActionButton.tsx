import { type ReactNode } from 'react';
import { Icon } from './Icon';
import { Spinner } from './Loader';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ActionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  icon?: string;
  iconFilled?: boolean;
  iconSize?: number;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 btn-shine',
  secondary:
    'bg-surface-variant/40 text-on-surface-variant hover:bg-surface-variant/60 active:scale-95',
  ghost:
    'text-on-surface-variant hover:bg-surface-variant/30 active:scale-95',
  danger:
    'bg-error/10 text-error hover:bg-error/20 active:scale-95',
};

export function ActionButton({
  children,
  onClick,
  variant = 'primary',
  className,
  icon,
  iconFilled = false,
  iconSize = 20,
  disabled = false,
  loading = false,
  type = 'button',
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center gap-2 font-title-md transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden',
        variantClasses[variant],
        className,
      )}
    >
      {loading ? (
        <Spinner size={iconSize} className="text-current" />
      ) : (
        icon && <Icon name={icon} filled={iconFilled} size={iconSize} />
      )}
      {children}
    </button>
  );
}
