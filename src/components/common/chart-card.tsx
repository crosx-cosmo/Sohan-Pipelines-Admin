import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  loading,
  height = 300,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  loading?: boolean;
  height?: number;
}) {
  return (
    <section className={cn("surface-panel overflow-hidden rounded-2xl", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border/55 px-5 py-4 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-4 sm:p-6" style={{ minHeight: height }}>
        {loading ? (
          <Skeleton className="h-full w-full" style={{ height: height - 24 }} />
        ) : (
          children
        )}
      </div>
    </section>
  );
}
