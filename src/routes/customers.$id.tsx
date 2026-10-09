import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  Plus,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as db from "@/lib/db";
import { bookings, customers, invoices, invoiceTotal } from "@/lib/mock-data";
import { dateTime, initials, inr, shortDate, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/customers/$id")({
  head: () => {
    const name = "Customer";
    return {
      meta: [
        { title: `${name} — Customer Profile | SOHAN PIPELINES` },
        { name: "description", content: `Bookings, payments, notes and activity for ${name}.` },
        { property: "og:title", content: `${name} — Customer Profile` },
        {
          property: "og:description",
          content: `Bookings, payments, notes and activity for ${name}.`,
        },
      ],
    };
  },
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const found = customers.find((x) => x.id === id);
  if (!found) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-lg font-semibold">Customer not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">It may have been removed.</p>
      </div>
    );
  }
  return <CustomerView customer={found} />;
}

function CustomerView({ customer }: { customer: (typeof customers)[number] }) {
  const history = bookings.filter((b) => b.customerId === customer.id);
  const bills = invoices.filter((i) => i.customerId === customer.id);
  const [notes, setNotes] = useState(customer.notes);
  const [notesError, setNotesError] = useState("");
  useEffect(() => {
    db.listCustomerNotes(customer.id)
      .then(setNotes)
      .catch((e) => setNotesError(e.message));
  }, [customer.id]);
  const [draft, setDraft] = useState("");

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/customers">
          <ArrowLeft className="size-4" /> All customers
        </Link>
      </Button>

      <section className="surface-panel rounded-xl p-5">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <Avatar className="size-16 shrink-0 ring-2 ring-border">
            <AvatarFallback className="text-lg">{initials(customer.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{customer.name}</h1>
              <StatusBadge value={customer.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="num inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> {customer.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {customer.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {customer.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-3.5" /> Customer since {shortDate(customer.since)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {customer.phone ? (
              <Button asChild size="sm">
                <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone className="size-4" /> Call
                </a>
              </Button>
            ) : (
              <Button size="sm" disabled>
                <Phone className="size-4" /> No phone
              </Button>
            )}
            {customer.email && (
              <Button asChild variant="outline" size="sm">
                <a href={`mailto:${customer.email}`}>
                  <Mail className="size-4" /> Email
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      <PageHeader title="Account summary" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total bookings"
          value={String(customer.totalBookings)}
          icon={CalendarCheck}
        />
        <StatCard
          label="Completed jobs"
          value={String(customer.completedJobs)}
          icon={CalendarCheck}
          accent="success"
        />
        <StatCard
          label="Lifetime spending"
          value={inr(customer.totalSpending)}
          icon={IndianRupee}
          accent="copper"
        />
        <StatCard
          label="Last booking"
          value={shortDate(customer.lastBooking)}
          icon={CalendarCheck}
          accent="info"
        />
      </div>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Booking history</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4">
          <div className="surface-panel overflow-x-auto rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="hidden md:table-cell">Technician</TableHead>
                  <TableHead className="hidden sm:table-cell">Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No bookings yet.
                    </TableCell>
                  </TableRow>
                )}
                {history.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="num text-xs font-medium">{b.id}</TableCell>
                    <TableCell className="max-w-56 truncate text-sm">{b.service}</TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {b.technician ?? <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell className="num hidden text-sm whitespace-nowrap sm:table-cell">
                      {dateTime(b.scheduledAt)}
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
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <div className="surface-panel overflow-x-auto rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="hidden sm:table-cell">Issued</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No invoices raised for this customer yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  bills.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="num text-xs font-medium">{i.id}</TableCell>
                      <TableCell className="num hidden text-sm sm:table-cell">
                        {shortDate(i.issuedOn)}
                      </TableCell>
                      <TableCell className="text-sm">{i.method}</TableCell>
                      <TableCell>
                        <StatusBadge value={i.status} />
                      </TableCell>
                      <TableCell className="num text-right text-sm font-medium">
                        {inr(invoiceTotal(i).total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="surface-panel space-y-4 rounded-xl p-5">
            <div className="space-y-2">
              <Textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add an internal note about this customer…"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!draft.trim()) {
                    toast.error("Write a note first");
                    return;
                  }
                  const text = draft.trim();
                  db.addCustomerNote(customer.id, text)
                    .then(() => db.listCustomerNotes(customer.id))
                    .then((n) => {
                      setNotes(n);
                      setDraft("");
                      toast.success("Note added");
                    })
                    .catch((e) =>
                      toast.error("Couldn't save the note", { description: e.message }),
                    );
                }}
              >
                <Plus className="size-4" /> Add note
              </Button>
            </div>
            {notesError && <p className="text-xs text-muted-foreground">{notesError}</p>}
            {notes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="divide-y">
                {notes.map((n) => (
                  <li key={n.id} className="py-3">
                    <p className="text-sm">{n.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.author} · {timeAgo(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ol className="surface-panel space-y-5 rounded-xl p-5">
            {history.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">No activity yet.</li>
            )}
            {history
              .slice(0, 15)
              .map((b) => ({
                id: b.id,
                actor: b.service,
                action: `· ${b.status}`,
                target: b.technician ? `with ${b.technician}` : "",
                at: b.scheduledAt,
              }))
              .map((a) => (
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
      </Tabs>
    </>
  );
}
