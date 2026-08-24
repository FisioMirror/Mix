import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterText({ text, speed = 50, className, onComplete }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    const id = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(id);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, onComplete]);

  return (
    <span className={cn('inline-block', className)}>
      {displayed}
      <span className="animate-pulse text-primary ml-0.5">|</span>
    </span>
  );
}
