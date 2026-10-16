import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/12 text-info border-info/25",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/12 text-destructive border-destructive/25",
  brand: "bg-primary/12 text-primary border-primary/25",
  copper: "bg-copper/14 text-copper border-copper/30",
};

const map: Record<string, keyof typeof tones> = {
  Pending: "warning",
  Confirmed: "info",
  Assigned: "brand",
  "In Progress": "copper",
  Completed: "success",
  Cancelled: "danger",
  Rescheduled: "neutral",
  Active: "success",
  Inactive: "neutral",
  Dormant: "warning",
  Blocked: "danger",
  Available: "success",
  "On Job": "copper",
  "Off Duty": "neutral",
  Emergency: "danger",
  Priority: "warning",
  Standard: "neutral",
  Paid: "success",
  Overdue: "danger",
  Refunded: "info",
  Purchase: "success",
  Consumed: "info",
  Return: "warning",
  Damage: "danger",
};

export function StatusBadge({
  value,
  tone,
  className,
  dot = true,
}: {
  value: string;
  tone?: keyof typeof tones;
  className?: string;
  dot?: boolean;
}) {
  const key = tone ?? map[value] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-[color,background-color,border-color,transform] duration-150 hover:-translate-y-px",
        tones[key],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {value}
    </span>
  );
}
