import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
  width?: string;
  height?: string;
}

export function Skeleton({ className, variant = 'rect', width, height }: SkeletonProps) {
  const radiusClass =
    variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded-md' : 'rounded-xl';
  return (
    <div
      className={cn('skeleton', radiusClass, className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width="48px" height="48px" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height="14px" />
          <Skeleton variant="text" width="40%" height="12px" />
        </div>
      </div>
      <Skeleton variant="text" width="90%" height="12px" />
      <Skeleton variant="text" width="75%" height="12px" />
      <div className="flex gap-2">
        <Skeleton variant="rect" width="80px" height="28px" />
        <Skeleton variant="rect" width="80px" height="28px" />
      </div>
    </div>
  );
}

export function SkeletonKPI() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton variant="circle" width="32px" height="32px" />
      <Skeleton variant="text" width="50%" height="12px" />
      <Skeleton variant="text" width="70%" height="24px" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-3">
          <Skeleton variant="circle" width="40px" height="40px" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="55%" height="14px" />
            <Skeleton variant="text" width="35%" height="12px" />
          </div>
          <Skeleton variant="rect" width="60px" height="24px" />
        </div>
      ))}
    </div>
  );
}
