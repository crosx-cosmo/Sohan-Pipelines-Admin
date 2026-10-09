import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, IndianRupee, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as db from "@/lib/db";
import { useData } from "@/components/auth/auth-gate";
import { services as seed, type Service } from "@/lib/mock-data";
import { inr, num } from "@/lib/format";
import { useMockLoading } from "@/hooks/use-mock-loading";

export const Route = createFileRoute("/services")({
  validateSearch: (search: Record<string, unknown>) => ({
    view:
      search["view"] === "pending" || search["view"] === "cancelled" ? search["view"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Services — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content: "Create, price and manage the plumbing service catalogue offered to customers.",
      },
      { property: "og:title", content: "Services — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content: "Create, price and manage the plumbing service catalogue offered to customers.",
      },
    ],
  }),
  component: ServicesPage,
});

const blank: Service = {
  id: "",
  name: "",
  category: "Repairs",
  description: "",
  price: 0,
  duration: 60,
  active: true,
  bookings: 0,
  revenue: 0,
};

function ServicesPage() {
  const { reload } = useData();
  const routeSearch = Route.useSearch();
  const loading = useMockLoading();
  const [rows, setRows] = useState<Service[]>(seed);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);

  useEffect(() => {
    setQuery("");
    setCategory("all");
  }, [routeSearch.view]);

  const categories = Array.from(new Set(rows.map((r) => r.category))).sort();

  const filtered = rows.filter((s) => {
    const q = query.trim().toLowerCase();
    return (
      (!q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) &&
      (category === "all" || s.category === category) &&
      (routeSearch.view === "pending" ? !s.active : routeSearch.view === "cancelled" ? false : true)
    );
  });

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    const e = editing;
    void db
      .persist(
        () =>
          db.saveService({ ...e, id: e.id || undefined } as Parameters<typeof db.saveService>[0]),
        reload,
        e.id ? "Service updated" : "Service created",
        toast,
      )
      .then((ok) => ok && setEditing(null));
  };

  return (
    <>
      <PageHeader
        title={
          routeSearch.view === "pending"
            ? "Pending Services"
            : routeSearch.view === "cancelled"
              ? "Cancelled Services"
              : "Services"
        }
        description={
          routeSearch.view === "pending"
            ? "Inactive catalogue services awaiting review or reactivation."
            : routeSearch.view === "cancelled"
              ? "Services explicitly cancelled in the current catalogue."
              : "Catalogue of plumbing services with pricing, duration and availability."
        }
        actions={
          <Button size="sm" onClick={() => setEditing({ ...blank })}>
            <Plus className="size-4" /> New service
          </Button>
        }
      />

      <div className="surface-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface-panel space-y-3 rounded-xl p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-panel rounded-xl">
          <EmptyState
            icon={Wrench}
            title="No services found"
            description="Adjust your search or add a new service to the catalogue."
            action={
              <Button size="sm" onClick={() => setEditing({ ...blank })}>
                <Plus className="size-4" /> New service
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <article key={s.id} className="surface-panel hover-lift flex flex-col rounded-xl p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium tracking-wide text-primary uppercase">
                    {s.category}
                  </p>
                  <h3 className="mt-1 text-base leading-snug font-semibold">{s.name}</h3>
                </div>
                <StatusBadge value={s.active ? "Active" : "Inactive"} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span className="num inline-flex items-center gap-1.5 font-semibold">
                  <IndianRupee className="size-3.5 text-muted-foreground" />
                  {inr(s.price)}
                </span>
                <span className="num inline-flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5" />
                  {s.duration} min
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-border/70 pt-4 text-sm">
                <div>
                  <dt className="text-[11px] text-muted-foreground">Bookings</dt>
                  <dd className="num font-medium">{num(s.bookings)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Revenue</dt>
                  <dd className="num font-medium">{inr(s.revenue, true)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditing(s)}
                >
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(s)}
                  aria-label={`Delete ${s.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Switch
                  checked={s.active}
                  aria-label="Toggle active"
                  onCheckedChange={(v) => {
                    setRows((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: v } : x)));
                    db.setServiceActive(s.id, v)
                      .then(() => {
                        const i = seed.findIndex((x) => x.id === s.id);
                        if (i >= 0) seed[i]!.active = v;
                        toast.success(`${s.name} ${v ? "activated" : "deactivated"}`);
                      })
                      .catch((err) => {
                        setRows((prev) =>
                          prev.map((x) => (x.id === s.id ? { ...x, active: !v } : x)),
                        );
                        toast.error("Couldn't update", { description: err.message });
                      });
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit service" : "New service"}</DialogTitle>
            <DialogDescription>
              Pricing and duration shown here appear in the customer booking app.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-name">Service name</Label>
                <Input
                  id="s-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Overhead Water Tank Cleaning"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-cat">Category</Label>
                <Select
                  value={editing.category}
                  onValueChange={(v) => setEditing({ ...editing, category: v })}
                >
                  <SelectTrigger id="s-cat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Repairs", "Installation", "Maintenance", "Projects", "Contracts"].map(
                      (c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-price">Price (₹)</Label>
                <Input
                  id="s-price"
                  type="number"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-dur">Duration (minutes)</Label>
                <Input
                  id="s-dur"
                  type="number"
                  value={editing.duration}
                  onChange={(e) => setEditing({ ...editing, duration: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 sm:mt-6">
                <Label htmlFor="s-active">Active</Label>
                <Switch
                  id="s-active"
                  checked={editing.active}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-desc">Description</Label>
                <Textarea
                  id="s-desc"
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the service from the catalogue. Existing bookings are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const d = deleting;
                setDeleting(null);
                if (d)
                  void db.persist(() => db.deleteService(d.id), reload, "Service deleted", toast);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
