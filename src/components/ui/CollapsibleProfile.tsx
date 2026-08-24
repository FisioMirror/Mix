import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CollapsibleProfileProps {
  name: string;
  avatar?: string;
  bio: string;
  stats?: { label: string; value: number }[];
  className?: string;
}

export function CollapsibleProfile({ name, avatar, bio, stats, className }: CollapsibleProfileProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold overflow-hidden shrink-0">
            {avatar ? <img src={avatar} alt={name} className="h-full w-full object-cover" /> : name.charAt(0)}
          </div>
          <span className="font-medium text-on-surface">{name}</span>
        </div>
        <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }} className="text-on-surface-variant">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-sm text-on-surface-variant">{bio}</p>
              {stats && (
                <div className="flex gap-4">
                  {stats.map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-base text-primary">{s.label === 'sesiones' ? 'event_available' : 'activity'}</span>
                      {s.value} {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
