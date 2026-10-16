/* Employees & attendance — reads/writes the employees and employee_attendance tables. */
import { supabase } from "@/lib/supabase";

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";
export const ATTENDANCE_STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half Day" },
  { value: "leave", label: "Leave" },
];
export const statusLabel = (s: AttendanceStatus) =>
  ATTENDANCE_STATUSES.find((x) => x.value === s)?.label ?? s;

export interface Employee {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  designation: string;
  joining_date: string;
  active: boolean;
}
export interface AttendanceRow {
  id: string;
  employee_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  note: string | null;
}

const SETUP_MSG =
  "Employee tables are not set up yet. Run sohan-employees-attendance.sql in Supabase SQL Editor.";
const fail = (e: { message: string; code?: string }, what: string): never => {
  if (e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message))
    throw new Error(SETUP_MSG);
  if (e.code === "23505") throw new Error(`${what}: a record with these details already exists.`);
  throw new Error(`${what}: ${e.message}`);
};

export async function listEmployees(): Promise<Employee[]> {
  const r = await supabase.from("employees").select("*").order("full_name");
  if (r.error) fail(r.error, "Load employees");
  return (r.data ?? []) as Employee[];
}

export async function saveEmployee(e: Omit<Employee, "id"> & { id?: string }) {
  const row = {
    full_name: e.full_name.trim(),
    phone: e.phone.trim(),
    email: e.email?.trim() || null,
    designation: e.designation.trim(),
    joining_date: e.joining_date,
    active: e.active,
  };
  const r = e.id
    ? await supabase.from("employees").update(row).eq("id", e.id)
    : await supabase.from("employees").insert(row);
  if (r.error) fail(r.error, "Save employee");
}

export async function setEmployeeActive(id: string, active: boolean) {
  const r = await supabase.from("employees").update({ active }).eq("id", id);
  if (r.error) fail(r.error, "Update employee");
}

export async function deleteEmployee(id: string) {
  const r = await supabase.from("employees").delete().eq("id", id);
  if (r.error) fail(r.error, "Delete employee");
}

export async function listAttendance(from: string, to: string): Promise<AttendanceRow[]> {
  const r = await supabase
    .from("employee_attendance")
    .select("id, employee_id, attendance_date, status, note")
    .gte("attendance_date", from)
    .lte("attendance_date", to);
  if (r.error) fail(r.error, "Load attendance");
  return (r.data ?? []) as AttendanceRow[];
}

/** Upsert on (employee_id, attendance_date) — one record per employee per day. */
export async function markAttendance(
  rows: { employee_id: string; attendance_date: string; status: AttendanceStatus; note?: string | null }[],
) {
  if (!rows.length) return;
  const r = await supabase
    .from("employee_attendance")
    .upsert(
      rows.map((x) => ({ ...x, note: x.note?.trim() || null })),
      { onConflict: "employee_id,attendance_date" },
    );
  if (r.error) fail(r.error, "Save attendance");
}

export async function clearAttendance(employee_id: string, attendance_date: string) {
  const r = await supabase
    .from("employee_attendance")
    .delete()
    .eq("employee_id", employee_id)
    .eq("attendance_date", attendance_date);
  if (r.error) fail(r.error, "Clear attendance");
}

/* Pure helpers (tested) */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(days)}`, days };
}

export function summarize(rows: Pick<AttendanceRow, "status">[]) {
  const c = { present: 0, absent: 0, half_day: 0, leave: 0 };
  for (const r of rows) c[r.status]++;
  return { ...c, total: rows.length, workedDays: c.present + c.half_day * 0.5 };
}

export const todayIST = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
