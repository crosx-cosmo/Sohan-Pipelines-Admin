import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";

import { Stepper, FieldError } from "@/components/common/stepper";
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
import { suppliers as dbSuppliers, type SparePart } from "@/lib/mock-data";
import { inr, shortDate } from "@/lib/format";

export interface PurchaseOrder {
  id: string;
  supplier: {
    name: string;
    contact: string;
    phone: string;
    email: string;
    address: string;
    gstin: string;
  };
  items: { partId: string; name: string; sku: string; qty: number; price: number }[];
  taxRate: number;
  orderDate: string;
  expectedOn: string;
  terms: string;
  notes: string;
  status: "Draft" | "Ordered" | "Received";
}

export const poTotals = (po: Pick<PurchaseOrder, "items" | "taxRate">) => {
  const sub = po.items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = Math.round(sub * (po.taxRate / 100));
  return { sub, tax, total: sub + tax };
};

const STEPS = ["Supplier", "Parts", "Details", "Review"];
const TERMS = ["Advance", "Net 15", "Net 30", "Net 45", "On delivery"];
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

function blank(nextId: string, parts: SparePart[]): PurchaseOrder {
  return {
    id: nextId,
    supplier: { name: "", contact: "", phone: "", email: "", address: "", gstin: "" },
    items: parts[0] ? [] : [],
    taxRate: 18,
    orderDate: today(),
    expectedOn: addDays(7),
    terms: "Net 30",
    notes: "",
    status: "Draft",
  };
}

export function PurchaseOrderDialog({
  open,
  onOpenChange,
  parts,
  nextId,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  parts: SparePart[];
  nextId: string;
  initial: PurchaseOrder | null;
  onSave: (po: PurchaseOrder) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [po, setPo] = useState<PurchaseOrder>(() => initial ?? blank(nextId, parts));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<null | "draft" | "create">(null);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setPo(initial ?? blank(nextId, parts));
      setStep(0);
      setErrors({});
    }
  }

  const suppliers = useMemo(
    () =>
      Array.from(
        new Set([
          ...dbSuppliers.map((x) => x.name),
          ...parts.map((p) => p.supplier).filter((x) => x && x !== "—"),
        ]),
      ).sort(),
    [parts],
  );
  const totals = poTotals(po);
  const setSup = (k: keyof PurchaseOrder["supplier"], v: string) =>
    setPo((p) => ({ ...p, supplier: { ...p.supplier, [k]: v } }));

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!po.supplier.name.trim()) e["name"] = "Supplier name is required";
      if (!/^[+\d][\d\s-]{9,14}$/.test(po.supplier.phone.trim()))
        e["phone"] = "Enter a valid phone number";
      if (po.supplier.email && !/^\S+@\S+\.\S+$/.test(po.supplier.email))
        e["email"] = "Enter a valid email";
      if (po.supplier.gstin && !/^[0-9A-Z]{15}$/i.test(po.supplier.gstin))
        e["gstin"] = "GSTIN must be 15 characters";
    }
    if (s === 1) {
      if (po.items.length === 0) e["items"] = "Add at least one part";
      po.items.forEach((it, i) => {
        if (!it.partId) e[`p${i}`] = "Select a part";
        if (!(it.qty >= 1)) e[`q${i}`] = "Min 1";
        if (!(it.price > 0)) e[`r${i}`] = "Enter price";
      });
    }
    if (s === 2) {
      if (!po.id.trim()) e["id"] = "PO number is required";
      if (!po.orderDate) e["orderDate"] = "Required";
      if (!po.expectedOn) e["expectedOn"] = "Required";
      else if (po.expectedOn < po.orderDate) e["expectedOn"] = "Must be on or after order date";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => validate(step) && setStep((s) => Math.min(s + 1, 3));
  const updateItem = (i: number, patch: Partial<PurchaseOrder["items"][number]>) =>
    setPo((p) => ({ ...p, items: p.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  const finish = async (kind: "draft" | "create") => {
    if (kind === "draft" && !po.supplier.name.trim()) {
      setStep(0);
      setErrors({ name: "Add a supplier name to save a draft" });
      return;
    }
    setSaving(kind);
    try {
      await onSave({ ...po, status: kind === "draft" ? "Draft" : "Ordered" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
          <DialogDescription>Order spare parts from a supplier.</DialogDescription>
        </DialogHeader>
        <Stepper steps={STEPS} current={step} />

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Existing supplier</Label>
                <Select
                  value={suppliers.includes(po.supplier.name) ? po.supplier.name : ""}
                  onValueChange={(v) => {
                    const f = dbSuppliers.find((x) => x.name === v);
                    setPo((p) => ({
                      ...p,
                      supplier: f
                        ? {
                            name: f.name,
                            contact: f.contact,
                            phone: f.phone,
                            email: f.email,
                            address: f.address,
                            gstin: f.gstin,
                          }
                        : { ...p.supplier, name: v },
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a supplier or type a new one below" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-name">Supplier name *</Label>
                <Input
                  id="po-name"
                  value={po.supplier.name}
                  onChange={(e) => setSup("name", e.target.value)}
                  maxLength={100}
                  aria-invalid={!!errors["name"]}
                />
                <FieldError msg={errors["name"]} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-contact">Contact person</Label>
                <Input
                  id="po-contact"
                  value={po.supplier.contact}
                  onChange={(e) => setSup("contact", e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-phone">Phone *</Label>
                <Input
                  id="po-phone"
                  inputMode="tel"
                  value={po.supplier.phone}
                  onChange={(e) => setSup("phone", e.target.value)}
                  maxLength={16}
                  placeholder="+91 98300 00000"
                  aria-invalid={!!errors["phone"]}
                />
                <FieldError msg={errors["phone"]} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-email">Email</Label>
                <Input
                  id="po-email"
                  type="email"
                  value={po.supplier.email}
                  onChange={(e) => setSup("email", e.target.value)}
                  maxLength={120}
                  aria-invalid={!!errors["email"]}
                />
                <FieldError msg={errors["email"]} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="po-addr">Address</Label>
                <Textarea
                  id="po-addr"
                  rows={2}
                  value={po.supplier.address}
                  onChange={(e) => setSup("address", e.target.value)}
                  maxLength={300}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-gst">GSTIN</Label>
                <Input
                  id="po-gst"
                  value={po.supplier.gstin}
                  onChange={(e) => setSup("gstin", e.target.value.toUpperCase())}
                  maxLength={15}
                  aria-invalid={!!errors["gstin"]}
                />
                <FieldError msg={errors["gstin"]} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {po.items.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No parts added yet.
                </div>
              )}
              {po.items.map((it, i) => (
                <div
                  key={i}
                  className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_80px_110px_auto] sm:items-start"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Part</Label>
                    <Select
                      value={it.partId}
                      onValueChange={(v) => {
                        const p = parts.find((x) => x.id === v)!;
                        updateItem(i, {
                          partId: p.id,
                          name: p.name,
                          sku: p.sku,
                          price: p.purchasePrice,
                        });
                      }}
                    >
                      <SelectTrigger aria-label={`Part for line ${i + 1}`}>
                        <SelectValue placeholder="Select part" />
                      </SelectTrigger>
                      <SelectContent>
                        {parts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} · {p.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {it.sku && (
                      <p className="num text-[11px] text-muted-foreground">SKU {it.sku}</p>
                    )}
                    <FieldError msg={errors[`p${i}`]} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) =>
                        updateItem(i, { qty: Math.max(0, Math.floor(Number(e.target.value))) })
                      }
                      aria-label={`Quantity line ${i + 1}`}
                    />
                    <FieldError msg={errors[`q${i}`]} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={it.price}
                      onChange={(e) =>
                        updateItem(i, { price: Math.max(0, Number(e.target.value)) })
                      }
                      aria-label={`Price line ${i + 1}`}
                    />
                    <FieldError msg={errors[`r${i}`]} />
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                    <span className="num text-sm font-semibold sm:mt-6">
                      {inr(it.qty * it.price)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove line ${i + 1}`}
                      onClick={() =>
                        setPo((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <FieldError msg={errors["items"]} />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPo((p) => ({
                    ...p,
                    items: [...p.items, { partId: "", name: "", sku: "", qty: 10, price: 0 }],
                  }))
                }
              >
                <Plus className="size-4" /> Add part
              </Button>
              <Totals sub={totals.sub} tax={totals.tax} total={totals.total} rate={po.taxRate} />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="po-id">PO number *</Label>
                <Input
                  id="po-id"
                  className="num"
                  value={po.id}
                  onChange={(e) => setPo({ ...po, id: e.target.value })}
                  maxLength={30}
                />
                <FieldError msg={errors["id"]} />
              </div>
              <div className="space-y-2">
                <Label>Payment terms</Label>
                <Select value={po.terms} onValueChange={(v) => setPo({ ...po, terms: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERMS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-date">Order date *</Label>
                <Input
                  id="po-date"
                  type="date"
                  value={po.orderDate}
                  onChange={(e) => setPo({ ...po, orderDate: e.target.value })}
                />
                <FieldError msg={errors["orderDate"]} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-exp">Expected delivery *</Label>
                <Input
                  id="po-exp"
                  type="date"
                  value={po.expectedOn}
                  onChange={(e) => setPo({ ...po, expectedOn: e.target.value })}
                />
                <FieldError msg={errors["expectedOn"]} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="po-notes">Notes</Label>
                <Textarea
                  id="po-notes"
                  rows={3}
                  value={po.notes}
                  onChange={(e) => setPo({ ...po, notes: e.target.value })}
                  maxLength={500}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 rounded-xl border border-border bg-card p-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">Supplier</p>
                  <p className="mt-1 font-medium">{po.supplier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[po.supplier.contact, po.supplier.phone, po.supplier.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {po.supplier.address && (
                    <p className="text-xs text-muted-foreground">{po.supplier.address}</p>
                  )}
                  {po.supplier.gstin && (
                    <p className="num text-xs text-muted-foreground">GSTIN {po.supplier.gstin}</p>
                  )}
                </div>
                <div className="sm:text-right">
                  <p className="num font-semibold">{po.id}</p>
                  <p className="num text-xs text-muted-foreground">
                    Ordered {shortDate(po.orderDate)}
                  </p>
                  <p className="num text-xs text-muted-foreground">
                    Expected {shortDate(po.expectedOn)}
                  </p>
                  <p className="text-xs text-muted-foreground">Terms: {po.terms}</p>
                </div>
              </div>
              <Separator />
              <ul className="space-y-2">
                {po.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-medium">{it.name}</span>{" "}
                      <span className="num text-xs text-muted-foreground">
                        {it.sku} · {it.qty} × {inr(it.price)}
                      </span>
                    </span>
                    <span className="num shrink-0 font-medium">{inr(it.qty * it.price)}</span>
                  </li>
                ))}
              </ul>
              <Totals sub={totals.sub} tax={totals.tax} total={totals.total} rate={po.taxRate} />
              {po.notes && <p className="text-xs text-muted-foreground">Notes: {po.notes}</p>}
            </div>
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
              <Button onClick={next}>
                Next <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={() => finish("create")} disabled={!!saving}>
                {saving === "create" && <Loader2 className="size-4 animate-spin" />} Create purchase
                order
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Totals({
  sub,
  tax,
  total,
  rate,
  discount,
}: {
  sub: number;
  tax: number;
  total: number;
  rate: number;
  discount?: number;
}) {
  return (
    <div className="ml-auto w-full max-w-64 space-y-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="num">{inr(sub)}</span>
      </div>
      {!!discount && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Discount</span>
          <span className="num">−{inr(discount)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-muted-foreground">GST ({rate}%)</span>
        <span className="num">{inr(tax)}</span>
      </div>
      <Separator />
      <div className="flex justify-between text-base font-semibold">
        <span>Total</span>
        <span className="num">{inr(total)}</span>
      </div>
    </div>
  );
}
