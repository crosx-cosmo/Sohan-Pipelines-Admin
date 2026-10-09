import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as db from "@/lib/db";
import { useData } from "@/components/auth/auth-gate";
import { serviceAreas as seed, type ServiceArea } from "@/lib/mock-data";
import { useMockLoading } from "@/hooks/use-mock-loading";

export const Route = createFileRoute("/service-areas")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search["view"] === "upcoming" || search["view"] === "paused" ? search["view"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Service Areas — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content: "West Bengal service coverage with normalized city names and merged PIN codes.",
      },
      { property: "og:title", content: "Service Areas — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content: "West Bengal service coverage with normalized city names and merged PIN codes.",
      },
    ],
  }),
  component: ServiceAreasPage,
});

function ServiceAreasPage() {
  const { reload } = useData();
  const routeSearch = Route.useSearch();
  const loading = useMockLoading();
  const [rows, setRows] = useState<ServiceArea[]>(seed);
  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ city: "", district: "", pincodes: "" });

  useEffect(() => {
    setQuery("");
    setOnlyActive(false);
  }, [routeSearch.view]);

  /** Normalize + merge duplicate city entries, then group A–Z. */
  const grouped = useMemo(() => {
    const merged = new Map<string, ServiceArea>();
    for (const area of rows) {
      const key = area.city.trim().toLowerCase();
      const existing = merged.get(key);
      if (existing) {
        merged.set(key, {
          ...existing,
          pincodes: Array.from(new Set([...existing.pincodes, ...area.pincodes])).sort(),
          technicians: existing.technicians + area.technicians,
          activeBookings: existing.activeBookings + area.activeBookings,
          active: existing.active || area.active,
        });
      } else {
        merged.set(key, { ...area, pincodes: Array.from(new Set(area.pincodes)).sort() });
      }
    }

    const q = query.trim().toLowerCase();
    const list = Array.from(merged.values())
      .filter(
        (a) =>
          (!q ||
            a.city.toLowerCase().includes(q) ||
            a.district.toLowerCase().includes(q) ||
            a.pincodes.some((p) => p.includes(q))) &&
          (!onlyActive || a.active) &&
          (routeSearch.view === "upcoming"
            ? !a.active && a.technicians === 0 && a.activeBookings === 0
            : routeSearch.view === "paused"
              ? !a.active
              : true),
      )
      .sort((a, b) => a.city.localeCompare(b.city));

    const buckets = new Map<string, ServiceArea[]>();
    for (const a of list) {
      const letter = a.city.charAt(0).toUpperCase();
      buckets.set(letter, [...(buckets.get(letter) ?? []), a]);
    }
    return Array.from(buckets.entries());
  }, [rows, query, onlyActive, routeSearch.view]);

  const totalPins = rows.reduce((s, a) => s + a.pincodes.length, 0);

  return (
    <>
      <PageHeader
        title={
          routeSearch.view === "upcoming"
            ? "Upcoming Service Areas"
            : routeSearch.view === "paused"
              ? "Paused Service Areas"
              : "Service Areas"
        }
        description={
          routeSearch.view === "upcoming"
            ? "Coverage locations prepared for a future launch."
            : routeSearch.view === "paused"
              ? "Coverage locations currently paused from service."
              : `Coverage across ${rows.length} West Bengal towns and ${totalPins} PIN codes.`
        }
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add area
          </Button>
        }
      />

      <div className="surface-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, district or PIN code…"
            className="pl-9"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2.5 rounded-lg border border-border px-3 py-2">
          <Switch id="active-only" checked={onlyActive} onCheckedChange={setOnlyActive} />
          <Label htmlFor="active-only" className="text-sm">
            Active areas only
          </Label>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="surface-panel rounded-xl">
          <EmptyState
            icon={MapPin}
            title="No service areas match"
            description="Try another city name, district or PIN code."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([letter, areas]) => (
            <section key={letter}>
              <div className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                  {letter}
                </span>
                <div className="h-px flex-1 bg-border" />
                <span className="num text-xs text-muted-foreground">{areas.length}</span>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {areas.map((a) => (
                  <article key={a.id} className="surface-panel hover-lift rounded-xl p-5">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{a.city}</h3>
                        <p className="truncate text-xs text-muted-foreground">{a.district}</p>
                      </div>
                      <StatusBadge value={a.active ? "Active" : "Inactive"} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {a.pincodes.map((p) => (
                        <span
                          key={p}
                          className="num rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {p}
                        </span>
                      ))}
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-border/70 pt-4 text-sm">
                      <div>
                        <dt className="text-[11px] text-muted-foreground">Technicians</dt>
                        <dd className="num font-medium">{a.technicians}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">Active bookings</dt>
                        <dd className="num font-medium">{a.activeBookings}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Serviceable</span>
                      <Switch
                        checked={a.active}
                        aria-label={`Toggle ${a.city}`}
                        onCheckedChange={(v) => {
                          void db.persist(
                            () => db.setAreaActive(a.id, v),
                            reload,
                            `${a.city} ${v ? "enabled" : "paused"}`,
                            toast,
                          );
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add service area</DialogTitle>
            <DialogDescription>
              Duplicate city names are merged automatically and PIN codes are de-duplicated.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="a-city">City / town</Label>
              <Input
                id="a-city"
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                placeholder="e.g. Bankura"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-dist">District</Label>
              <Input
                id="a-dist"
                value={draft.district}
                onChange={(e) => setDraft({ ...draft, district: e.target.value })}
                placeholder="e.g. Bankura"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-pin">PIN codes (comma separated)</Label>
              <Input
                id="a-pin"
                value={draft.pincodes}
                onChange={(e) => setDraft({ ...draft, pincodes: e.target.value })}
                placeholder="722101, 722102"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!draft.city.trim()) {
                  toast.error("City name is required");
                  return;
                }
                const pins = draft.pincodes
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean);
                if (pins.some((p) => !/^\d{6}$/.test(p))) {
                  toast.error("PIN codes must be 6 digits");
                  return;
                }
                const d = {
                  city: draft.city.trim(),
                  district: draft.district.trim(),
                  pincodes: pins,
                };
                void db
                  .persist(() => db.addServiceArea(d), reload, `${d.city} added to coverage`, toast)
                  .then((ok) => {
                    if (ok) {
                      setDraft({ city: "", district: "", pincodes: "" });
                      setAddOpen(false);
                    }
                  });
              }}
            >
              Add area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
