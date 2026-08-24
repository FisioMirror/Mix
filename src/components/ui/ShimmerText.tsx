import { cn } from '../../lib/utils';

interface ShimmerTextProps {
  text: string;
  className?: string;
}

export function ShimmerText({ text, className }: ShimmerTextProps) {
  return (
    <span
      className={cn(
        'shimmer-text bg-gradient-to-r from-primary/40 via-primary to-primary/40 bg-[length:200%_100%] bg-clip-text text-transparent font-headline-lg',
        className,
      )}
    >
      {text}
    </span>
  );
}
