/**
 * Live data layer: shared types plus in-memory snapshots loaded from Supabase.
 * Arrays are filled by loadAll() after admin sign-in; pages read them directly.
 *
 */

export type BookingStatus =
  "Pending" | "Confirmed" | "Assigned" | "In Progress" | "Completed" | "Cancelled" | "Rescheduled";

export type Urgency = "Emergency" | "Priority" | "Standard";

export interface Technician {
  id: string;
  name: string;
  phone: string;
  email: string;
  photo: string;
  expertise: string[];
  availability: "Available" | "On Job" | "Off Duty";
  serviceAreas: string[];
  status: "Active" | "Inactive";
  rating: number;
  completedJobs: number;
  earnings: number;
  joinedOn: string;
  onTimeRate: number;
}

export interface Booking {
  id: string;
  customerId: string;
  customer: string;
  phone: string;
  serviceId: string;
  service: string;
  location: string;
  pincode: string;
  technicianId: string | null;
  technician: string | null;
  scheduledAt: string;
  urgency: Urgency;
  status: BookingStatus;
  amount: number;
  notes: string;
  parts: { name: string; qty: number }[];
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number; // minutes
  active: boolean;
  bookings: number;
  revenue: number;
}

export interface ServiceArea {
  id: string;
  city: string;
  district: string;
  pincodes: string[];
  technicians: number;
  activeBookings: number;
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  totalBookings: number;
  completedJobs: number;
  totalSpending: number;
  lastBooking: string;
  status: "Active" | "Dormant" | "Blocked";
  since: string;
  notes: { id: string; text: string; author: string; at: string }[];
}

export interface SparePart {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  threshold: number;
  purchasePrice: number;
  sellingPrice: number;
  supplier: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  partId: string;
  part: string;
  type: "Purchase" | "Consumed" | "Return" | "Damage";
  qty: number;
  reference: string;
  at: string;
}

export interface Invoice {
  id: string;
  bookingId: string;
  customerId: string;
  customer: string;
  issuedOn: string;
  dueOn: string;
  status: "Paid" | "Pending" | "Overdue" | "Refunded" | "Draft";
  method: "UPI" | "Cash" | "Card" | "Net Banking";
  items: { label: string; qty: number; rate: number }[];
  taxRate: number;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  kind: "booking" | "payment" | "technician" | "inventory" | "customer";
}

/* ------------------------------------------------------------------ */
/* Live snapshots (filled from Supabase by loadAll)                     */
/* ------------------------------------------------------------------ */

import { supabase, AVATAR_BUCKET } from "@/lib/supabase";
import type { PurchaseOrder } from "@/components/spare-parts/purchase-order-dialog";

export const technicians: Technician[] = [];
export const services: Service[] = [];
export const serviceAreas: ServiceArea[] = [];
export const customers: Customer[] = [];
export const bookings: Booking[] = [];
export const spareParts: SparePart[] = [];
export const stockMovements: StockMovement[] = [];
export const invoices: Invoice[] = [];
export const purchaseOrders: PurchaseOrder[] = [];
export const activity: ActivityItem[] = [];
export const bookingTrend: { month: string; bookings: number; completed: number }[] = [];
export const revenueTrend: { month: string; services: number; parts: number }[] = [];
export const cancellationTrend: { month: string; cancelled: number; rescheduled: number }[] = [];
export const notifications: {
  id: string;
  title: string;
  body: string;
  at: string;
  unread: boolean;
  kind: "urgent" | "warning" | "success" | "info";
}[] = [];

export const admin = {
  userId: "",
  name: "",
  role: "",
  email: "",
  phone: "",
  bio: "",
  photo: null as string | null,
  avatarPath: null as string | null,
  business: {
    name: "SOHAN PIPELINES",
    gstin: "",
    address: "",
    since: "",
    supportEmail: "",
    supportPhone: "",
  },
};

/** Internal UUIDs keyed by the human-readable IDs the UI shows. */
export const uuid = {
  booking: new Map<string, string>(),
  invoice: new Map<string, string>(),
  po: new Map<string, string>(),
  supplier: new Map<string, string>(),
};
export const suppliers: {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
}[] = [];

/** Settings stored in the admin_settings table (key/value JSON), shared across devices. */
export const adminSettings: Record<string, unknown> = {};
export const technicianRatings: {
  id: string;
  bookingId: string;
  technicianId: string;
  rating: number;
  comment: string;
  at: string;
}[] = [];

export const invoiceTotal = (inv: Invoice) => {
  const sub = inv.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax = Math.round((sub * inv.taxRate) / 100);
  return { sub, tax, total: sub + tax };
};

/* ---------------- mapping helpers ---------------- */

const cap = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const STATUSES: BookingStatus[] = [
  "Pending",
  "Confirmed",
  "Assigned",
  "In Progress",
  "Completed",
  "Cancelled",
  "Rescheduled",
];
export const statusFromDb = (s: string | null): BookingStatus => {
  const c = cap(s ?? "pending") as BookingStatus;
  return STATUSES.includes(c) ? c : "Pending";
};
export const statusToDb = (s: BookingStatus) => s.toLowerCase().replace(/ /g, "_");
const urgencyFromDb = (u: string | null): Urgency => {
  const v = (u ?? "").toLowerCase();
  if (v.startsWith("emerg")) return "Emergency";
  if (v.startsWith("prior") || v === "urgent" || v === "high") return "Priority";
  return "Standard";
};
const minutes = (d: string | null) => {
  if (!d) return 60;
  const n = parseFloat(d);
  if (Number.isNaN(n)) return 60;
  return /h/i.test(d) ? Math.round(n * 60) : Math.round(n);
};
const invStatus = (s: string): Invoice["status"] => {
  const c = cap(s);
  return (
    ["Paid", "Pending", "Overdue", "Refunded", "Draft"].includes(c) ? c : "Pending"
  ) as Invoice["status"];
};
const fill = <T>(arr: T[], rows: T[]) => {
  arr.splice(0, arr.length, ...rows);
};
const must = <T>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return (r.data ?? []) as T;
};

/* ---------------- load everything ---------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function loadAll(userId: string) {
  const [b, c, s, a, t, sp, sup, mv, inv, po, hist, prof, ratings, bParts, settings, doneHist] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("*, booking_locations(formatted_address, city, district, pincode)")
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("services").select("*").order("name"),
      supabase.from("service_areas").select("*").order("district"),
      supabase.from("technicians").select("*").order("full_name"),
      supabase.from("spare_parts").select("*").order("name"),
      supabase.from("suppliers").select("*").order("name"),
      supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .order("created_at", { ascending: false }),
      supabase
        .from("purchase_orders")
        .select("*, purchase_order_items(*)")
        .order("created_at", { ascending: false }),
      supabase
        .from("booking_status_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("admin_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("technician_ratings").select("*"),
      supabase.from("booking_parts").select("*"),
      supabase.from("admin_settings").select("*"),
      supabase
        .from("booking_status_history")
        .select("booking_id, created_at")
        .eq("status", "completed"),
    ]);
  const bRows = must<any[]>(b, "bookings"),
    cRows = must<any[]>(c, "customers"),
    sRows = must<any[]>(s, "services");
  const aRows = must<any[]>(a, "service areas"),
    tRows = must<any[]>(t, "technicians"),
    spRows = must<any[]>(sp, "spare parts");
  const supRows = must<any[]>(sup, "suppliers"),
    mvRows = must<any[]>(mv, "stock movements"),
    invRows = must<any[]>(inv, "invoices");
  const poRows = must<any[]>(po, "purchase orders"),
    hRows = must<any[]>(hist, "booking history");
  const ratingRows = must<any[]>(ratings, "technician ratings"),
    bpRows = must<any[]>(bParts, "booking parts");
  const settingsRows = must<any[]>(settings, "settings"),
    doneRows = must<any[]>(doneHist, "completion history");
  if (prof.error) throw new Error(`profile: ${prof.error.message}`);

  const custById = new Map(cRows.map((x) => [x.id, x]));
  const srvById = new Map(sRows.map((x) => [x.id, x]));
  const techById = new Map(tRows.map((x) => [x.id, x]));
  const supById = new Map(supRows.map((x) => [x.id, x]));
  const partById = new Map(spRows.map((x) => [x.id, x]));

  uuid.booking.clear();
  uuid.invoice.clear();
  uuid.po.clear();
  uuid.supplier.clear();

  fill(
    bookings,
    bRows.map((r): Booking => {
      const loc = Array.isArray(r.booking_locations) ? r.booking_locations[0] : r.booking_locations;
      const cu = custById.get(r.customer_id),
        sv = srvById.get(r.service_id),
        te = techById.get(r.technician_id);
      const display = r.booking_id ?? r.id;
      uuid.booking.set(display, r.id);
      return {
        id: display,
        customerId: r.customer_id ?? "",
        customer: cu?.full_name ?? "Unknown customer",
        phone: cu?.phone ?? "",
        serviceId: r.service_id ?? "",
        service: sv?.name ?? "Unknown service",
        location: loc?.formatted_address || r.address || loc?.city || "",
        pincode: loc?.pincode ?? "",
        technicianId: r.technician_id ?? null,
        technician: te?.full_name ?? null,
        scheduledAt: r.preferred_date
          ? new Date(`${r.preferred_date}T09:00:00+05:30`).toISOString()
          : r.created_at,
        urgency: urgencyFromDb(r.urgency),
        status: statusFromDb(r.status),
        amount: Number(sv?.price ?? 0),
        notes: r.additional_notes ?? "",
        parts: [],
      };
    }),
  );
  const bookingByUuid = new Map(bookings.map((x) => [uuid.booking.get(x.id)!, x]));

  // Parts used on each booking
  bpRows.forEach((r) => {
    const bk = bookingByUuid.get(r.booking_id);
    const part = partById.get(r.spare_part_id);
    if (bk) bk.parts.push({ name: part?.name ?? "Removed part", qty: Number(r.quantity) });
  });

  fill(
    invoices,
    invRows.map((r): Invoice & { notes?: string } => {
      uuid.invoice.set(r.invoice_number, r.id);
      const cu = custById.get(r.customer_id);
      return {
        id: r.invoice_number,
        bookingId: bookingByUuid.get(r.booking_id)?.id ?? "",
        customerId: r.customer_id ?? "",
        customer: cu?.full_name ?? "Unknown customer",
        issuedOn: r.issue_date ?? r.created_at.slice(0, 10),
        dueOn: r.due_date ?? r.issue_date ?? r.created_at.slice(0, 10),
        status:
          r.status === "pending" && r.due_date && r.due_date < new Date().toISOString().slice(0, 10)
            ? "Overdue"
            : invStatus(r.status),
        method: (r.payment_method ?? "UPI") as Invoice["method"],
        taxRate: Number(r.tax_rate ?? 18),
        items: (r.invoice_items ?? []).map((i: any) => ({
          label: i.description,
          qty: Number(i.quantity),
          rate: Number(i.unit_price),
        })),
        notes: r.notes ?? "",
      };
    }),
  );
  const billed = invoices.filter((i) => i.status === "Paid");

  fill(
    customers,
    cRows.map((r): Customer => {
      const mine = bookings.filter((x) => x.customerId === r.id);
      return {
        id: r.id,
        name: r.full_name ?? "Unnamed",
        phone: r.phone ?? "",
        email: r.email ?? "",
        location: mine[0]?.location ?? "",
        totalBookings: mine.length,
        completedJobs: mine.filter((x) => x.status === "Completed").length,
        totalSpending: billed
          .filter((i) => i.customerId === r.id)
          .reduce((s, i) => s + invoiceTotal(i).total, 0),
        lastBooking: mine[0]?.scheduledAt.slice(0, 10) ?? r.created_at.slice(0, 10),
        status: mine.length ? "Active" : "Dormant",
        since: r.created_at.slice(0, 10),
        notes: [],
      };
    }),
  );

  fill(
    services,
    sRows.map((r): Service => {
      const mine = bookings.filter((x) => x.serviceId === r.id);
      return {
        id: r.id,
        name: r.name,
        category: r.pricing_label || "General",
        description: r.description ?? "",
        price: Number(r.price ?? 0),
        duration: minutes(r.duration),
        active: r.active !== false,
        bookings: mine.length,
        revenue: billed.reduce(
          (s, i) =>
            s +
            i.items.filter((it) => it.label === r.name).reduce((a, it) => a + it.qty * it.rate, 0),
          0,
        ),
      };
    }),
  );

  // Ratings per technician + per-booking lookup
  fill(
    technicianRatings,
    ratingRows.map((r) => ({
      id: r.id,
      bookingId: bookingByUuid.get(r.booking_id)?.id ?? "",
      technicianId: r.technician_id,
      rating: Number(r.rating),
      comment: r.comment ?? "",
      at: r.created_at,
    })),
  );
  const ratingsByTech = new Map<string, number[]>();
  ratingRows.forEach((r) => {
    const list = ratingsByTech.get(r.technician_id) ?? [];
    list.push(Number(r.rating));
    ratingsByTech.set(r.technician_id, list);
  });
  // Completion timestamp per booking (first time it reached "completed")
  const completedAt = new Map<string, string>();
  doneRows.forEach((r) => {
    const prev = completedAt.get(r.booking_id);
    if (!prev || r.created_at < prev) completedAt.set(r.booking_id, r.created_at);
  });

  fill(
    technicians,
    tRows.map((r): Technician => {
      const mine = bookings.filter((x) => x.technicianId === r.id);
      const done = mine.filter((x) => x.status === "Completed");
      const techRatings = ratingsByTech.get(r.id) ?? [];
      const onTime = done.filter((x) => {
        const at = completedAt.get(uuid.booking.get(x.id)!);
        return at && at.slice(0, 10) <= x.scheduledAt.slice(0, 10);
      }).length;
      return {
        id: r.id,
        name: r.full_name,
        phone: r.phone ?? "",
        email: r.email ?? "",
        photo: "",
        expertise: r.skills ?? [],
        availability: !r.active
          ? "Off Duty"
          : mine.some((x) => x.status === "In Progress")
            ? "On Job"
            : "Available",
        serviceAreas: Array.from(
          new Set(mine.map((x) => x.location.split(",").pop()!.trim()).filter(Boolean)),
        ).slice(0, 3),
        status: r.active ? "Active" : "Inactive",
        rating: techRatings.length
          ? Math.round((techRatings.reduce((s, v) => s + v, 0) / techRatings.length) * 10) / 10
          : 0,
        completedJobs: done.length,
        earnings: done.reduce((s, x) => s + x.amount, 0),
        joinedOn: r.created_at.slice(0, 10),
        onTimeRate: done.length ? Math.round((onTime / done.length) * 100) : 0,
      };
    }),
  );

  fill(
    serviceAreas,
    aRows.map((r): ServiceArea => ({
      id: r.id,
      city: r.locality || r.block || r.subdivision || r.district,
      district: r.district ?? "",
      pincodes: r.pincode ? [r.pincode] : [],
      technicians: 0,
      activeBookings: bookings.filter(
        (x) =>
          r.pincode && x.pincode === r.pincode && !["Completed", "Cancelled"].includes(x.status),
      ).length,
      active: r.active !== false,
    })),
  );

  fill(
    suppliers,
    supRows.map((r) => {
      uuid.supplier.set(r.name, r.id);
      return {
        id: r.id,
        name: r.name,
        contact: r.contact_person ?? "",
        phone: r.phone ?? "",
        email: r.email ?? "",
        address: r.address ?? "",
        gstin: r.gstin ?? "",
      };
    }),
  );

  fill(
    spareParts,
    spRows.map((r): SparePart => ({
      id: r.id,
      name: r.name,
      sku: r.sku ?? "",
      category: r.category || "General",
      stock: r.stock,
      threshold: r.reorder_level,
      purchasePrice: Number(r.purchase_price),
      sellingPrice: Number(r.selling_price),
      supplier: supById.get(r.supplier_id)?.name ?? "—",
      updatedAt: r.created_at.slice(0, 10),
    })),
  );

  const mvType = (reason: string | null, change: number): StockMovement["type"] => {
    const v = (reason ?? "").toLowerCase();
    if (v.includes("damage")) return "Damage";
    if (v.includes("return")) return "Return";
    if (v.includes("consum") || change < 0) return "Consumed";
    return "Purchase";
  };
  fill(
    stockMovements,
    mvRows.map((r): StockMovement => ({
      id: r.id,
      partId: r.spare_part_id,
      part: partById.get(r.spare_part_id)?.name ?? "Removed part",
      type: mvType(r.reason, r.change),
      qty: Math.abs(r.change),
      reference: r.reference ?? "",
      at: r.created_at,
    })),
  );

  fill(
    purchaseOrders,
    poRows.map((r): PurchaseOrder => {
      uuid.po.set(r.po_number, r.id);
      const su = supById.get(r.supplier_id);
      return {
        id: r.po_number,
        supplier: {
          name: su?.name ?? "",
          contact: su?.contact_person ?? "",
          phone: su?.phone ?? "",
          email: su?.email ?? "",
          address: su?.address ?? "",
          gstin: su?.gstin ?? "",
        },
        items: (r.purchase_order_items ?? []).map((i: any) => {
          const p = partById.get(i.spare_part_id);
          return {
            partId: i.spare_part_id ?? "",
            name: p?.name ?? "Removed part",
            sku: p?.sku ?? "",
            qty: i.quantity,
            price: Number(i.unit_price),
          };
        }),
        taxRate: Number(r.tax_rate ?? 18),
        orderDate: r.order_date ?? r.created_at.slice(0, 10),
        expectedOn: r.expected_date ?? "",
        terms: r.payment_terms ?? "",
        notes: r.notes ?? "",
        status: (r.status === "received"
          ? "Received"
          : r.status === "ordered"
            ? "Ordered"
            : "Draft") as PurchaseOrder["status"],
      };
    }),
  );

  fill(
    activity,
    hRows.map((r): ActivityItem => {
      const bk = bookingByUuid.get(r.booking_id);
      return {
        id: r.id,
        actor: bk?.customer ?? "Booking",
        action: `moved to ${statusFromDb(r.status).toLowerCase()}`,
        target: `${bk?.id ?? "booking"}${r.note ? ` · ${r.note}` : ""}`,
        at: r.created_at,
        kind: "booking",
      };
    }),
  );

  // 12-month trends from real records
  const months: { key: string; month: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      month: d.toLocaleString("en-US", { month: "short" }),
    });
  }
  const partNames = new Set(spareParts.map((p) => p.name));
  fill(
    bookingTrend,
    months.map((m) => {
      const inM = bookings.filter((x) => x.scheduledAt.slice(0, 7) === m.key);
      return {
        month: m.month,
        bookings: inM.length,
        completed: inM.filter((x) => x.status === "Completed").length,
      };
    }),
  );
  fill(
    revenueTrend,
    months.map((m) => {
      let svc = 0,
        parts = 0;
      billed
        .filter((i) => i.issuedOn.slice(0, 7) === m.key)
        .forEach((i) =>
          i.items.forEach((it) => {
            if (partNames.has(it.label)) parts += it.qty * it.rate;
            else svc += it.qty * it.rate;
          }),
        );
      return { month: m.month, services: svc, parts };
    }),
  );
  fill(
    cancellationTrend,
    months.slice(-6).map((m) => {
      const inM = bookings.filter((x) => x.scheduledAt.slice(0, 7) === m.key);
      return {
        month: m.month,
        cancelled: inM.filter((x) => x.status === "Cancelled").length,
        rescheduled: inM.filter((x) => x.status === "Rescheduled").length,
      };
    }),
  );

  const notes: typeof notifications = [];
  bookings
    .filter((x) => x.status === "Pending" && x.urgency === "Emergency")
    .slice(0, 4)
    .forEach((x) =>
      notes.push({
        id: `nb-${x.id}`,
        title: "Emergency booking pending",
        body: `${x.id} · ${x.customer} · ${x.service}`,
        at: x.scheduledAt,
        unread: true,
        kind: "urgent",
      }),
    );
  spareParts
    .filter((p) => p.stock <= p.threshold)
    .slice(0, 4)
    .forEach((p) =>
      notes.push({
        id: `ns-${p.id}`,
        title: "Low stock alert",
        body: `${p.name} is at ${p.stock} (reorder at ${p.threshold}).`,
        at: new Date().toISOString(),
        unread: true,
        kind: "warning",
      }),
    );
  invoices
    .filter((i) => i.status === "Overdue")
    .slice(0, 3)
    .forEach((i) =>
      notes.push({
        id: `ni-${i.id}`,
        title: "Invoice overdue",
        body: `${i.id} · ${i.customer}`,
        at: i.dueOn,
        unread: false,
        kind: "warning",
      }),
    );
  fill(notifications, notes);

  // Shared settings (single admin_settings row with jsonb columns)
  Object.keys(adminSettings).forEach((k) => delete adminSettings[k]);
  const sRow = settingsRows[0] as
    | { bookings?: unknown; billing?: unknown; security?: unknown; notifications?: unknown }
    | undefined;
  if (sRow) {
    if (sRow.bookings && Object.keys(sRow.bookings as object).length)
      adminSettings["booking"] = sRow.bookings;
    if (sRow.billing && Object.keys(sRow.billing as object).length)
      adminSettings["billing"] = sRow.billing;
    if (sRow.security && Object.keys(sRow.security as object).length)
      adminSettings["security"] = sRow.security;
    if (sRow.notifications && Object.keys(sRow.notifications as object).length)
      adminSettings["notif"] = sRow.notifications;
  }

  const p = prof.data as any;
  admin.userId = userId;
  admin.name = p?.full_name ?? "";
  admin.role = p?.designation ?? "Admin";
  admin.email = p?.email ?? "";
  admin.phone = p?.phone ?? "";
  admin.bio = p?.bio ?? "";
  admin.avatarPath = p?.avatar_path ?? null;
  admin.photo = null;
  if (admin.avatarPath) {
    const { data } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(admin.avatarPath, 60 * 60 * 24);
    admin.photo = data?.signedUrl ?? null;
  }
  admin.business = {
    name: p?.business_name ?? "SOHAN PIPELINES",
    gstin: p?.gstin ?? "",
    address: p?.address ?? "",
    since: "",
    supportEmail: p?.support_email ?? "",
    supportPhone: p?.support_phone ?? "",
  };
}
