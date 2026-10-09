import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";

import { Stepper, FieldError } from "@/components/common/stepper";
import { Totals } from "@/components/spare-parts/purchase-order-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { BRAND_LOGO_URL } from "@/lib/supabase";
import {
  admin,
  bookings,
  customers,
  services,
  spareParts,
  invoiceTotal,
  type Invoice,
} from "@/lib/mock-data";
import { inr, shortDate } from "@/lib/format";

export type InvoiceDraft = Invoice & { notes?: string };

const STEPS = ["Customer", "Items", "Payment", "Review"];
const METHODS: Invoice["method"][] = ["UPI", "Cash", "Card", "Net Banking"];
const addDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

const blank = (id: string): InvoiceDraft => ({
  id,
  bookingId: "",
  customerId: "",
  customer: "",
  issuedOn: addDays(0),
  dueOn: addDays(7),
  status: "Pending",
  method: "UPI",
  items: [],
  taxRate: 18,
  notes: "",
});

const buildCatalogue = () => [
  ...services
    .filter((s) => s.active)
    .map((s) => ({ key: `s-${s.id}`, label: s.name, rate: s.price, group: "Service" })),
  ...spareParts.map((p) => ({
    key: `p-${p.id}`,
    label: p.name,
    rate: p.sellingPrice,
    group: "Part",
  })),
];

export function InvoiceBuilder({
  open,
  onOpenChange,
  nextId,
  draft,
  onSaveDraft,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextId: string;
  draft: InvoiceDraft | null;
  onSaveDraft: (d: InvoiceDraft) => Promise<void>;
  onCreate: (inv: InvoiceDraft) => Promise<void>;
}) {
  const catalogue = buildCatalogue();
  const [step, setStep] = useState(0);
  const [inv, setInv] = useState<InvoiceDraft>(() => draft ?? blank(nextId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<null | "draft" | "create">(null);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setInv(draft ?? blank(nextId));
      setStep(0);
      setErrors({});
    }
  }

  const cust = customers.find((c) => c.id === inv.customerId);
  const custBookings = bookings.filter((b) => b.customerId === inv.customerId);
  const totals = invoiceTotal(inv);

  const setItem = (i: number, patch: Partial<Invoice["items"][number]>) =>
    setInv((p) => ({ ...p, items: p.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0 && !inv.customerId) e["customer"] = "Select a customer";
    if (s === 1) {
      if (inv.items.length === 0) e["items"] = "Add at least one item";
      inv.items.forEach((it, i) => {
        if (!it.label.trim()) e[`l${i}`] = "Item name is required";
        if (!(it.qty >= 1)) e[`q${i}`] = "Min 1";
        if (!(it.rate > 0)) e[`r${i}`] = "Enter price";
      });
    }
    if (s === 2) {
      if (!inv.issuedOn) e["issuedOn"] = "Required";
      if (!inv.dueOn) e["dueOn"] = "Required";
      else if (inv.dueOn < inv.issuedOn) e["dueOn"] = "Due date must be on or after issue date";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finish = async (kind: "draft" | "create") => {
    if (kind === "draft" && !inv.customerId) {
      setStep(0);
      setErrors({ customer: "Select a customer to save a draft" });
      return;
    }
    setSaving(kind);
    try {
      if (kind === "draft") await onSaveDraft(inv);
      else await onCreate(inv);
    } finally {
      setSaving(null);
    }
  };

  const pickBooking = (id: string) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return setInv({ ...inv, bookingId: "" });
    const svc = services.find((s) => s.id === b.serviceId);
    const partLines = b.parts.map((p) => ({
      label: p.name,
      qty: p.qty,
      rate: spareParts.find((sp) => sp.name === p.name)?.sellingPrice ?? 0,
    }));
    setInv({
      ...inv,
      bookingId: b.id,
      items: inv.items.length
        ? inv.items
        : [{ label: b.service, qty: 1, rate: svc?.price ?? b.amount }, ...partLines],
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>
            Bill an existing customer, optionally against a booking.
          </DialogDescription>
        </DialogHeader>
        <Stepper steps={STEPS} current={step} />

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select
                    value={inv.customerId}
                    onValueChange={(v) => {
                      const c = customers.find((x) => x.id === v)!;
                      setInv({ ...inv, customerId: c.id, customer: c.name, bookingId: "" });
                    }}
                  >
                    <SelectTrigger aria-label="Customer" aria-invalid={!!errors["customer"]}>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} · {c.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError msg={errors["customer"]} />
                </div>
                <div className="space-y-2">
                  <Label>Booking</Label>
                  <Select
                    value={inv.bookingId || "none"}
                    onValueChange={(v) => pickBooking(v === "none" ? "" : v)}
                    disabled={!cust}
                  >
                    <SelectTrigger aria-label="Booking">
                      <SelectValue placeholder="Select booking" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No booking</SelectItem>
                      {custBookings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.id} · {b.service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cust && custBookings.length === 0 && (
                    <p className="text-xs text-muted-foreground">No bookings for this customer.</p>
                  )}
                </div>
              </div>
              {cust && (
                <dl className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Name</dt>
                    <dd className="font-medium">{cust.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd className="num">{cust.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="break-all">{cust.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Address</dt>
                    <dd>{cust.location}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Booking ID</dt>
                    <dd className="num">{inv.bookingId || "—"}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {inv.items.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No items yet.
                </div>
              )}
              {inv.items.map((it, i) => (
                <div
                  key={i}
                  className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_72px_110px_auto] sm:items-start"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Service / item</Label>
                    <Select
                      value=""
                      onValueChange={(v) => {
                        const c = catalogue.find((x) => x.key === v)!;
                        setItem(i, { label: c.label, rate: c.rate });
                      }}
                    >
                      <SelectTrigger aria-label={`Pick catalogue item line ${i + 1}`}>
                        <SelectValue placeholder="Pick from catalogue" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogue.map((c) => (
                          <SelectItem key={c.key} value={c.key}>
                            {c.group}: {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={it.label}
                      onChange={(e) => setItem(i, { label: e.target.value })}
                      placeholder="Description"
                      maxLength={120}
                      aria-label={`Description line ${i + 1}`}
                    />
                    <FieldError msg={errors[`l${i}`]} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) =>
                        setItem(i, { qty: Math.max(0, Math.floor(Number(e.target.value))) })
                      }
                      aria-label={`Quantity line ${i + 1}`}
                    />
                    <FieldError msg={errors[`q${i}`]} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit price (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={it.rate}
                      onChange={(e) => setItem(i, { rate: Math.max(0, Number(e.target.value)) })}
                      aria-label={`Unit price line ${i + 1}`}
                    />
                    <FieldError msg={errors[`r${i}`]} />
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                    <span className="num text-sm font-semibold sm:mt-6">
                      {inr(it.qty * it.rate)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove line ${i + 1}`}
                      onClick={() =>
                        setInv((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <FieldError msg={errors["items"]} />
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setInv((p) => ({ ...p, items: [...p.items, { label: "", qty: 1, rate: 0 }] }))
                  }
                >
                  <Plus className="size-4" /> Add item
                </Button>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">GST rate</Label>
                  <Select
                    value={String(inv.taxRate)}
                    onValueChange={(v) => setInv({ ...inv, taxRate: Number(v) })}
                  >
                    <SelectTrigger aria-label="GST rate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 5, 12, 18, 28].map((r) => (
                        <SelectItem key={r} value={String(r)}>
                          {r}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Totals sub={totals.sub} tax={totals.tax} total={totals.total} rate={inv.taxRate} />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select
                  value={inv.method}
                  onValueChange={(v) => setInv({ ...inv, method: v as Invoice["method"] })}
                >
                  <SelectTrigger aria-label="Payment method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment status</Label>
                <Select
                  value={inv.status}
                  onValueChange={(v) => setInv({ ...inv, status: v as Invoice["status"] })}
                >
                  <SelectTrigger aria-label="Payment status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-issued">Issue date *</Label>
                <Input
                  id="inv-issued"
                  type="date"
                  value={inv.issuedOn}
                  onChange={(e) => setInv({ ...inv, issuedOn: e.target.value })}
                />
                <FieldError msg={errors["issuedOn"]} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-due">Due date *</Label>
                <Input
                  id="inv-due"
                  type="date"
                  value={inv.dueOn}
                  onChange={(e) => setInv({ ...inv, dueOn: e.target.value })}
                />
                <FieldError msg={errors["dueOn"]} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="inv-notes">Notes</Label>
                <Textarea
                  id="inv-notes"
                  rows={3}
                  value={inv.notes}
                  onChange={(e) => setInv({ ...inv, notes: e.target.value })}
                  maxLength={500}
                />
              </div>
            </div>
          )}

          {step === 3 && cust && (
            <article className="rounded-xl border border-border bg-card p-5 text-sm">
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
                  <p className="text-xs text-muted-foreground">{admin.business.address}</p>
                  <p className="num text-xs text-muted-foreground">GSTIN {admin.business.gstin}</p>
                </div>
                <div className="text-right">
                  <p className="num font-semibold">{inv.id}</p>
                  <p className="num text-xs text-muted-foreground">
                    Issued {shortDate(inv.issuedOn)}
                  </p>
                  <p className="num text-xs text-muted-foreground">Due {shortDate(inv.dueOn)}</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">Billed to</p>
                  <p className="mt-1 font-medium">{cust.name}</p>
                  <p className="text-xs text-muted-foreground">{cust.location}</p>
                  <p className="num text-xs text-muted-foreground">
                    {cust.phone} · {cust.email}
                  </p>
                  {inv.bookingId && (
                    <p className="num text-xs text-muted-foreground">Booking {inv.bookingId}</p>
                  )}
                </div>
                <div className="sm:text-right">
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">Payment</p>
                  <p className="mt-1">
                    {inv.method} · {inv.status}
                  </p>
                </div>
              </div>
              <ul className="my-4 space-y-2">
                {inv.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3 border-b border-border/60 pb-2">
                    <span className="min-w-0">
                      {it.label}{" "}
                      <span className="num text-xs text-muted-foreground">
                        {it.qty} × {inr(it.rate)}
                      </span>
                    </span>
                    <span className="num shrink-0 font-medium">{inr(it.qty * it.rate)}</span>
                  </li>
                ))}
              </ul>
              <Totals sub={totals.sub} tax={totals.tax} total={totals.total} rate={inv.taxRate} />
              {inv.notes && (
                <p className="mt-4 text-xs text-muted-foreground">Notes: {inv.notes}</p>
              )}
            </article>
          )}
        </div>

        <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={!!saving}>
              Cancel
            </Button>
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={!!saving}>
                <ArrowLeft className="size-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => finish("draft")} disabled={!!saving}>
              {saving === "draft" && <Loader2 className="size-4 animate-spin" />} Save draft
            </Button>
            {step < 3 ? (
              <Button onClick={() => validate(step) && setStep(step + 1)}>
                Next <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={() => finish("create")} disabled={!!saving}>
                {saving === "create" && <Loader2 className="size-4 animate-spin" />} Create invoice
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
