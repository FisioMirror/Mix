import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * A collapsible app-style section: a header button toggles the visibility of
 * its content with a smooth height/opacity animation. The chevron icon
 * rotates when the section is open. Defaults to collapsed unless
 * `defaultOpen` is set.
 */
export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`glass-card rounded-3xl overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-surface-variant/10 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="icon-accent-teal shrink-0">
              <Icon name={icon} filled size={22} />
            </span>
          )}
          <h3 className="font-title-md text-title-md gradient-text-editorial truncate">
            {title}
          </h3>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="shrink-0 text-on-surface-variant"
        >
          <Icon name="expand_more" size={24} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
