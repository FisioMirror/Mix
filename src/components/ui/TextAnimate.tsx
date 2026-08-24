import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface TextAnimateProps {
  children: string;
  className?: string;
  by?: 'word' | 'character';
  animation?: 'fadeIn' | 'blurIn' | 'slideUp' | 'scaleUp';
  delay?: number;
  duration?: number;
}

const variants = {
  fadeIn: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } },
  blurIn: { hidden: { opacity: 0, filter: 'blur(10px)' }, show: { opacity: 1, filter: 'blur(0px)' } },
  slideUp: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } },
  scaleUp: { hidden: { opacity: 0, scale: 0.5 }, show: { opacity: 1, scale: 1 } },
};

export const TextAnimate = memo(({ children, className, by = 'word', animation = 'fadeIn', delay = 0, duration = 0.3 }: TextAnimateProps) => {
  const segments = by === 'word' ? children.split(' ') : children.split('');
  const itemVariants = variants[animation];

  return (
    <motion.span
      className={cn('inline-block', className)}
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: duration / segments.length, delayChildren: delay }}
    >
      {segments.map((segment, i) => (
        <motion.span
          key={`${segment}-${i}`}
          variants={itemVariants}
          transition={{ duration }}
          className="inline-block whitespace-pre"
        >
          {segment}{by === 'word' && i < segments.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </motion.span>
  );
});

TextAnimate.displayName = 'TextAnimate';
