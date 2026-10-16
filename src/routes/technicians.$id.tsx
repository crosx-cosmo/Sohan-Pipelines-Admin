import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarCheck,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  Star,
  Timer,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartCard } from "@/components/common/chart-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { activity, bookings, technicians, technicianRatings } from "@/lib/mock-data";
import { dateTime, initials, inr, num, shortDate, timeAgo } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import * as db from "@/lib/db";
import { useData } from "@/components/auth/auth-gate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/technicians/$id")({
  head: () => {
    const name = "Technician";
    return {
      meta: [
        { title: `${name} — Technician Profile | SOHAN PIPELINES` },
        {
          name: "description",
          content: `Performance, booking history and activity timeline for ${name}.`,
        },
        { property: "og:title", content: `${name} — Technician Profile` },
        {
          property: "og:description",
          content: `Performance, booking history and activity timeline for ${name}.`,
        },
      ],
    };
  },
  component: TechnicianDetail,
});

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

function TechnicianDetail() {
  const { id } = Route.useParams();
  const found = technicians.find((x) => x.id === id);
  if (!found) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-lg font-semibold">Technician not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">It may have been removed.</p>
      </div>
    );
  }
  return <TechnicianView tech={found} />;
}

function TechnicianView({ tech }: { tech: (typeof technicians)[number] }) {
  const jobs = bookings.filter((b) => b.technicianId === tech.id);
  const [rateFor, setRateFor] = useState<string | null>(null);

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 5 + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      month: d.toLocaleString("en-US", { month: "short" }),
      jobs: jobs.filter((j) => j.scheduledAt.slice(0, 7) === key).length,
      rating: 0,
    };
  });

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/technicians">
          <ArrowLeft className="size-4" /> All technicians
        </Link>
      </Button>

      <section className="surface-panel overflow-hidden rounded-xl">
        <div className="h-20 w-full border-b border-primary/10 bg-primary/8" />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 px-5 pb-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end">
          <Avatar className="-mt-10 size-20 shrink-0 ring-4 ring-card">
            <AvatarImage src={tech.photo} alt={tech.name} />
            <AvatarFallback className="text-lg">{initials(tech.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 sm:pb-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{tech.name}</h1>
              <StatusBadge value={tech.availability} />
              <StatusBadge value={tech.status} dot={false} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="num inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> {tech.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {tech.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {tech.serviceAreas.join(", ")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-3.5" /> Joined {shortDate(tech.joinedOn)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 sm:pb-1">
            <Button variant="outline" size="sm">
              <Phone className="size-4" /> Call
            </Button>
            <Button size="sm">
              <CalendarCheck className="size-4" /> Assign job
            </Button>
          </div>
        </div>
      </section>

      <PageHeader title="Performance" description="Rolling 6-month field performance snapshot." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Completed jobs" value={num(tech.completedJobs)} icon={CalendarCheck} />
        <StatCard
          label="Average rating"
          value={tech.rating ? `${tech.rating} / 5` : "No ratings yet"}
          icon={Star}
          accent="copper"
        />
        <StatCard
          label="Total earnings"
          value={inr(tech.earnings, true)}
          icon={IndianRupee}
          accent="success"
        />
        <StatCard
          label="On-time rate"
          value={tech.completedJobs ? `${tech.onTimeRate}%` : "No jobs yet"}
          icon={Timer}
          accent="info"
        />
      </div>

      <ChartCard title="Monthly job volume" description="Jobs completed per month">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly} margin={{ left: -18, right: 6, top: 6 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
            <XAxis dataKey="month" {...axis} />
            <YAxis {...axis} width={48} />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                fontSize: 12,
              }}
              cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
            />
            <Bar
              dataKey="jobs"
              name="Jobs"
              fill="var(--color-chart-1)"
              radius={[6, 6, 0, 0]}
              barSize={34}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Booking history</TabsTrigger>
          <TabsTrigger value="activity">Activity timeline</TabsTrigger>
          <TabsTrigger value="skills">Skills & areas</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4">
          <div className="surface-panel record-list overflow-x-auto rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.slice(0, 10).map((b) => {
                  const rated = technicianRatings.find((r) => r.bookingId === b.id);
                  return (
                    <TableRow key={b.id}>
                      <TableCell data-label="Booking" className="num text-xs font-medium">
                        {b.id}
                      </TableCell>
                      <TableCell data-label="Customer">
                        <p className="truncate text-sm">{b.customer}</p>
                        <p className="truncate text-xs text-muted-foreground">{b.service}</p>
                      </TableCell>
                      <TableCell data-label="Scheduled" className="hidden text-sm md:table-cell">
                        {dateTime(b.scheduledAt)}
                      </TableCell>
                      <TableCell data-label="Status">
                        <StatusBadge value={b.status} />
                      </TableCell>
                      <TableCell data-label="Amount" className="num text-right text-sm font-medium">
                        {inr(b.amount)}
                      </TableCell>
                      <TableCell data-label="Rating" className="text-right">
                        {rated ? (
                          <span className="num inline-flex items-center gap-1 text-sm">
                            <Star className="size-3.5 fill-copper text-copper" /> {rated.rating}
                          </span>
                        ) : b.status === "Completed" ? (
                          <Button size="sm" variant="outline" onClick={() => setRateFor(b.id)}>
                            Rate
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ol className="surface-panel space-y-5 rounded-xl p-5">
            {activity.map((a) => (
              <li key={a.id} className="relative border-l border-border pl-5 pb-1 last:pb-0">
                <span className="absolute top-1 -left-[5px] size-2.5 rounded-full bg-primary ring-4 ring-card" />
                <p className="text-sm">
                  <span className="font-medium">{a.actor}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span> {a.target}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/80">{timeAgo(a.at)}</p>
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="surface-panel rounded-xl p-5">
              <h3 className="text-sm font-semibold">Expertise</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {tech.expertise.map((e) => (
                  <span
                    key={e}
                    className="rounded-lg border border-primary/25 bg-primary/8 px-2.5 py-1 text-xs text-primary"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </section>
            <section className="surface-panel rounded-xl p-5">
              <h3 className="text-sm font-semibold">Service areas</h3>
              <ul className="mt-3 space-y-2">
                {tech.serviceAreas.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm">
                    <MapPin className="size-3.5 text-muted-foreground" /> {a}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </TabsContent>
      </Tabs>

      <RateJobDialog
        bookingId={rateFor}
        technicianId={tech.id}
        technicianName={tech.name}
        onClose={() => setRateFor(null)}
      />
    </>
  );
}

function RateJobDialog({
  bookingId,
  technicianId,
  technicianName,
  onClose,
}: {
  bookingId: string | null;
  technicianId: string;
  technicianName: string;
  onClose: () => void;
}) {
  const { reload } = useData();
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog
      open={bookingId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {technicianName}</DialogTitle>
          <DialogDescription>Customer-facing rating for booking {bookingId}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} star{r > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate-comment">Comment (optional)</Label>
            <Textarea
              id="rate-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the work?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              if (!bookingId) return;
              setBusy(true);
              try {
                await db.saveRating(bookingId, technicianId, Number(rating), comment.trim());
                await reload();
                toast.success("Rating saved");
                onClose();
              } catch (e) {
                toast.error("Couldn't save the rating", {
                  description: e instanceof Error ? e.message : undefined,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Save rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
