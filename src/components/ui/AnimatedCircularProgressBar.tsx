import { cn } from '../../lib/utils';

interface Props {
  value: number;
  gaugePrimaryColor: string;
  gaugeSecondaryColor: string;
  className?: string;
  size?: number;
}

export function AnimatedCircularProgressBar({ value, gaugePrimaryColor, gaugeSecondaryColor, className, size = 160 }: Props) {
  const circumference = 2 * Math.PI * 45;
  const currentPercent = Math.round(value);
  const dashOffset = circumference - (currentPercent / 100) * circumference;

  return (
    <div className={cn('relative font-semibold', className)} style={{ width: size, height: size, fontSize: size * 0.15 }}>
      <svg fill="none" className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" strokeWidth="10" stroke={gaugeSecondaryColor} fill="none" />
        <circle
          cx="50"
          cy="50"
          r="45"
          strokeWidth="10"
          stroke={gaugePrimaryColor}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute inset-0 m-auto size-fit">{currentPercent}%</span>
    </div>
  );
}
