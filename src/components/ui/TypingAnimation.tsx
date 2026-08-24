import { useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { cn } from '../../lib/utils';

interface TypingAnimationProps {
  children?: string;
  words?: string[];
  className?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseDelay?: number;
  loop?: boolean;
  showCursor?: boolean;
  blinkCursor?: boolean;
}

export function TypingAnimation({
  children,
  words,
  className,
  typeSpeed = 100,
  deleteSpeed,
  pauseDelay = 1000,
  loop = false,
  showCursor = true,
  blinkCursor = true,
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'pause' | 'deleting'>('typing');
  const elementRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(elementRef, { amount: 0.3, once: true });

  const wordsToAnimate = useMemo(() => words ?? (children ? [children] : []), [words, children]);
  const deletingSpeed = deleteSpeed ?? typeSpeed / 2;

  useEffect(() => {
    if (!isInView || wordsToAnimate.length === 0) return;
    const currentWord = wordsToAnimate[currentWordIndex] || '';
    const graphemes = Array.from(currentWord);
    const timeout = setTimeout(() => {
      if (phase === 'typing') {
        if (currentCharIndex < graphemes.length) {
          setDisplayedText(graphemes.slice(0, currentCharIndex + 1).join(''));
          setCurrentCharIndex(currentCharIndex + 1);
        } else if (loop || currentWordIndex < wordsToAnimate.length - 1) {
          setPhase('pause');
        }
      } else if (phase === 'pause') {
        setPhase('deleting');
      } else if (phase === 'deleting') {
        if (currentCharIndex > 0) {
          setDisplayedText(graphemes.slice(0, currentCharIndex - 1).join(''));
          setCurrentCharIndex(currentCharIndex - 1);
        } else {
          setCurrentWordIndex((currentWordIndex + 1) % wordsToAnimate.length);
          setPhase('typing');
        }
      }
    }, phase === 'typing' ? typeSpeed : phase === 'deleting' ? deletingSpeed : pauseDelay);

    return () => clearTimeout(timeout);
  }, [isInView, phase, currentCharIndex, currentWordIndex, displayedText, wordsToAnimate, loop, typeSpeed, deletingSpeed, pauseDelay]);

  const isComplete = !loop && currentWordIndex === wordsToAnimate.length - 1 && currentCharIndex >= Array.from(wordsToAnimate[currentWordIndex] || '').length;
  const shouldShowCursor = showCursor && !isComplete;

  return (
    <span ref={elementRef} className={cn('inline-block', className)}>
      {displayedText}
      {shouldShowCursor && <span className={cn('inline-block', blinkCursor && 'animate-blink')}>|</span>}
    </span>
  );
}
