import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '../../lib/utils';

interface ExpandableToggleProps {
  onExpand?: () => void;
  onCollapse?: () => void;
  expandLabel?: string;
  collapseLabel?: string;
  className?: string;
}

export function ExpandableToggle({
  onExpand,
  onCollapse,
  expandLabel = 'Más opciones',
  collapseLabel = 'Cerrar',
  className,
}: ExpandableToggleProps) {
  const [toggle, setToggle] = useState(false);

  return (
    <div className={cn('flex h-full w-full items-center justify-center', className)}>
      <motion.div layout>
        <motion.div
          className="relative flex items-center justify-between overflow-hidden rounded-full glass-panel"
          style={{ borderRadius: 9999 }}
          initial={{ scale: 0, y: '100%' }}
          transition={{ type: 'spring', bounce: 0.16 }}
          animate={{ scale: 1, y: 0, width: !toggle ? 60 : 280 }}
        >
          <div className="flex h-full w-[220px] items-center justify-center gap-2 rounded-full">
            {toggle && (
              <motion.div
                animate={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.25 }}
                className="flex items-center justify-center gap-2"
              >
                <span className="h-[10px] w-[60px] rounded-full bg-primary/20" />
                <span className="size-[10px] rounded-full bg-primary/30" />
                <span className="size-[10px] rounded-full bg-primary/30" />
                <span className="size-[10px] rounded-full bg-primary/30" />
              </motion.div>
            )}
          </div>
          {toggle && (
            <div className="flex h-full w-[60px] items-center justify-center rounded-full bg-primary/10">
              <motion.div
                initial={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
                className="flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {toggle ? 'check' : 'expand_more'}
                </span>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
      <button
        onClick={() => {
          const next = !toggle;
          setToggle(next);
          if (next) onExpand?.();
          else onCollapse?.();
        }}
        className="glass-panel absolute bottom-8 my-8 rounded-full px-6 py-1.5 text-on-surface-variant font-label-sm text-label-sm active:scale-95 transition-transform"
      >
        {toggle ? collapseLabel : expandLabel}
      </button>
    </div>
  );
}
