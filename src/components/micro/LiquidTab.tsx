import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface LiquidTabProps {
  tabs: string[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
}

export default function LiquidTab({ tabs, defaultIndex = 0, onChange, className }: LiquidTabProps) {
  const [active, setActive] = useState(defaultIndex);

  const handleClick = (index: number) => {
    setActive(index);
    onChange?.(index);
  };

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full glass-panel p-1 relative', className)}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="goo-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className="relative flex items-center gap-1" style={{ filter: 'url(#goo-filter)' }}>
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => handleClick(i)}
            className="relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200"
          >
            {active === i && (
              <motion.div
                layoutId="liquid-tab-indicator"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}
            <span className={cn('relative z-10', active === i ? 'text-white' : 'text-on-surface-variant')}>
              {tab}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
