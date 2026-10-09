import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileText, IndianRupee, Printer, Search, Send, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as db from "@/lib/db";
import { downloadCsv } from "@/lib/csv";
import { BRAND_LOGO_URL } from "@/lib/supabase";
import { useData } from "@/components/auth/auth-gate";
import { admin, invoices as seed, invoiceTotal, type Invoice } from "@/lib/mock-data";
import { inr, shortDate } from "@/lib/format";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { InvoiceBuilder, type InvoiceDraft } from "@/components/billing/invoice-builder";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content: "Invoices, payments, refunds and GST-ready billing records in Indian Rupees.",
      },
      { property: "og:title", content: "Billing — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content: "Invoices, payments, refunds and GST-ready billing records in Indian Rupees.",
      },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const loading = useMockLoading();
  const [rows, setRows] = useState<InvoiceDraft[]>(seed);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [tab, setTab] = useState("all");
  const [preview, setPreview] = useState<InvoiceDraft | null>(() => {
    if (typeof window === "undefined") return null;
    const id = sessionStorage.getItem("open-invoice");
    sessionStorage.removeItem("open-invoice");
    return id ? (seed.find((i) => i.id === id) ?? null) : null;
  });
  const [builder, setBuilder] = useState(false);
  const { reload } = useData();
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const year = new Date().getFullYear();
  const nextId = `INV-${year}-${String(rows.reduce((m, r) => Math.max(m, Number(r.id.split("-").pop()) || 0), 0) + 1).padStart(4, "0")}`;
  const latestDraft = rows.find((r) => r.status === "Draft") ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((i) => {
      const matchesTab =
        tab === "all" ||
        (tab === "pending" && (i.status === "Pending" || i.status === "Overdue")) ||
        (tab === "paid" && i.status === "Paid") ||
        (tab === "refunds" && i.status === "Refunded");
      return (
        matchesTab &&
        (!q ||
          i.id.toLowerCase().includes(q) ||
          i.customer.toLowerCase().includes(q) ||
          i.bookingId.toLowerCase().includes(q)) &&
        (status === "all" || i.status === status)
      );
    });
  }, [rows, query, status, tab]);

  const sum = (list: Invoice[]) => list.reduce((s, i) => s + invoiceTotal(i).total, 0);
  const paid = rows.filter((i) => i.status === "Paid");
  const pending = rows.filter((i) => i.status === "Pending" || i.status === "Overdue");
  const refunded = rows.filter((i) => i.status === "Refunded");

  return (
    <>
      <PageHeader
        title="Billing"
        description="GST invoices, collections and refunds — all amounts in Indian Rupees."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  "invoices.csv",
                  rows.map((i) => ({
                    Invoice: i.id,
                    Customer: i.customer,
                    Booking: i.bookingId,
                    Issued: i.issuedOn,
                    Due: i.dueOn,
                    Status: i.status,
                    Method: i.method,
                    Subtotal: invoiceTotal(i).sub,
                    GST: invoiceTotal(i).tax,
                    Total: invoiceTotal(i).total,
                  })),
                )
                  ? toast.success("Statement downloaded")
                  : toast.info("No invoices yet")
              }
            >
              <Download className="size-4" /> Statement
            </Button>
            {latestDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(latestDraft);
                  setBuilder(true);
                }}
              >
                Resume draft {latestDraft.id}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setDraft(null);
                setBuilder(true);
              }}
            >
              <FileText className="size-4" /> New invoice
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          label="Revenue collected"
          value={inr(sum(paid))}
          hint={`${paid.length} paid invoices`}
          icon={IndianRupee}
          accent="success"
        />
        <StatCard
          loading={loading}
          label="Pending payments"
          value={inr(sum(pending))}
          hint={`${pending.length} awaiting settlement`}
          icon={Wallet}
          accent="copper"
        />
        <StatCard
          loading={loading}
          label="Refunds issued"
          value={inr(sum(refunded))}
          hint={`${refunded.length} this month`}
          icon={IndianRupee}
          accent="info"
        />
        <StatCard
          loading={loading}
          label="Invoices raised"
          value={String(rows.length)}
          hint="September 2026"
          icon={FileText}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All invoices</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-4">
          <div className="surface-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search invoice, customer or booking…"
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="surface-panel record-list overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Booking</TableHead>
                    <TableHead className="hidden sm:table-cell">Issued</TableHead>
                    <TableHead className="hidden lg:table-cell">Due</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <EmptyState
                          icon={FileText}
                          title="No invoices here"
                          description="Nothing matches this tab, search or status filter yet."
                          action={
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setQuery("");
                                setStatus("all");
                                setTab("all");
                              }}
                            >
                              Clear filters
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((i) => (
                      <TableRow key={i.id} className="cursor-pointer" onClick={() => setPreview(i)}>
                        <TableCell data-label="Invoice" className="num text-xs font-medium">
                          {i.id}
                        </TableCell>
                        <TableCell data-label="Customer" className="text-sm">
                          {i.customer}
                        </TableCell>
                        <TableCell
                          data-label="Booking"
                          className="num hidden text-xs md:table-cell"
                        >
                          {i.bookingId}
                        </TableCell>
                        <TableCell data-label="Issued" className="num hidden text-sm sm:table-cell">
                          {shortDate(i.issuedOn)}
                        </TableCell>
                        <TableCell data-label="Due" className="num hidden text-sm lg:table-cell">
                          {shortDate(i.dueOn)}
                        </TableCell>
                        <TableCell data-label="Method" className="text-sm">
                          {i.method}
                        </TableCell>
                        <TableCell data-label="Status">
                          <StatusBadge value={i.status} />
                        </TableCell>
                        <TableCell
                          data-label="Total"
                          className="num text-right text-sm font-semibold"
                        >
                          {inr(invoiceTotal(i).total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <InvoiceBuilder
        open={builder}
        onOpenChange={setBuilder}
        nextId={draft?.id ?? nextId}
        draft={draft}
        onSaveDraft={async (d) => {
          await db.persist(
            () => db.saveInvoice(d, "draft"),
            reload,
            `${d.id} saved as draft`,
            toast,
          );
        }}
        onCreate={async (inv) => {
          const ok = await db.persist(
            () => db.saveInvoice(inv, inv.status === "Paid" ? "paid" : "pending"),
            reload,
            `${inv.id} created`,
            toast,
          );
          if (ok) sessionStorage.setItem("open-invoice", inv.id);
        }}
      />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice preview</DialogTitle>
            <DialogDescription>GST invoice as the customer receives it.</DialogDescription>
          </DialogHeader>

          {preview && (
            <article className="rounded-xl border border-border bg-card p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <img
                      src={BRAND_LOGO_URL}
                      alt="SOHAN PIPELINES logo"
                      className="size-9 rounded-lg object-cover"
                    />
                    <p className="font-display text-lg font-semibold text-primary">
                      SOHAN PIPELINES
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{admin.business.address}</p>
                  <p className="num text-xs text-muted-foreground">GSTIN {admin.business.gstin}</p>
                </div>
                <div className="text-right">
                  <p className="num text-sm font-semibold">{preview.id}</p>
                  <p className="num mt-1 text-xs text-muted-foreground">
                    Issued {shortDate(preview.issuedOn)}
                  </p>
                  <p className="num text-xs text-muted-foreground">
                    Due {shortDate(preview.dueOn)}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <StatusBadge value={preview.status} />
                  </div>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">Billed to</p>
                  <p className="mt-1 text-sm font-medium">{preview.customer}</p>
                  <p className="num text-xs text-muted-foreground">Booking {preview.bookingId}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">Payment</p>
                  <p className="mt-1 text-sm">{preview.method}</p>
                </div>
              </div>

              <table className="mt-6 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 text-left font-medium">Description</th>
                    <th className="py-2 text-right font-medium">Qty</th>
                    <th className="py-2 text-right font-medium">Rate</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((it) => (
                    <tr key={it.label} className="border-b border-border/60">
                      <td className="py-2.5 pr-3">{it.label}</td>
                      <td className="num py-2.5 text-right">{it.qty}</td>
                      <td className="num py-2.5 text-right">{inr(it.rate)}</td>
                      <td className="num py-2.5 text-right font-medium">{inr(it.qty * it.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 ml-auto w-full max-w-64 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="num">{inr(invoiceTotal(preview).sub)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST ({preview.taxRate}%)</span>
                  <span className="num">{inr(invoiceTotal(preview).tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="num">{inr(invoiceTotal(preview).total)}</span>
                </div>
              </div>

              {preview.notes && (
                <p className="mt-4 text-xs text-muted-foreground">Notes: {preview.notes}</p>
              )}
              <p className="mt-6 text-xs text-muted-foreground">
                Payments to {admin.business.name}
                {admin.business.supportPhone && ` · Support ${admin.business.supportPhone}`}
              </p>
            </article>
          )}

          <DialogFooter className="flex-wrap gap-2">
            {preview?.status === "Draft" && (
              <Button
                variant="outline"
                onClick={() => {
                  setDraft(preview);
                  setPreview(null);
                  setBuilder(true);
                }}
              >
                Continue editing
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            {preview && preview.status !== "Paid" && preview.status !== "Draft" && (
              <Button
                onClick={() => {
                  const id = preview.id;
                  setPreview(null);
                  void db.persist(
                    () => db.setInvoiceStatus(id, "paid"),
                    reload,
                    `${id} marked as paid`,
                    toast,
                  );
                }}
              >
                Mark as paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
