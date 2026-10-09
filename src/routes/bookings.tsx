import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Search,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as db from "@/lib/db";
import { downloadCsv } from "@/lib/csv";
import { statusFromDb } from "@/lib/mock-data";
import {
  bookings as seed,
  customers,
  services,
  spareParts,
  technicians,
  type Booking,
  type BookingStatus,
} from "@/lib/mock-data";
import { useData } from "@/components/auth/auth-gate";
import { dateTime, inr } from "@/lib/format";
import { useMockLoading } from "@/hooks/use-mock-loading";

export const Route = createFileRoute("/bookings")({
  validateSearch: (search: Record<string, unknown>) => ({
    status:
      typeof search["status"] === "string" && ["Pending", "Cancelled"].includes(search["status"])
        ? search["status"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Bookings — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content:
          "Manage plumbing service bookings: assign technicians, update status and track amounts.",
      },
      { property: "og:title", content: "Bookings — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content:
          "Manage plumbing service bookings: assign technicians, update status and track amounts.",
      },
    ],
  }),
  component: BookingsPage,
});

const statusOptions: BookingStatus[] = [
  "Pending",
  "Confirmed",
  "Assigned",
  "In Progress",
  "Completed",
  "Cancelled",
  "Rescheduled",
];

const PAGE_SIZE = 10;

type SortKey = "scheduledAt" | "amount" | "customer";

export function BookingsPage() {
  const routeSearch = Route.useSearch();
  const loading = useMockLoading();
  const [rows, setRows] = useState<Booking[]>(seed);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(routeSearch.status ?? "all");
  const [service, setService] = useState("all");
  const [tech, setTech] = useState("all");
  const [urgency, setUrgency] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "scheduledAt",
    dir: "desc",
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Booking | null>(null);

  useEffect(() => {
    setStatus(routeSearch.status ?? "all");
    setPage(1);
  }, [routeSearch.status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((b) => {
      const matchesQuery =
        !q ||
        b.id.toLowerCase().includes(q) ||
        b.customer.toLowerCase().includes(q) ||
        b.service.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.phone.includes(q);
      const matchesStatus = status === "all" || b.status === status;
      const matchesService = service === "all" || b.serviceId === service;
      const matchesTech =
        tech === "all" || (tech === "unassigned" ? !b.technicianId : b.technicianId === tech);
      const matchesUrgency = urgency === "all" || b.urgency === urgency;
      const time = new Date(b.scheduledAt).getTime();
      const matchesFrom = !from || time >= new Date(from).getTime();
      const matchesTo = !to || time <= new Date(to).getTime() + 86_400_000;
      return (
        matchesQuery &&
        matchesStatus &&
        matchesService &&
        matchesTech &&
        matchesUrgency &&
        matchesFrom &&
        matchesTo
      );
    });

    return list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "amount") return (a.amount - b.amount) * dir;
      if (sort.key === "customer") return a.customer.localeCompare(b.customer) * dir;
      return (new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()) * dir;
    });
  }, [rows, query, status, service, tech, urgency, from, to, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
    setPage(1);
  };

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setService("all");
    setTech("all");
    setUrgency("all");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const updateBooking = async (id: string, patch: Partial<Booking>, okMsg: string) => {
    const before = rows.find((b) => b.id === id);
    setRows((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
    try {
      await db.updateBooking(
        id,
        {
          status: patch.status,
          technicianId: "technicianId" in patch ? patch.technicianId : undefined,
        },
        patch.technician ? `Assigned to ${patch.technician}` : undefined,
      );
      const i = seed.findIndex((b) => b.id === id);
      if (i >= 0) seed[i] = { ...seed[i]!, ...patch };
      setHistoryKey((k) => k + 1);
      toast.success(okMsg);
    } catch (e) {
      if (before) {
        setRows((prev) => prev.map((b) => (b.id === id ? before : b)));
        setSelected((prev) => (prev && prev.id === id ? before : prev));
      }
      toast.error("Couldn't save the change", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const counts = statusOptions.map((s) => ({ s, n: rows.filter((b) => b.status === s).length }));

  return (
    <>
      <PageHeader
        title="Bookings"
        description={`${rows.length} bookings on record · ${counts[0]?.n ?? 0} awaiting confirmation.`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  `sohan-bookings-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((b) => {
                    const d = new Date(b.scheduledAt);
                    const c = customers.find((x) => x.id === b.customerId);
                    return {
                      "Booking ID": b.id,
                      Status: b.status,
                      Urgency: b.urgency,
                      "Preferred Date": d.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone: "Asia/Kolkata",
                      }),
                      "Preferred Time": d.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      }),
                      "Customer Name": b.customer,
                      "Customer Phone": b.phone,
                      "Customer Email": c?.email ?? "",
                      Service: b.service,
                      Address: b.location,
                      "PIN Code": b.pincode,
                      Technician: b.technician ?? "Unassigned",
                      "Amount (INR)": b.amount,
                      "Parts Used": b.parts.map((p) => `${p.name} x${p.qty}`).join("; "),
                      Notes: b.notes,
                    };
                  }),
                )
                  ? toast.success("CSV exported")
                  : toast.info("No bookings to export")
              }
            >
              <Download className="size-4" /> Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {counts.map(({ s, n }) => (
          <button
            key={s}
            onClick={() => {
              setStatus(status === s ? "all" : s);
              setPage(1);
            }}
            className={`surface-panel rounded-xl px-4 py-3 text-left transition-all duration-200 hover:border-border-strong hover:shadow-elevated ${
              status === s ? "ring-2 ring-primary/40" : ""
            }`}
          >
            <p className="num text-lg font-semibold">{n}</p>
            <p className="truncate text-xs text-muted-foreground">{s}</p>
          </button>
        ))}
      </div>

      <div className="surface-panel space-y-3 rounded-xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search booking ID, customer, service, location…"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={service}
              onValueChange={(v) => {
                setService(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={tech}
              onValueChange={(v) => {
                setTech(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All technicians</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={urgency}
              onValueChange={(v) => {
                setUrgency(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All urgency</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
                <SelectItem value="Priority">Priority</SelectItem>
                <SelectItem value="Standard">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="mb-0.5">
            <RotateCcw className="size-4" /> Reset
          </Button>
          <p className="mb-2 ml-auto text-xs text-muted-foreground">
            Showing {pageRows.length} of {filtered.length} filtered bookings
          </p>
        </div>
      </div>

      <div className="surface-panel record-list overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-32">Booking ID</TableHead>
                <TableHead>
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("customer")}
                  >
                    Customer <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Service</TableHead>
                <TableHead className="hidden xl:table-cell">Location</TableHead>
                <TableHead className="hidden md:table-cell">Technician</TableHead>
                <TableHead className="hidden sm:table-cell">
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("scheduledAt")}
                  >
                    Date / time <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("amount")}
                  >
                    Amount <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState
                      icon={CalendarCheck}
                      title="No bookings found"
                      description="No booking matches the current search, filters or date range."
                      action={
                        <Button variant="outline" size="sm" onClick={resetFilters}>
                          Clear filters
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((b) => (
                  <TableRow
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className="cursor-pointer transition-colors"
                  >
                    <TableCell data-label="Booking" className="num text-xs font-medium">
                      {b.id}
                    </TableCell>
                    <TableCell data-label="Customer">
                      <p className="truncate text-sm font-medium">{b.customer}</p>
                      <p className="num truncate text-xs text-muted-foreground">{b.phone}</p>
                    </TableCell>
                    <TableCell
                      data-label="Service"
                      className="hidden max-w-56 truncate text-sm lg:table-cell"
                    >
                      {b.service}
                    </TableCell>
                    <TableCell
                      data-label="Location"
                      className="hidden max-w-48 truncate text-sm xl:table-cell"
                    >
                      {b.location}
                      <span className="num block text-xs text-muted-foreground">{b.pincode}</span>
                    </TableCell>
                    <TableCell data-label="Technician" className="hidden text-sm md:table-cell">
                      {b.technician ?? <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell
                      data-label="Schedule"
                      className="num hidden text-sm whitespace-nowrap sm:table-cell"
                    >
                      {dateTime(b.scheduledAt)}
                    </TableCell>
                    <TableCell data-label="Urgency">
                      <StatusBadge value={b.urgency} dot={false} />
                    </TableCell>
                    <TableCell data-label="Status">
                      <StatusBadge value={b.status} />
                    </TableCell>
                    <TableCell data-label="Amount" className="num text-right text-sm font-medium">
                      {inr(b.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {current} of {pages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft className="size-4" /> Prev
            </Button>
            {Array.from({ length: Math.min(pages, 5) }).map((_, i) => {
              const p = i + 1;
              return (
                <Button
                  key={p}
                  variant={p === current ? "default" : "ghost"}
                  size="sm"
                  className="num w-9"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="num">{selected.id}</SheetTitle>
                <SheetDescription>
                  {selected.service} · {dateTime(selected.scheduledAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={selected.status} />
                  <StatusBadge value={selected.urgency} dot={false} />
                </div>

                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Customer</dt>
                    <dd className="mt-0.5 font-medium">{selected.customer}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd className="num mt-0.5">{selected.phone}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Location</dt>
                    <dd className="mt-0.5">
                      {selected.location} — {selected.pincode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Amount</dt>
                    <dd className="num mt-0.5 font-semibold">{inr(selected.amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Technician</dt>
                    <dd className="mt-0.5">{selected.technician ?? "Unassigned"}</dd>
                  </div>
                </dl>

                <Separator />

                <div className="space-y-2">
                  <Label>Assign technician</Label>
                  <Select
                    value={selected.technicianId ?? "unassigned"}
                    onValueChange={(v) => {
                      const t = technicians.find((x) => x.id === v);
                      void updateBooking(
                        selected.id,
                        {
                          technicianId: t?.id ?? null,
                          technician: t?.name ?? null,
                          status: t
                            ? selected.status === "Pending"
                              ? "Assigned"
                              : selected.status
                            : selected.status,
                        },
                        t ? `Assigned to ${t.name}` : "Technician removed",
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {technicians
                        .filter((t) => t.status === "Active")
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} · {t.availability}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Update status</Label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selected.status === s ? "default" : "outline"}
                        onClick={() => {
                          if (selected.status !== s)
                            void updateBooking(
                              selected.id,
                              { status: s },
                              `${selected.id} marked ${s}`,
                            );
                        }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Spare parts used</h3>
                  {selected.parts.length > 0 ? (
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {selected.parts.map((p) => (
                        <li key={p.name} className="flex justify-between gap-3">
                          <span className="truncate text-muted-foreground">{p.name}</span>
                          <span className="num">×{p.qty}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No parts recorded on this job yet.
                    </p>
                  )}
                  <AddPartForm bookingId={selected.id} />
                </div>

                {selected.notes && (
                  <div>
                    <h3 className="text-sm font-semibold">Customer's note</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{selected.notes}</p>
                  </div>
                )}

                <BookingTimeline bookingId={selected.id} refreshKey={historyKey} />

                <div className="space-y-2">
                  <Label htmlFor="note">Add internal note</Label>
                  <Textarea
                    id="note"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    placeholder="Visible to admins only"
                  />
                </div>
              </div>

              <SheetFooter>
                <Button
                  className="w-full"
                  disabled={savingNote || !noteDraft.trim()}
                  onClick={async () => {
                    setSavingNote(true);
                    try {
                      await db.addBookingNote(selected.id, noteDraft.trim());
                      setNoteDraft("");
                      setHistoryKey((k) => k + 1);
                      toast.success("Note saved");
                    } catch (e) {
                      toast.error("Couldn't save the note", {
                        description: e instanceof Error ? e.message : undefined,
                      });
                    } finally {
                      setSavingNote(false);
                    }
                  }}
                >
                  <UserCheck className="size-4" /> Save note
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function AddPartForm({ bookingId }: { bookingId: string }) {
  const { reload } = useData();
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const part = spareParts.find((p) => p.id === partId);
  const q = Math.max(1, Number(qty) || 1);

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <div className="min-w-40 flex-1 space-y-1">
        <Label className="text-xs">Add part</Label>
        <Select value={partId} onValueChange={setPartId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a part" />
          </SelectTrigger>
          <SelectContent>
            {spareParts.map((p) => (
              <SelectItem key={p.id} value={p.id} disabled={p.stock <= 0}>
                {p.name} · {p.stock} in stock
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-20 space-y-1">
        <Label className="text-xs">Qty</Label>
        <Input
          type="number"
          min={1}
          max={part?.stock ?? 99}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={busy || !part || q > part.stock}
        onClick={async () => {
          if (!part) return;
          setBusy(true);
          try {
            await db.addBookingPart(bookingId, part.id, part.name, part.stock, q);
            await reload();
            setPartId("");
            setQty("1");
            toast.success("Part added", { description: `${part.name} ×${q} · stock updated` });
          } catch (e) {
            toast.error("Couldn't add the part", {
              description: e instanceof Error ? e.message : undefined,
            });
          } finally {
            setBusy(false);
          }
        }}
      >
        Add
      </Button>
    </div>
  );
}

function BookingTimeline({ bookingId, refreshKey }: { bookingId: string; refreshKey: number }) {
  const [data, setData] = useState<{
    history: { id: string; status: string; note: string | null; created_at: string }[];
    notes: { id: string; note: string; created_at: string }[];
  } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    db.listBookingHistory(bookingId)
      .then((d) => live && setData(d))
      .catch((e) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [bookingId, refreshKey]);
  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading history…</p>;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Status history</h3>
        {data.history.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No status changes yet.</p>
        ) : (
          <ol className="mt-2 space-y-2 border-l border-border pl-4">
            {data.history.map((h) => (
              <li key={h.id} className="text-sm">
                <span className="font-medium">{statusFromDb(h.status)}</span>
                {h.note && <span className="text-muted-foreground"> · {h.note}</span>}
                <p className="text-xs text-muted-foreground">{dateTime(h.created_at)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
      {data.notes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Internal notes</h3>
          <ul className="mt-2 space-y-2">
            {data.notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-muted/50 p-2.5 text-sm">
                {n.note}
                <p className="mt-1 text-xs text-muted-foreground">{dateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
