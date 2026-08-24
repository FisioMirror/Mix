import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  variant?: 'default' | 'secondary';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onTabChange?: (id: string) => void;
}

export function AnimatedTabs({
  tabs,
  defaultTab,
  orientation = 'horizontal',
  className,
  onTabChange,
}: AnimatedTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const isVertical = orientation === 'vertical';

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    onTabChange?.(id);
  };

  return (
    <div className={cn('flex', isVertical ? 'flex-row gap-4' : 'flex-col', className)}>
      <div
        className={cn(
          isVertical
            ? 'flex flex-col space-y-1 border-r border-outline-variant/30 pr-4'
            : 'flex border-b border-outline-variant/30 overflow-x-auto overflow-y-hidden flex-nowrap scrollbar-thin [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleTabClick(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center',
              tab.disabled && 'opacity-40 cursor-not-allowed',
              !tab.disabled && 'cursor-pointer hover:text-on-surface',
              activeTab === tab.id ? 'text-primary' : 'text-on-surface-variant',
              isVertical && activeTab === tab.id && 'border-l-2 border-primary bg-primary/5 rounded-r-lg',
            )}
          >
            {tab.label}
            {activeTab === tab.id && !isVertical && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="pt-4 flex-1">{tabs.find((t) => t.id === activeTab)?.content}</div>
    </div>
  );
}
