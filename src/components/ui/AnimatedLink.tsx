import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface AnimatedLinkProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function AnimatedLink({ children, href, onClick, className }: AnimatedLinkProps) {
  const Tag = href ? 'a' : 'button' as const;
  return (
    <Tag
      {...(href ? { href } : { type: 'button' as const })}
      onClick={onClick}
      className={cn(
        'group relative inline-flex items-center text-primary hover:text-primary/80 transition-colors cursor-pointer',
        className,
      )}
    >
      <span className="relative">
        {children}
        <span className="absolute bottom-0 left-0 h-[2px] w-full origin-right scale-x-0 bg-current transition-transform duration-300 group-hover:origin-left group-hover:scale-x-100" />
      </span>
      <svg className="ml-1 size-3 -translate-y-0.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" fill="none" viewBox="0 0 10 10">
        <path d="M1.004 9.166 9.337.833m0 0v8.333m0-8.333H1.004" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Tag>
  );
}
