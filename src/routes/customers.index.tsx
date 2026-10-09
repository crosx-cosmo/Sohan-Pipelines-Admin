import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { StatCard } from "@/components/common/stat-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customers } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { initials, inr, num, shortDate } from "@/lib/format";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { IndianRupee, Repeat, UserCheck } from "lucide-react";

export const Route = createFileRoute("/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content: "Customer directory with booking counts, lifetime spending and account status.",
      },
      { property: "og:title", content: "Customers — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content: "Customer directory with booking counts, lifetime spending and account status.",
      },
    ],
  }),
  component: CustomersPage,
});

const PAGE_SIZE = 8;

function CustomersPage() {
  const loading = useMockLoading();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = customers.filter(
      (c) =>
        (!q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)) &&
        (status === "all" || c.status === status),
    );
    return [...list].sort((a, b) => {
      if (sort === "spending") return b.totalSpending - a.totalSpending;
      if (sort === "bookings") return b.totalBookings - a.totalBookings;
      if (sort === "name") return a.name.localeCompare(b.name);
      return new Date(b.lastBooking).getTime() - new Date(a.lastBooking).getTime();
    });
  }, [query, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const lifetime = customers.reduce((s, c) => s + c.totalSpending, 0);
  const repeat = customers.filter((c) => c.totalBookings > 3).length;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Households and commercial accounts served by SOHAN PIPELINES."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  "customers.csv",
                  customers.map((c) => ({
                    Name: c.name,
                    Phone: c.phone,
                    Email: c.email,
                    Location: c.location,
                    Bookings: c.totalBookings,
                    Completed: c.completedJobs,
                    Spend: c.totalSpending,
                    Since: c.since,
                  })),
                )
                  ? toast.success("Customer list exported")
                  : toast.info("No customers yet")
              }
            >
              <Download className="size-4" /> Export
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          label="Total customers"
          value={num(customers.length)}
          icon={Users}
        />
        <StatCard
          loading={loading}
          label="Active accounts"
          value={num(customers.filter((c) => c.status === "Active").length)}
          icon={UserCheck}
          accent="success"
        />
        <StatCard
          loading={loading}
          label="Repeat customers"
          value={`${repeat} of ${customers.length}`}
          icon={Repeat}
          accent="info"
        />
        <StatCard
          loading={loading}
          label="Lifetime value"
          value={inr(lifetime, true)}
          icon={IndianRupee}
          accent="copper"
        />
      </div>

      <div className="surface-panel flex flex-col gap-3 rounded-xl p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, phone, email or location…"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Dormant">Dormant</SelectItem>
              <SelectItem value="Blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent booking</SelectItem>
              <SelectItem value="spending">Highest spending</SelectItem>
              <SelectItem value="bookings">Most bookings</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="surface-panel record-list overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Completed</TableHead>
                <TableHead className="text-right">Spending</TableHead>
                <TableHead className="hidden xl:table-cell">Last booking</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState
                      icon={Users}
                      title="No customers found"
                      description="Try a different search term or clear the status filter."
                      action={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQuery("");
                            setStatus("all");
                          }}
                        >
                          Clear filters
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => void navigate({ to: "/customers/$id", params: { id: c.id } })}
                  >
                    <TableCell data-label="Customer">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback className="text-xs">{initials(c.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="num truncate text-xs text-muted-foreground">{c.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell data-label="Contact" className="hidden md:table-cell">
                      <p className="num text-sm">{c.phone}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                    </TableCell>
                    <TableCell
                      data-label="Location"
                      className="hidden max-w-52 truncate text-sm lg:table-cell"
                    >
                      {c.location}
                    </TableCell>
                    <TableCell data-label="Bookings" className="num text-right text-sm">
                      {c.totalBookings}
                    </TableCell>
                    <TableCell
                      data-label="Completed"
                      className="num hidden text-right text-sm sm:table-cell"
                    >
                      {c.completedJobs}
                    </TableCell>
                    <TableCell data-label="Spending" className="num text-right text-sm font-medium">
                      {inr(c.totalSpending)}
                    </TableCell>
                    <TableCell
                      data-label="Last booking"
                      className="num hidden text-sm xl:table-cell"
                    >
                      {shortDate(c.lastBooking)}
                    </TableCell>
                    <TableCell data-label="Status">
                      <StatusBadge value={c.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {current} of {pages} · {filtered.length} customers
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft className="size-4" /> Prev
            </Button>
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
    </>
  );
}
