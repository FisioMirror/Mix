import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, icon, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center justify-between w-full gap-3 group',
        'disabled:opacity-50 disabled:pointer-events-none',
        'cursor-pointer',
      )}
    >
      {(label || description) && (
        <div className="flex items-center gap-2 flex-1 text-left">
          {icon && (
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              {icon}
            </span>
          )}
          <div>
            {label && (
              <p className="text-sm font-medium text-on-surface dark:text-primary-100">{label}</p>
            )}
            {description && (
              <p className="text-xs text-on-surface-variant">{description}</p>
            )}
          </div>
        </div>
      )}
      <div
        className={cn(
          'relative shrink-0 w-12 h-7 rounded-full transition-colors duration-300',
          checked
            ? 'bg-primary shadow-md shadow-primary/30'
            : 'bg-surface-variant/60 dark:bg-slate-700',
        )}
      >
        <motion.div
          className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
          animate={{ left: checked ? 'calc(100% - 24px)' : '4px' }}
          transition={{ type: 'spring', damping: 18, stiffness: 350 }}
        />
        {checked && (
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-1/2 left-1.5 -translate-y-1/2 text-white text-[10px] material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 700, 'opsz' 12" }}
          >
            check
          </motion.span>
        )}
      </div>
    </button>
  );
}
