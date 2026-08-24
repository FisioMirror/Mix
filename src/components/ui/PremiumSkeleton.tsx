import { cn } from '../../lib/utils';

export function PremiumSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={cn('skeleton rounded-lg', className)} />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <PremiumSkeleton className="w-10 h-10 rounded-xl" />
        <PremiumSkeleton className="w-12 h-3 rounded" />
      </div>
      <PremiumSkeleton className="w-20 h-2 rounded" />
      <PremiumSkeleton className="w-16 h-8 rounded" />
    </div>
  );
}

export function PatientListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-4">
          <PremiumSkeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <PremiumSkeleton className="w-32 h-3 rounded" />
            <PremiumSkeleton className="w-48 h-2 rounded" />
          </div>
          <PremiumSkeleton className="w-16 h-6 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
