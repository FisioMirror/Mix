import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface TabLightProps {
  tabs: string[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
}

export default function TabLight({ tabs, defaultIndex = 0, onChange, className }: TabLightProps) {
  const [active, setActive] = useState(defaultIndex);

  const handleClick = (index: number) => {
    setActive(index);
    onChange?.(index);
  };

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full glass-panel p-1', className)}>
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => handleClick(i)}
          className="relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200"
        >
          {active === i && (
            <motion.div
              layoutId="tab-light-indicator"
              className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <span className={cn('relative z-10', active === i ? 'text-white' : 'text-on-surface-variant')}>
            {tab}
          </span>
        </button>
      ))}
    </div>
  );
}
