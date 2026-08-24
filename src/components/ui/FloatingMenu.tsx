import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface FloatingMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  color?: string;
}

interface FloatingMenuProps {
  items: FloatingMenuItem[];
  /** Etiqueta accesible para el botón principal del FAB. */
  ariaLabel?: string;
  className?: string;
}

export function FloatingMenu({ items, ariaLabel = 'Acciones rápidas', className }: FloatingMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('flex flex-col items-end gap-3 safe-area-bottom', className)}>
      <AnimatePresence>
        {open && items.map((item, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => { item.onClick(); setOpen(false); }}
            aria-label={item.label}
            className="flex items-center gap-2 px-4 py-3 rounded-full glass-panel border border-white/30 text-sm font-medium text-on-surface hover:bg-white/60 active:scale-95 transition-all shadow-lg min-h-[48px] min-w-[48px] max-w-[calc(100vw-2rem)]"
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </motion.button>
        ))}
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setOpen(!open)}
        aria-label={open ? `Cerrar ${ariaLabel}` : `Abrir ${ariaLabel}`}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl shadow-primary/20 min-h-[56px] min-w-[56px] touch-manipulation"
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus size={24} />
        </motion.div>
      </motion.button>
    </div>
  );
}
