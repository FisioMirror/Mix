import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CommandItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  items: CommandItem[];
  placeholder?: string;
  className?: string;
}

export function CommandPalette({ items, placeholder = 'Buscar pacientes o ejercicios... (⌘K)', className }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState(items);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setFiltered(items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())));
  }, [query, items]);

  return (
    <>
      <div className={cn('relative w-full', className)}>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
            search
          </span>
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              'w-full pl-12 pr-4 py-2.5 rounded-xl glass-input font-body-lg',
              'bg-white/20 border border-white/40 text-on-surface',
              'placeholder-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-all',
            )}
          />
        </div>
        <AnimatePresence>
          {isOpen && query && (
            <motion.ul
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full mt-2 w-full rounded-xl glass-panel shadow-glass-lg border border-white/30 overflow-hidden z-30"
            >
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-on-surface-variant">Sin resultados</li>
              ) : (
                filtered.slice(0, 6).map((item, i) => (
                  <motion.li
                    key={i}
                    onClick={() => { item.onSelect(); setIsOpen(false); setQuery(''); }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 cursor-pointer transition-colors text-sm text-on-surface"
                  >
                    {item.icon && <span className="text-on-surface-variant">{item.icon}</span>}
                    {item.label}
                  </motion.li>
                ))
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
