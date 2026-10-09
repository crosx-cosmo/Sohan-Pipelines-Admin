import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  loading,
  accent = "primary",
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
  accent?: "primary" | "copper" | "success" | "info";
}) {
  const accentClass = {
    primary: "bg-primary/10 text-primary",
    copper: "bg-copper/12 text-copper",
    success: "bg-success/12 text-success",
    info: "bg-info/12 text-info",
  }[accent];

  if (loading) {
    return (
      <div className="surface-panel rounded-2xl p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-32" />
        <Skeleton className="mt-3 h-3 w-20" />
      </div>
    );
  }

  const positive = (delta ?? 0) >= 0;

  return (
    <div className="surface-panel hover-lift group rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-current/10 transition-transform duration-200 group-hover:scale-105",
            accentClass,
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="num mt-4 text-[1.7rem] font-semibold leading-none">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              "num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
              positive ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="truncate text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
