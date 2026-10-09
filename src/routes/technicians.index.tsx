import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { HardHat, Plus, Search, Star, Users, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as db from "@/lib/db";
import { useData } from "@/components/auth/auth-gate";
import { technicians } from "@/lib/mock-data";
import { initials, inr, num } from "@/lib/format";
import { useMockLoading } from "@/hooks/use-mock-loading";

export const Route = createFileRoute("/technicians/")({
  head: () => ({
    meta: [
      { title: "Technicians — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content: "Technician directory with expertise, availability, ratings and earnings.",
      },
      { property: "og:title", content: "Technicians — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content: "Technician directory with expertise, availability, ratings and earnings.",
      },
    ],
  }),
  component: TechniciansPage,
});

function TechniciansPage() {
  const { reload } = useData();
  const loading = useMockLoading();
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [area, setArea] = useState("all");
  const [tab, setTab] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const areas = useMemo(
    () => Array.from(new Set(technicians.flatMap((t) => t.serviceAreas))).sort(),
    [],
  );

  const filtered = technicians.filter((t) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      t.expertise.join(" ").toLowerCase().includes(q);
    const matchesAvail = availability === "all" || t.availability === availability;
    const matchesArea = area === "all" || t.serviceAreas.includes(area);
    const matchesTab = tab === "all" || t.status === tab;
    return matchesQuery && matchesAvail && matchesArea && matchesTab;
  });

  return (
    <>
      <PageHeader
        title="Technicians"
        description="8 field technicians across West Bengal — track availability, workload and payouts."
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Add technician
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add technician</DialogTitle>
                <DialogDescription>
                  Onboard a field technician and assign their service areas.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="t-name">Full name</Label>
                  <Input id="t-name" placeholder="e.g. Subhajit Naskar" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-phone">Phone</Label>
                  <Input id="t-phone" placeholder="+91 98xxx xxxxx" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-exp">Primary expertise</Label>
                  <Input id="t-exp" placeholder="Pipe Leakage" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-area">Base city</Label>
                  <Input id="t-area" placeholder="Kolkata" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const v = (id: string) =>
                      (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? "";
                    const name = v("t-name"),
                      phone = v("t-phone"),
                      skill = v("t-exp");
                    if (!name) {
                      toast.error("Full name is required");
                      return;
                    }
                    if (!/^[+\d][\d\s-]{9,14}$/.test(phone)) {
                      toast.error("Enter a valid phone number");
                      return;
                    }
                    void db
                      .persist(
                        () =>
                          db.addTechnician({
                            name,
                            phone,
                            email: "",
                            skills: skill ? [skill] : [],
                          }),
                        reload,
                        "Technician added",
                        toast,
                      )
                      .then((ok) => ok && setAddOpen(false));
                  }}
                >
                  Save technician
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="surface-panel rounded-xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Tabs value={tab} onValueChange={setTab} className="w-full lg:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="Active">Active</TabsTrigger>
              <TabsTrigger value="Inactive">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone or skill…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger className="w-40">
                <SlidersHorizontal className="size-3.5" />
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All availability</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="On Job">On Job</SelectItem>
                <SelectItem value="Off Duty">Off Duty</SelectItem>
              </SelectContent>
            </Select>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Service area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface-panel space-y-3 rounded-xl p-5">
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-panel rounded-xl">
          <EmptyState
            icon={Users}
            title="No technicians match your filters"
            description="Try clearing the availability or service-area filter, or search a different name."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setAvailability("all");
                  setArea("all");
                  setTab("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <article key={t.id} className="surface-panel hover-lift rounded-xl p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-12 shrink-0 ring-2 ring-border">
                    <AvatarImage src={t.photo} alt={t.name} />
                    <AvatarFallback>{initials(t.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{t.name}</h3>
                    <p className="num truncate text-xs text-muted-foreground">{t.phone}</p>
                  </div>
                </div>
                <StatusBadge value={t.availability} />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.expertise.map((e) => (
                  <span
                    key={e}
                    className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {e}
                  </span>
                ))}
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border/70 pt-4 text-center">
                <div>
                  <dt className="text-[11px] text-muted-foreground">Rating</dt>
                  <dd className="num mt-0.5 flex items-center justify-center gap-1 text-sm font-semibold">
                    <Star className="size-3.5 fill-copper text-copper" />{" "}
                    {t.rating ? t.rating : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Jobs</dt>
                  <dd className="num mt-0.5 text-sm font-semibold">{num(t.completedJobs)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Earnings</dt>
                  <dd className="num mt-0.5 text-sm font-semibold">{inr(t.earnings, true)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-muted-foreground">
                  {t.serviceAreas.join(" · ")}
                </p>
                <StatusBadge value={t.status} dot={false} />
              </div>

              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link to="/technicians/$id" params={{ id: t.id }}>
                  <HardHat className="size-4" /> View profile
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
