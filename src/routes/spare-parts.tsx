import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Download, Package, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { useData } from "@/components/auth/auth-gate";
import {
  purchaseOrders,
  bookings,
  spareParts as seed,
  stockMovements,
  type SparePart,
} from "@/lib/mock-data";
import { dateTime, inr, num, shortDate } from "@/lib/format";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { IndianRupee } from "lucide-react";
import {
  PurchaseOrderDialog,
  poTotals,
  type PurchaseOrder,
} from "@/components/spare-parts/purchase-order-dialog";

export const Route = createFileRoute("/spare-parts")({
  head: () => ({
    meta: [
      { title: "Spare Parts — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content:
          "Plumbing spare-parts inventory: stock levels, low-stock alerts and movement history.",
      },
      { property: "og:title", content: "Spare Parts — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content:
          "Plumbing spare-parts inventory: stock levels, low-stock alerts and movement history.",
      },
    ],
  }),
  component: SparePartsPage,
});

function SparePartsPage() {
  const loading = useMockLoading();
  const [rows, setRows] = useState<SparePart[]>(seed);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [onlyLow, setOnlyLow] = useState(false);
  const [restock, setRestock] = useState<SparePart | null>(null);
  const [qty, setQty] = useState(50);
  const { reload } = useData();
  const [orders] = useState<PurchaseOrder[]>(purchaseOrders);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [tab, setTab] = useState(
    () => (typeof window !== "undefined" && sessionStorage.getItem("sp-tab")) || "inventory",
  );
  const year = new Date().getFullYear();
  const maxPo = orders.reduce((m, o) => Math.max(m, Number(o.id.split("-").pop()) || 0), 0);
  const nextPo = `PO-${year}-${String(maxPo + 1).padStart(4, "0")}`;
  const savePo = async (po: PurchaseOrder) => {
    const ok = await db.persist(
      async () => {
        sessionStorage.setItem("sp-tab", "orders");
        await db.savePurchaseOrder(po, editing?.id);
      },
      reload,
      po.status === "Draft"
        ? `${po.id} saved as draft`
        : `${po.id} created · ${inr(poTotals(po).total)}`,
      toast,
    );
    if (!ok) sessionStorage.removeItem("sp-tab");
  };
  const receivePo = (po: PurchaseOrder) => {
    sessionStorage.setItem("sp-tab", "orders");
    void db.persist(
      () => db.receivePurchaseOrder(po.id),
      reload,
      `${po.id} received · stock updated`,
      toast,
    );
  };

  const categories = Array.from(new Set(rows.map((r) => r.category))).sort();

  const filtered = useMemo(
    () =>
      rows.filter((p) => {
        const q = query.trim().toLowerCase();
        return (
          (!q ||
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.supplier.toLowerCase().includes(q)) &&
          (category === "all" || p.category === category) &&
          (!onlyLow || p.stock <= p.threshold)
        );
      }),
    [rows, query, category, onlyLow],
  );

  const lowStock = rows.filter((p) => p.stock <= p.threshold);
  const stockValue = rows.reduce((s, p) => s + p.stock * p.purchasePrice, 0);
  const retailValue = rows.reduce((s, p) => s + p.stock * p.sellingPrice, 0);
  const partsUsed = bookings.flatMap((b) => b.parts.map((p) => ({ ...p, booking: b })));

  return (
    <>
      <PageHeader
        title="Spare Parts"
        description="Inventory across the Kolkata warehouse and technician vans."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  "spare-parts.csv",
                  rows.map((p) => ({
                    Name: p.name,
                    SKU: p.sku,
                    Category: p.category,
                    Stock: p.stock,
                    Reorder: p.threshold,
                    Purchase: p.purchasePrice,
                    Selling: p.sellingPrice,
                    Supplier: p.supplier,
                  })),
                )
                  ? toast.success("Inventory exported")
                  : toast.info("No parts to export")
              }
            >
              <Download className="size-4" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Add part
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setPoOpen(true);
              }}
            >
              <Plus className="size-4" /> New purchase order
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={loading} label="SKUs tracked" value={String(rows.length)} icon={Boxes} />
        <StatCard
          loading={loading}
          label="Low stock items"
          value={String(lowStock.length)}
          hint="reorder required"
          icon={AlertTriangle}
          accent="copper"
        />
        <StatCard
          loading={loading}
          label="Stock value (cost)"
          value={inr(stockValue, true)}
          icon={IndianRupee}
          accent="info"
        />
        <StatCard
          loading={loading}
          label="Retail value"
          value={inr(retailValue, true)}
          icon={IndianRupee}
          accent="success"
        />
      </div>

      {lowStock.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <p className="min-w-0 text-sm">
            <span className="font-medium">{lowStock.length} items</span> are at or below their
            low-stock threshold: {lowStock.map((p) => p.name).join(", ")}.
          </p>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setOnlyLow(true)}>
            Review
          </Button>
        </div>
      )}

      <PurchaseOrderDialog
        open={poOpen}
        onOpenChange={setPoOpen}
        parts={rows}
        nextId={nextPo}
        initial={editing}
        onSave={savePo}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="movements">Stock movement</TabsTrigger>
          <TabsTrigger value="usage">Used in bookings</TabsTrigger>
          <TabsTrigger value="orders">
            Purchase orders{orders.length ? ` (${orders.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4 space-y-4">
          <div className="surface-panel flex flex-col gap-3 rounded-xl p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search part, SKU or supplier…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={onlyLow ? "default" : "outline"}
                size="default"
                onClick={() => setOnlyLow(!onlyLow)}
              >
                <AlertTriangle className="size-4" /> Low stock
              </Button>
            </div>
          </div>

          <div className="surface-panel record-list overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead className="hidden md:table-cell">SKU</TableHead>
                    <TableHead className="hidden lg:table-cell">Category</TableHead>
                    <TableHead className="min-w-40">Stock</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Purchase</TableHead>
                    <TableHead className="text-right">Selling</TableHead>
                    <TableHead className="hidden xl:table-cell">Supplier</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
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
                          icon={Package}
                          title="No parts found"
                          description="Try another search term or clear the category and low-stock filters."
                          action={
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setQuery("");
                                setCategory("all");
                                setOnlyLow(false);
                              }}
                            >
                              Clear filters
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => {
                      const low = p.stock <= p.threshold;
                      return (
                        <TableRow key={p.id}>
                          <TableCell data-label="Part">
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Updated {shortDate(p.updatedAt)}
                            </p>
                          </TableCell>
                          <TableCell data-label="SKU" className="num hidden text-xs md:table-cell">
                            {p.sku}
                          </TableCell>
                          <TableCell data-label="Category" className="hidden text-sm lg:table-cell">
                            {p.category}
                          </TableCell>
                          <TableCell data-label="Stock">
                            <div className="flex items-center gap-2">
                              <span className="num text-sm font-medium">{num(p.stock)}</span>
                              {low && <StatusBadge value="Low" tone="warning" dot={false} />}
                            </div>
                            <Progress
                              value={Math.min(100, (p.stock / (p.threshold * 3)) * 100)}
                              className="mt-1.5 h-1.5"
                            />
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Threshold {p.threshold}
                            </p>
                          </TableCell>
                          <TableCell
                            data-label="Purchase"
                            className="num hidden text-right text-sm sm:table-cell"
                          >
                            {inr(p.purchasePrice)}
                          </TableCell>
                          <TableCell
                            data-label="Selling"
                            className="num text-right text-sm font-medium"
                          >
                            {inr(p.sellingPrice)}
                          </TableCell>
                          <TableCell
                            data-label="Supplier"
                            className="hidden max-w-48 truncate text-sm text-muted-foreground xl:table-cell"
                          >
                            {p.supplier}
                          </TableCell>
                          <TableCell data-label="Action" className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRestock(p);
                                setQty(Math.max(50, p.threshold * 2 - p.stock));
                              }}
                            >
                              Restock
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <div className="surface-panel overflow-x-auto rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="hidden sm:table-cell">Reference</TableHead>
                  <TableHead className="hidden md:table-cell">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm font-medium">{m.part}</TableCell>
                    <TableCell>
                      <StatusBadge value={m.type} />
                    </TableCell>
                    <TableCell className="num text-right text-sm">
                      {m.type === "Purchase" || m.type === "Return" ? "+" : "−"}
                      {m.qty}
                    </TableCell>
                    <TableCell className="num hidden text-xs text-muted-foreground sm:table-cell">
                      {m.reference}
                    </TableCell>
                    <TableCell className="num hidden text-sm md:table-cell">
                      {dateTime(m.at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <div className="surface-panel overflow-x-auto rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead className="hidden sm:table-cell">Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Technician</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partsUsed.slice(0, 15).map((u, i) => (
                  <TableRow key={`${u.booking.id}-${u.name}-${i}`}>
                    <TableCell className="text-sm font-medium">{u.name}</TableCell>
                    <TableCell className="num text-right text-sm">×{u.qty}</TableCell>
                    <TableCell className="num text-xs">{u.booking.id}</TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">
                      {u.booking.customer}
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {u.booking.technician ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <div className="surface-panel record-list overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="hidden sm:table-cell">Items</TableHead>
                    <TableHead className="hidden md:table-cell">Expected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <EmptyState
                          icon={Package}
                          title="No purchase orders yet"
                          description="Create a purchase order to restock parts from a supplier."
                          action={
                            <Button
                              size="sm"
                              onClick={() => {
                                setEditing(null);
                                setPoOpen(true);
                              }}
                            >
                              <Plus className="size-4" /> New purchase order
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell data-label="Part" className="num text-xs font-medium">
                          {o.id}
                        </TableCell>
                        <TableCell data-label="Supplier" className="text-sm">
                          {o.supplier.name}
                        </TableCell>
                        <TableCell data-label="Items" className="hidden text-sm sm:table-cell">
                          {o.items.reduce((s, i) => s + i.qty, 0)} units · {o.items.length} parts
                        </TableCell>
                        <TableCell
                          data-label="Expected"
                          className="num hidden text-sm md:table-cell"
                        >
                          {shortDate(o.expectedOn)}
                        </TableCell>
                        <TableCell data-label="Status">
                          <StatusBadge
                            value={o.status}
                            tone={
                              o.status === "Received"
                                ? "success"
                                : o.status === "Ordered"
                                  ? "info"
                                  : "neutral"
                            }
                          />
                        </TableCell>
                        <TableCell
                          data-label="Total"
                          className="num text-right text-sm font-semibold"
                        >
                          {inr(poTotals(o).total)}
                        </TableCell>
                        <TableCell data-label="Action" className="text-right">
                          {o.status === "Draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditing(o);
                                setPoOpen(true);
                              }}
                            >
                              Continue
                            </Button>
                          )}
                          {o.status === "Ordered" && (
                            <Button size="sm" variant="outline" onClick={() => receivePo(o)}>
                              Mark received
                            </Button>
                          )}
                          {o.status === "Received" && (
                            <span className="text-xs text-muted-foreground">Stocked</span>
                          )}
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

      <Dialog open={!!restock} onOpenChange={(o) => !o && setRestock(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock {restock?.name}</DialogTitle>
            <DialogDescription>
              Record an inward stock entry against supplier {restock?.supplier}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity received</Label>
            <Input
              id="qty"
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Current stock {restock?.stock} · threshold {restock?.threshold}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestock(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (!restock) return;
                if (!(qty >= 1)) {
                  toast.error("Enter a quantity of at least 1");
                  return;
                }
                const r = restock;
                setBusy(true);
                void db
                  .persist(
                    () => db.restockPart(r.id, r.stock, qty),
                    reload,
                    `${qty} units added to ${r.name}`,
                    toast,
                  )
                  .finally(() => setBusy(false));
              }}
            >
              Add stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AddPartDialog open={addOpen} onOpenChange={setAddOpen} onSaved={reload} />
    </>
  );
}

function AddPartDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const empty = {
    name: "",
    sku: "",
    category: "",
    stock: 0,
    threshold: 5,
    purchasePrice: 0,
    sellingPrice: 0,
    supplier: "",
  };
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);
  const field = (k: keyof typeof empty, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`ap-${k}`}>{label}</Label>
      <Input
        id={`ap-${k}`}
        type={type}
        value={String(f[k])}
        onChange={(e) =>
          setF({ ...f, [k]: type === "number" ? Number(e.target.value) : e.target.value })
        }
      />
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add spare part</DialogTitle>
          <DialogDescription>Create a new item in your inventory.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "Part name")}
          {field("sku", "SKU")}
          {field("category", "Category")}
          {field("supplier", "Supplier")}
          {field("stock", "Opening stock", "number")}
          {field("threshold", "Reorder at", "number")}
          {field("purchasePrice", "Purchase price (₹)", "number")}
          {field("sellingPrice", "Selling price (₹)", "number")}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              if (!f.name.trim()) {
                toast.error("Part name is required");
                return;
              }
              if (f.stock < 0 || f.purchasePrice < 0 || f.sellingPrice < 0) {
                toast.error("Numbers can't be negative");
                return;
              }
              setSaving(true);
              const ok = await db.persist(
                () =>
                  db.addSparePart({
                    ...f,
                    name: f.name.trim(),
                    category: f.category.trim() || "General",
                  }),
                onSaved,
                `${f.name.trim()} added`,
                toast,
              );
              setSaving(false);
              if (ok) {
                setF(empty);
                onOpenChange(false);
              }
            }}
          >
            {saving ? "Saving…" : "Add part"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
