import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  HardHat,
  IndianRupee,
  Star,
  Users,
  Wrench,
  Package,
  FileText,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ChartCard } from "@/components/common/chart-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMockLoading } from "@/hooks/use-mock-loading";
import {
  activity,
  bookings,
  bookingTrend,
  customers,
  invoices,
  revenueTrend,
  services,
  technicians,
} from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { dateTime, initials, inr, num, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content:
          "Live operations overview: bookings, revenue, technicians and service performance.",
      },
      { property: "og:title", content: "Dashboard — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content:
          "Live operations overview: bookings, revenue, technicians and service performance.",
      },
    ],
  }),
  component: DashboardPage,
});

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  color: "var(--color-popover-foreground)",
  fontSize: "12px",
  boxShadow: "var(--shadow-elevated)",
};

function DashboardPage() {
  const loading = useMockLoading();

  const total = bookings.length;
  const pending = bookings.filter((b) => b.status === "Pending").length;
  const completed = bookings.filter((b) => b.status === "Completed").length;
  const activeTechs = technicians.filter((t) => t.status === "Active").length;
  const revenue = revenueTrend.reduce((s, r) => s + r.services + r.parts, 0);
  const servicesRevenue = revenueTrend.reduce((sum, row) => sum + row.services, 0);
  const partsRevenue = revenueTrend.reduce((sum, row) => sum + row.parts, 0);
  const serviceShare = revenue ? Math.round((servicesRevenue / revenue) * 100) : 0;
  const partsShare = revenue ? 100 - serviceShare : 0;

  const topServices = [...services]
    .filter((s) => s.active)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((s) => ({
      name: s.name,
      revenue: s.revenue,
      bookings: s.bookings,
      contribution: 0,
    }));
  const topServiceRevenue = topServices.reduce((sum, service) => sum + service.revenue, 0);
  topServices.forEach((service) => {
    service.contribution = topServiceRevenue
      ? Math.round((service.revenue / topServiceRevenue) * 100)
      : 0;
  });

  const topTechs = [...technicians].sort((a, b) => b.completedJobs - a.completedJobs).slice(0, 5);
  const recent = bookings.slice(0, 6);

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description="Everything happening across SOHAN PIPELINES, live from your database."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                "dashboard.csv",
                bookingTrend.map((b, i) => ({
                  Month: b.month,
                  Bookings: b.bookings,
                  Completed: b.completed,
                  "Service revenue": revenueTrend[i]?.services ?? 0,
                  "Parts revenue": revenueTrend[i]?.parts ?? 0,
                })),
              )
                ? toast.success("Dashboard exported")
                : toast.info("Nothing to export yet")
            }
          >
            <FileText className="size-4" /> Export
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          label="Total Bookings"
          value={num(bookings.length)}
          hint="all time"
          icon={CalendarCheck}
        />
        <StatCard
          loading={loading}
          label="Pending Bookings"
          value={num(pending)}
          hint="awaiting assignment"
          icon={CalendarClock}
          accent="copper"
        />
        <StatCard
          loading={loading}
          label="Completed Jobs"
          value={num(completed)}
          hint={`${bookings.length ? Math.round((completed / bookings.length) * 100) : 0}% completion`}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          loading={loading}
          label="Active Technicians"
          value={String(activeTechs)}
          hint={`of ${technicians.length} on roster`}
          icon={HardHat}
          accent="info"
        />
        <StatCard
          loading={loading}
          label="Revenue (12 mo)"
          value={inr(revenue, true)}
          hint="services + spare parts"
          icon={IndianRupee}
        />
        <StatCard
          loading={loading}
          label="Customers"
          value={num(customers.length)}
          hint={`${customers.filter((c) => Date.now() - new Date(c.since).getTime() < 90 * 864e5).length} added in 90 days`}
          icon={Users}
          accent="info"
        />
        <StatCard
          loading={loading}
          label="Open Invoices"
          value={num(
            invoices.filter((i) => i.status === "Pending" || i.status === "Overdue").length,
          )}
          hint="pending or overdue"
          icon={Star}
          accent="copper"
        />
        <StatCard
          loading={loading}
          label="Spare Parts Sold"
          value={inr(partsRevenue, true)}
          hint="paid invoices, 12 mo"
          icon={Package}
          accent="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-3"
          title="Booking trend"
          description="Bookings created vs jobs completed, last 12 months"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={bookingTrend} margin={{ left: -18, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="gBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
              <XAxis dataKey="month" {...axis} />
              <YAxis {...axis} width={52} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: "var(--color-border-strong)" }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="bookings"
                name="Bookings"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                fill="url(#gBookings)"
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                fill="url(#gCompleted)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="Revenue split"
          description="Service income vs spare-parts income"
          loading={loading}
          height={390}
          action={
            <div className="hidden items-center gap-4 xl:flex">
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Total revenue
                </p>
                <p className="num mt-0.5 text-sm font-semibold">{inr(revenue, true)}</p>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3 pb-4">
            <div className="analytics-summary">
              <span className="size-2 rounded-full bg-primary" />
              <div>
                <p className="text-[11px] text-muted-foreground">Services · {serviceShare}%</p>
                <p className="num text-sm font-semibold">{inr(servicesRevenue, true)}</p>
              </div>
            </div>
            <div className="analytics-summary">
              <span className="size-2 rounded-full bg-success" />
              <div>
                <p className="text-[11px] text-muted-foreground">Spare parts · {partsShare}%</p>
                <p className="num text-sm font-semibold">{inr(partsRevenue, true)}</p>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={revenueTrend} margin={{ left: -12, right: 8, top: 10 }}>
              <defs>
                <linearGradient id="serviceRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="partsRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 6" />
              <XAxis dataKey="month" {...axis} />
              <YAxis
                {...axis}
                width={52}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => inr(value)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Area
                type="monotone"
                dataKey="services"
                name="Services revenue"
                stackId="revenue"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                fill="url(#serviceRevenue)"
                animationDuration={650}
              />
              <Area
                type="monotone"
                dataKey="parts"
                name="Spare parts revenue"
                stackId="revenue"
                stroke="var(--color-chart-3)"
                strokeWidth={2.5}
                fill="url(#partsRevenue)"
                animationDuration={650}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Service performance"
          description="Top services by revenue"
          loading={loading}
          height={320}
          action={
            <span className="num text-xs font-semibold text-muted-foreground">
              {inr(topServiceRevenue, true)} total
            </span>
          }
        >
          {topServices.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No service revenue recorded yet.
            </p>
          ) : (
            <ol className="space-y-4">
              {topServices.map((s, i) => {
                const max = topServices[0]!.revenue || 1;
                return (
                  <li
                    key={s.name}
                    className="group"
                    title={`${s.name}: ${inr(s.revenue)} · ${s.bookings} bookings · ${s.contribution}%`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex min-w-0 items-baseline gap-2.5">
                        <span className="num w-4 shrink-0 text-xs font-semibold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm font-medium">{s.name}</span>
                      </div>
                      <div className="flex shrink-0 items-baseline gap-2">
                        <span className="num text-sm font-semibold">{inr(s.revenue, true)}</span>
                        <span className="num w-9 text-right text-xs text-muted-foreground">
                          {s.contribution}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 ml-6.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-out group-hover:opacity-85"
                        style={{
                          width: `${Math.max(3, (s.revenue / max) * 100)}%`,
                          background: i === 0 ? "var(--color-chart-1)" : "var(--color-chart-3)",
                        }}
                      />
                    </div>
                    <p className="num mt-1 ml-6.5 text-[11px] text-muted-foreground">
                      {s.bookings} bookings
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </ChartCard>

        <ChartCard
          title="Technician performance"
          description="Jobs completed and customer rating"
          loading={loading}
          height={320}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/technicians">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <ul className="space-y-4">
            {topTechs.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={t.photo} alt={t.name} />
                  <AvatarFallback>{initials(t.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <span className="num shrink-0 text-xs text-muted-foreground">
                      {t.completedJobs} jobs · ★ {t.rating}
                    </span>
                  </div>
                  <Progress value={(t.completedJobs / 500) * 100} className="mt-2 h-1.5" />
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="surface-panel rounded-xl xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Recent bookings</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Latest jobs across all service areas
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/bookings" search={{ status: undefined }}>
                All bookings <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Technician</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : recent.map((b) => (
                      <TableRow key={b.id} className="transition-colors">
                        <TableCell>
                          <p className="num text-xs font-medium">{b.id}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {b.service}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="truncate text-sm">{b.customer}</p>
                          <p className="truncate text-xs text-muted-foreground">{b.location}</p>
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">
                          {b.technician ?? (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={b.status} />
                        </TableCell>
                        <TableCell className="num text-right text-sm font-medium">
                          {inr(b.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <div className="space-y-4">
          <section className="surface-panel rounded-xl p-5">
            <h2 className="text-sm font-semibold tracking-tight">Quick actions</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {[
                { label: "Add technician", icon: HardHat, to: "/technicians" as const },
                { label: "Add service", icon: Wrench, to: "/services" as const },
                { label: "Restock parts", icon: Package, to: "/spare-parts" as const },
              ].map((a) => (
                <Button
                  key={a.label}
                  asChild
                  variant="outline"
                  className="h-auto justify-start gap-2 py-3"
                >
                  <Link to={a.to}>
                    <a.icon className="size-4 text-primary" />
                    <span className="truncate text-xs">{a.label}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </section>

          <section className="surface-panel rounded-xl">
            <div className="border-b border-border/70 px-5 py-4">
              <h2 className="text-sm font-semibold tracking-tight">Recent activity</h2>
            </div>
            <ol className="relative space-y-4 px-5 py-4">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="relative pl-5">
                  <span className="absolute top-1.5 left-0 size-2 rounded-full bg-primary/70" />
                  <p className="text-sm">
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span> {a.target}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/80">{timeAgo(a.at)}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="surface-panel rounded-xl p-5">
            <h2 className="text-sm font-semibold tracking-tight">Today's schedule</h2>
            <ul className="mt-3 space-y-3">
              {bookings.slice(0, 3).map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.service}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.customer} · {dateTime(b.scheduledAt)}
                    </p>
                  </div>
                  <StatusBadge value={b.urgency} dot={false} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
