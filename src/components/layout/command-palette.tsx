import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { buildNavGroups } from "./nav-config";
import { bookings, customers, technicians } from "@/lib/mock-data";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { toggle } = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search bookings, technicians, customers or jump to a page…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              toggle();
            }}
          >
            <Sun className="dark:hidden" />
            <Moon className="hidden dark:block" /> Toggle theme
            <CommandShortcut>⌘J</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        {buildNavGroups().map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem key={item.to} onSelect={() => go(item.to)} value={`page ${item.label}`}>
                <item.icon /> {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Recent bookings">
          {bookings.slice(0, 5).map((b) => (
            <CommandItem
              key={b.id}
              value={`${b.id} ${b.customer} ${b.service}`}
              onSelect={() => go("/bookings")}
            >
              <span className="num text-muted-foreground">{b.id}</span>
              <span className="truncate">
                {b.customer} · {b.service}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Technicians">
          {technicians.slice(0, 4).map((t) => (
            <CommandItem key={t.id} value={`tech ${t.name}`} onSelect={() => go("/technicians")}>
              {t.name}
              <span className="ml-auto text-xs text-muted-foreground">{t.expertise[0]}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Customers">
          {customers.slice(0, 4).map((c) => (
            <CommandItem key={c.id} value={`cust ${c.name}`} onSelect={() => go("/customers")}>
              {c.name}
              <span className="ml-auto text-xs text-muted-foreground">{c.location}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
