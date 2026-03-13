import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({ value, max = 100, className, indicatorClassName }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("h-1 w-full rounded-full bg-surface-light overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full bg-accent transition-all duration-500 ease-out", indicatorClassName)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
