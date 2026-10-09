import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={s}
            className="flex min-w-0 flex-1 items-center gap-2"
            aria-current={active ? "step" : undefined}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors duration-200",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary bg-primary/10 text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "truncate text-xs font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px min-w-3 flex-1 transition-colors",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function FieldError({ msg }: { msg?: string | undefined }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}
