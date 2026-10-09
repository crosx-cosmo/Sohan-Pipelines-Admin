import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarCheck, Download, IndianRupee, Star, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ChartCard } from "@/components/common/chart-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bookingTrend,
  cancellationTrend,
  bookings,
  customers,
  revenueTrend,
  services,
  technicians,
} from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { inr, num } from "@/lib/format";
import { useMockLoading } from "@/hooks/use-mock-loading";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content:
          "Analytics for bookings, revenue, services, technicians, customers and cancellations.",
      },
      { property: "og:title", content: "Reports — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content:
          "Analytics for bookings, revenue, services, technicians, customers and cancellations.",
      },
    ],
  }),
  component: ReportsPage,
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
  fontSize: "12px",
};

function ReportsPage() {
  const loading = useMockLoading();
  const [from, setFrom] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [preset, setPreset] = useState("ytd");

  const presets = [
    { id: "7d", label: "7 days" },
    { id: "30d", label: "30 days" },
    { id: "qtr", label: "This quarter" },
    { id: "ytd", label: "Year to date" },
  ];

  const revenue = revenueTrend.reduce((s, r) => s + r.services + r.parts, 0);
  const totalBookings = bookingTrend.reduce((s, b) => s + b.bookings, 0);
  const completed = bookingTrend.reduce((s, b) => s + b.completed, 0);

  const categorySplit = Object.entries(
    services.reduce<Record<string, number>>((acc, s) => {
      acc[s.category] = (acc[s.category] ?? 0) + s.revenue;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const monthKeys = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 11 + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const customerGrowth = bookingTrend.map((b, i) => {
    const key = monthKeys[i]!;
    const active = new Set(
      bookings.filter((x) => x.scheduledAt.slice(0, 7) === key).map((x) => x.customerId),
    );
    const fresh = customers.filter((c) => c.since.slice(0, 7) === key).length;
    return { month: b.month, new: fresh, returning: Math.max(0, active.size - fresh) };
  });
  const newCustomers = customers.filter((c) => c.since >= from && c.since <= to).length;
  const cancelled = bookings.filter((b) => b.status === "Cancelled").length;
  const cancelRate = bookings.length ? ((cancelled / bookings.length) * 100).toFixed(1) : "0";

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Business performance across bookings, revenue, service mix and field operations."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="size-4" /> PDF
            </Button>
            <Button
              size="sm"
              onClick={() =>
                downloadCsv(
                  "report.csv",
                  bookingTrend.map((b, i) => ({
                    Month: b.month,
                    Bookings: b.bookings,
                    Completed: b.completed,
                    "Service revenue": revenueTrend[i]?.services ?? 0,
                    "Parts revenue": revenueTrend[i]?.parts ?? 0,
                    "New customers": customerGrowth[i]?.new ?? 0,
                  })),
                )
                  ? toast.success("CSV exported")
                  : toast.info("Nothing to export yet")
              }
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </>
        }
      />

      <div className="surface-panel flex flex-col gap-3 rounded-xl p-4 lg:flex-row lg:items-end">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={preset === p.id ? "default" : "outline"}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3 lg:ml-auto">
          <div className="space-y-1.5">
            <Label htmlFor="r-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="r-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="r-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          loading={loading}
          label="Bookings"
          value={num(totalBookings)}
          hint="in selected range"
          icon={CalendarCheck}
        />
        <StatCard
          loading={loading}
          label="Revenue"
          value={inr(revenue, true)}
          hint="services + parts"
          icon={IndianRupee}
          accent="copper"
        />
        <StatCard
          loading={loading}
          label="Completion rate"
          value={`${totalBookings ? Math.round((completed / totalBookings) * 100) : 0}%`}
          hint={`${num(completed)} jobs closed`}
          icon={CalendarCheck}
          accent="success"
        />
        <StatCard
          loading={loading}
          label="Avg. job value"
          value={inr(totalBookings ? Math.round(revenue / totalBookings) : 0)}
          icon={IndianRupee}
          accent="info"
        />
        <StatCard loading={loading} label="New customers" value={num(newCustomers)} icon={Users} />
        <StatCard
          loading={loading}
          label="Cancellation rate"
          value={`${cancelRate}%`}
          hint="of all bookings"
          icon={XCircle}
          accent="copper"
        />
      </div>

      <Tabs defaultValue="bookings">
        <TabsList className="flex-wrap">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="technicians">Technicians</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4">
          <ChartCard title="Bookings vs completions" description="Monthly volume" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bookingTrend} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                />
                <XAxis dataKey="month" {...axis} />
                <YAxis {...axis} width={52} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  name="Bookings"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="var(--color-chart-3)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4 space-y-4">
          <ChartCard
            title="Revenue trend"
            description="Service and spare-parts income"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueTrend} margin={{ left: -4, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="rSrv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                />
                <XAxis dataKey="month" {...axis} />
                <YAxis
                  {...axis}
                  width={58}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="services"
                  name="Services"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#rSrv)"
                />
                <Area
                  type="monotone"
                  dataKey="parts"
                  name="Spare parts"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="surface-panel overflow-x-auto rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Services</TableHead>
                  <TableHead className="text-right">Spare parts</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueTrend.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell className="text-sm font-medium">{r.month} 2026</TableCell>
                    <TableCell className="num text-right text-sm">{inr(r.services)}</TableCell>
                    <TableCell className="num text-right text-sm">{inr(r.parts)}</TableCell>
                    <TableCell className="num text-right text-sm font-semibold">
                      {inr(r.services + r.parts)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="services" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Revenue by category"
              description="Share of total service income"
              loading={loading}
            >
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categorySplit}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={104}
                    paddingAngle={3}
                  >
                    {categorySplit.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`var(--color-chart-${(i % 5) + 1})`}
                        stroke="var(--color-card)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr(v)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <div className="surface-panel overflow-x-auto rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...services]
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="max-w-56 truncate text-sm">{s.name}</TableCell>
                        <TableCell className="num text-right text-sm">{num(s.bookings)}</TableCell>
                        <TableCell className="num text-right text-sm font-medium">
                          {inr(s.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="technicians" className="mt-4">
          <div className="surface-panel overflow-x-auto rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technician</TableHead>
                  <TableHead className="hidden sm:table-cell">Base areas</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">On-time</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...technicians]
                  .sort((a, b) => b.completedJobs - a.completedJobs)
                  .map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium">{t.name}</TableCell>
                      <TableCell className="hidden max-w-52 truncate text-sm text-muted-foreground sm:table-cell">
                        {t.serviceAreas.join(", ")}
                      </TableCell>
                      <TableCell className="num text-right text-sm">
                        {num(t.completedJobs)}
                      </TableCell>
                      <TableCell className="num text-right text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3 fill-copper text-copper" />
                          {t.rating}
                        </span>
                      </TableCell>
                      <TableCell className="num text-right text-sm">{t.onTimeRate}%</TableCell>
                      <TableCell className="num text-right text-sm font-medium">
                        {inr(t.earnings)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="mt-4 space-y-4">
          <ChartCard
            title="New vs returning customers"
            description="Monthly acquisition and retention"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customerGrowth} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                />
                <XAxis dataKey="month" {...axis} />
                <YAxis {...axis} width={52} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="new" name="New" stackId="c" fill="var(--color-chart-1)" />
                <Bar
                  dataKey="returning"
                  name="Returning"
                  stackId="c"
                  fill="var(--color-chart-3)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="surface-panel overflow-x-auto rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Location</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Spending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...customers]
                  .sort((a, b) => b.totalSpending - a.totalSpending)
                  .slice(0, 8)
                  .map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.name}</TableCell>
                      <TableCell className="hidden max-w-52 truncate text-sm text-muted-foreground sm:table-cell">
                        {c.location}
                      </TableCell>
                      <TableCell className="num text-right text-sm">{c.totalBookings}</TableCell>
                      <TableCell className="num text-right text-sm font-medium">
                        {inr(c.totalSpending)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="cancellations" className="mt-4">
          <ChartCard
            title="Cancellations & reschedules"
            description="Last 6 months"
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cancellationTrend} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                />
                <XAxis dataKey="month" {...axis} />
                <YAxis {...axis} width={48} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="cancelled"
                  name="Cancelled"
                  fill="var(--color-destructive)"
                  radius={[6, 6, 0, 0]}
                  barSize={26}
                />
                <Bar
                  dataKey="rescheduled"
                  name="Rescheduled"
                  fill="var(--color-chart-2)"
                  radius={[6, 6, 0, 0]}
                  barSize={26}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </>
  );
}
