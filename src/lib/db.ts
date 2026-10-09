/* All admin write operations. Each throws a readable Error on failure. */
import { supabase, AVATAR_BUCKET } from "@/lib/supabase";
import {
  admin,
  loadAll,
  statusToDb,
  uuid,
  type BookingStatus,
  type Invoice,
} from "@/lib/mock-data";
import type { PurchaseOrder } from "@/components/spare-parts/purchase-order-dialog";

const ok = <T extends { error: { message: string } | null }>(r: T, what: string) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r;
};
const bookingId = (display: string) => {
  const id = uuid.booking.get(display);
  if (!id) throw new Error(`Booking ${display} not found`);
  return id;
};

export const refresh = () => loadAll(admin.userId);

/* Bookings */
export async function updateBooking(
  display: string,
  patch: {
    status?: BookingStatus | undefined;
    technicianId?: string | null | undefined;
    notes?: string | undefined;
    scheduledAt?: string | undefined;
  },
  note?: string,
) {
  const id = bookingId(display);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) row["status"] = statusToDb(patch.status);
  if (patch.technicianId !== undefined) row["technician_id"] = patch.technicianId;
  if (patch.notes !== undefined) row["additional_notes"] = patch.notes;
  if (patch.scheduledAt) row["preferred_date"] = patch.scheduledAt.slice(0, 10);
  ok(await supabase.from("bookings").update(row).eq("id", id), "Update booking");
  if (patch.status)
    ok(
      await supabase
        .from("booking_status_history")
        .insert({ booking_id: id, status: statusToDb(patch.status), note: note ?? null }),
      "Record history",
    );
}
export async function addBookingNote(display: string, note: string) {
  ok(
    await supabase.from("booking_notes").insert({ booking_id: bookingId(display), note }),
    "Add note",
  );
}
export async function listBookingHistory(display: string) {
  const id = uuid.booking.get(display);
  if (!id) return { history: [], notes: [] };
  const [h, n] = await Promise.all([
    supabase.from("booking_status_history").select("*").eq("booking_id", id).order("created_at"),
    supabase
      .from("booking_notes")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", { ascending: false }),
  ]);
  ok(h, "Load history");
  ok(n, "Load notes");
  return { history: h.data ?? [], notes: n.data ?? [] };
}

/* Services */
export async function saveService(s: {
  id?: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  active: boolean;
}) {
  const row = {
    name: s.name,
    pricing_label: s.category,
    description: s.description,
    price: s.price,
    duration: `${s.duration} min`,
    active: s.active,
  };
  if (s.id) ok(await supabase.from("services").update(row).eq("id", s.id), "Save service");
  else
    ok(
      await supabase.from("services").insert({
        ...row,
        slug: s.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      }),
      "Create service",
    );
}
export async function setServiceActive(id: string, active: boolean) {
  ok(await supabase.from("services").update({ active }).eq("id", id), "Update service");
}
export async function deleteService(id: string) {
  ok(await supabase.from("services").delete().eq("id", id), "Delete service");
}

/* Service areas */
export async function addServiceArea(a: { city: string; district: string; pincodes: string[] }) {
  const rows = (a.pincodes.length ? a.pincodes : [""]).map((p) => ({
    locality: a.city,
    district: a.district,
    pincode: p || null,
    active: true,
  }));
  ok(await supabase.from("service_areas").insert(rows), "Add area");
}
export async function setAreaActive(id: string, active: boolean) {
  ok(await supabase.from("service_areas").update({ active }).eq("id", id), "Update area");
}

/* Technicians */
export async function addTechnician(t: {
  name: string;
  phone: string;
  email: string;
  skills: string[];
}) {
  ok(
    await supabase
      .from("technicians")
      .insert({ full_name: t.name, phone: t.phone, email: t.email || null, skills: t.skills }),
    "Add technician",
  );
}
export async function setTechnicianActive(id: string, active: boolean) {
  ok(await supabase.from("technicians").update({ active }).eq("id", id), "Update technician");
}

/* Technician ratings */
export async function saveRating(
  bookingDisplay: string,
  technicianId: string,
  rating: number,
  comment: string,
) {
  const booking_id = bookingId(bookingDisplay);
  const existing = await supabase
    .from("technician_ratings")
    .select("id")
    .eq("booking_id", booking_id)
    .maybeSingle();
  if (existing.data) {
    ok(
      await supabase
        .from("technician_ratings")
        .update({ rating, comment: comment || null })
        .eq("id", existing.data.id),
      "Save rating",
    );
  } else {
    ok(
      await supabase
        .from("technician_ratings")
        .insert({ booking_id, technician_id: technicianId, rating, comment: comment || null }),
      "Save rating",
    );
  }
}

/* Parts used on a booking (also deducts stock and logs the movement) */
export async function addBookingPart(
  bookingDisplay: string,
  partId: string,
  partName: string,
  currentStock: number,
  qty: number,
) {
  const booking_id = bookingId(bookingDisplay);
  ok(
    await supabase
      .from("booking_parts")
      .insert({ booking_id, spare_part_id: partId, quantity: qty }),
    "Add part",
  );
  ok(
    await supabase
      .from("spare_parts")
      .update({ stock: currentStock - qty })
      .eq("id", partId),
    "Update stock",
  );
  ok(
    await supabase.from("stock_movements").insert({
      spare_part_id: partId,
      change: -qty,
      reason: "consumed",
      reference: `Used on ${bookingDisplay}`,
    }),
    "Log movement",
  );
  void partName;
}

/* Shared settings (single admin_settings row with jsonb columns) */
export async function saveSettings(patch: {
  booking?: unknown;
  billing?: unknown;
  security?: unknown;
  notif?: unknown;
}) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.booking !== undefined) row["bookings"] = patch.booking;
  if (patch.billing !== undefined) row["billing"] = patch.billing;
  if (patch.security !== undefined) row["security"] = patch.security;
  if (patch.notif !== undefined) row["notifications"] = patch.notif;
  ok(await supabase.from("admin_settings").update(row).eq("id", true), "Save settings");
}

/* Spare parts */
export async function addSparePart(p: {
  name: string;
  sku: string;
  category: string;
  stock: number;
  threshold: number;
  purchasePrice: number;
  sellingPrice: number;
  supplier: string;
}) {
  const supplier_id = p.supplier
    ? await ensureSupplier({
        name: p.supplier,
        contact: "",
        phone: "",
        email: "",
        address: "",
        gstin: "",
      })
    : null;
  ok(
    await supabase.from("spare_parts").insert({
      name: p.name,
      sku: p.sku || null,
      category: p.category,
      stock: p.stock,
      reorder_level: p.threshold,
      purchase_price: p.purchasePrice,
      selling_price: p.sellingPrice,
      supplier_id,
    }),
    "Add part",
  );
}
export async function restockPart(partId: string, current: number, qty: number) {
  ok(
    await supabase
      .from("spare_parts")
      .update({ stock: current + qty })
      .eq("id", partId),
    "Restock",
  );
  ok(
    await supabase.from("stock_movements").insert({
      spare_part_id: partId,
      change: qty,
      reason: "restock",
      reference: "Manual restock",
    }),
    "Log movement",
  );
}

async function ensureSupplier(s: PurchaseOrder["supplier"]) {
  const existing = uuid.supplier.get(s.name.trim());
  const row = {
    name: s.name.trim(),
    contact_person: s.contact || null,
    phone: s.phone || null,
    email: s.email || null,
    address: s.address || null,
    gstin: s.gstin || null,
  };
  if (existing) {
    ok(await supabase.from("suppliers").update(row).eq("id", existing), "Update supplier");
    return existing;
  }
  const r = ok(
    await supabase.from("suppliers").insert(row).select("id").single(),
    "Create supplier",
  );
  const id = (r.data as { id: string }).id;
  uuid.supplier.set(row.name, id);
  return id;
}

/* Purchase orders */
export async function savePurchaseOrder(po: PurchaseOrder, previousNumber?: string) {
  const supplier_id = await ensureSupplier(po.supplier);
  const row = {
    po_number: po.id,
    supplier_id,
    status: po.status.toLowerCase(),
    order_date: po.orderDate || null,
    expected_date: po.expectedOn || null,
    payment_terms: po.terms || null,
    notes: po.notes || null,
    tax_rate: po.taxRate,
  };
  let id = previousNumber ? uuid.po.get(previousNumber) : undefined;
  if (id) {
    ok(await supabase.from("purchase_orders").update(row).eq("id", id), "Save purchase order");
    ok(
      await supabase.from("purchase_order_items").delete().eq("purchase_order_id", id),
      "Replace items",
    );
  } else {
    const r = ok(
      await supabase.from("purchase_orders").insert(row).select("id").single(),
      "Create purchase order",
    );
    id = (r.data as { id: string }).id;
  }
  if (po.items.length) {
    ok(
      await supabase.from("purchase_order_items").insert(
        po.items.map((i) => ({
          purchase_order_id: id,
          spare_part_id: i.partId || null,
          quantity: i.qty,
          unit_price: i.price,
        })),
      ),
      "Save items",
    );
  }
}
export async function receivePurchaseOrder(number: string) {
  const id = uuid.po.get(number);
  if (!id) throw new Error(`${number} not found`);
  ok(await supabase.rpc("receive_purchase_order", { _po: id }), "Receive order");
}

/* Invoices */
export async function saveInvoice(
  inv: Invoice & { notes?: string },
  status: "draft" | "pending" | "paid",
) {
  const row = {
    invoice_number: inv.id,
    customer_id: inv.customerId || null,
    booking_id: inv.bookingId ? (uuid.booking.get(inv.bookingId) ?? null) : null,
    status,
    payment_method: inv.method,
    issue_date: inv.issuedOn,
    due_date: inv.dueOn,
    notes: inv.notes || null,
    tax_rate: inv.taxRate,
  };
  let id = uuid.invoice.get(inv.id);
  if (id) {
    ok(await supabase.from("invoices").update(row).eq("id", id), "Save invoice");
    ok(await supabase.from("invoice_items").delete().eq("invoice_id", id), "Replace items");
  } else {
    const r = ok(
      await supabase.from("invoices").insert(row).select("id").single(),
      "Create invoice",
    );
    id = (r.data as { id: string }).id;
  }
  if (inv.items.length) {
    ok(
      await supabase.from("invoice_items").insert(
        inv.items.map((i) => ({
          invoice_id: id,
          description: i.label,
          quantity: i.qty,
          unit_price: i.rate,
        })),
      ),
      "Save items",
    );
  }
}
export async function setInvoiceStatus(number: string, status: "paid" | "pending" | "refunded") {
  const id = uuid.invoice.get(number);
  if (!id) throw new Error(`${number} not found`);
  ok(await supabase.from("invoices").update({ status }).eq("id", id), "Update invoice");
}

/* Profile */
export async function saveProfile(
  patch: Partial<{
    full_name: string;
    designation: string;
    email: string;
    phone: string;
    bio: string;
    business_name: string;
    gstin: string;
    address: string;
    support_email: string;
    support_phone: string;
    avatar_path: string | null;
  }>,
) {
  ok(
    await supabase
      .from("admin_profiles")
      .upsert({ user_id: admin.userId, ...patch, updated_at: new Date().toISOString() }),
    "Save profile",
  );
}
export async function uploadAvatar(file: File) {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${admin.userId}/avatar-${Date.now()}.${ext}`;
  ok(
    await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true }),
    "Upload photo",
  );
  const old = admin.avatarPath;
  await saveProfile({ avatar_path: path });
  if (old) await supabase.storage.from(AVATAR_BUCKET).remove([old]);
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60 * 24);
  admin.avatarPath = path;
  admin.photo = data?.signedUrl ?? null;
  return admin.photo;
}
export async function removeAvatar() {
  if (admin.avatarPath) await supabase.storage.from(AVATAR_BUCKET).remove([admin.avatarPath]);
  await saveProfile({ avatar_path: null });
  admin.avatarPath = null;
  admin.photo = null;
}

/** Run a write, then reload everything from Supabase. Returns true on success. */
export async function persist(
  fn: () => Promise<unknown>,
  reload: () => Promise<void>,
  okMsg: string,
  toast: { success: (m: string) => void; error: (m: string, o?: { description?: string }) => void },
) {
  try {
    await fn();
    await reload();
    toast.success(okMsg);
    return true;
  } catch (e) {
    toast.error("Couldn't save", { description: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

/* Customer notes (table from setup part 2) */
export async function listCustomerNotes(customerId: string) {
  const r = await supabase
    .from("customer_notes")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (r.error)
    throw new Error(
      r.error.code === "42P01" || /does not exist|schema cache/i.test(r.error.message)
        ? "Customer notes need setup part 2 to be run in Supabase."
        : r.error.message,
    );
  return (r.data ?? []).map(
    (n: { id: string; note: string; author: string | null; created_at: string }) => ({
      id: n.id,
      text: n.note,
      author: n.author ?? "Admin",
      at: n.created_at,
    }),
  );
}
export async function addCustomerNote(customerId: string, note: string) {
  const r = await supabase
    .from("customer_notes")
    .insert({ customer_id: customerId, note, author: admin.name || admin.email });
  if (r.error)
    throw new Error(
      /does not exist|schema cache/i.test(r.error.message)
        ? "Customer notes need setup part 2 to be run in Supabase."
        : r.error.message,
    );
}

/* Cover photo: stored at a fixed path in the existing avatar bucket (no schema change). */
const coverPath = () => `${admin.userId}/cover.jpg`;
export async function getCoverUrl() {
  const { data } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(coverPath(), 60 * 60 * 24);
  return data?.signedUrl ? `${data.signedUrl}&v=${Date.now()}` : null;
}
export async function uploadCover(blob: Blob) {
  ok(
    await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(coverPath(), blob, { contentType: "image/jpeg", upsert: true }),
    "Upload cover",
  );
  return getCoverUrl();
}
export async function removeCover() {
  ok(await supabase.storage.from(AVATAR_BUCKET).remove([coverPath()]), "Remove cover");
}
