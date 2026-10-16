import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ConfirmDelete } from "@/components/common/confirm-delete";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ClipboardCheck, Download, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import {
  ATTENDANCE_STATUSES,
  clearAttendance,
  listAttendance,
  listEmployees,
  markAttendance,
  monthRange,
  statusLabel,
  summarize,
  todayIST,
  type AttendanceStatus,
} from "@/lib/employees";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — SOHAN PIPELINES Admin" },
      { name: "description", content: "Daily employee attendance, monthly summaries and reports." },
      { property: "og:title", content: "Attendance — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content: "Daily employee attendance, monthly summaries and reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttendancePage,
});

const tone: Record<AttendanceStatus, string> = {
  present: "bg-success/12 text-success border-success/30",
  absent: "bg-destructive/12 text-destructive border-destructive/30",
  half_day: "bg-warning/15 text-warning border-warning/30",
  leave: "bg-info/12 text-info border-info/30",
};
const short: Record<AttendanceStatus, string> = {
  present: "P",
  absent: "A",
  half_day: "H",
  leave: "L",
};

function AttendancePage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayIST());
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const range = monthRange(month);

  const emps = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const day = useQuery({
    queryKey: ["attendance", date, date],
    queryFn: () => listAttendance(date, date),
  });
  const mon = useQuery({
    queryKey: ["attendance", range.from, range.to],
    queryFn: () => listAttendance(range.from, range.to),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["attendance"] });
  const onErr = (e: Error) => toast.error("Couldn't save attendance", { description: e.message });

  const mark = useMutation({
    mutationFn: (rows: { employee_id: string; status: AttendanceStatus }[]) =>
      markAttendance(rows.map((r) => ({ ...r, attendance_date: date }))),
    onSuccess: (_r, rows) => {
      toast.success(rows.length > 1 ? `Marked ${rows.length} employees` : "Attendance saved");
      void refresh();
    },
    onError: onErr,
  });
  const [clearing, setClearing] = useState<{ id: string; name: string } | null>(null);
  const clear = useMutation({
    mutationFn: (id: string) => clearAttendance(id, date),
    onSuccess: () => {
      toast.success("Attendance cleared");
      void refresh();
    },
    onError: onErr,
  });

  const byEmp = useMemo(() => new Map((day.data ?? []).map((r) => [r.employee_id, r])), [day.data]);
  const s = search.trim().toLowerCase();
  // Active employees, plus inactive ones who already have a record that day.
  const dayEmployees = (emps.data ?? []).filter(
    (e) =>
      (e.active || byEmp.has(e.id)) &&
      e.joining_date <= date &&
      (!s || e.full_name.toLowerCase().includes(s) || e.designation.toLowerCase().includes(s)) &&
      (statusFilter === "all" ||
        (statusFilter === "unmarked"
          ? !byEmp.has(e.id)
          : byEmp.get(e.id)?.status === statusFilter)),
  );
  const daySum = summarize(day.data ?? []);
  const unmarked = (emps.data ?? []).filter(
    (e) => e.active && e.joining_date <= date && !byEmp.has(e.id),
  );

  const monthCell = useMemo(() => {
    const m = new Map<string, AttendanceStatus>();
    for (const r of mon.data ?? []) m.set(`${r.employee_id}|${r.attendance_date}`, r.status);
    return m;
  }, [mon.data]);
  const monthEmployees = (emps.data ?? []).filter(
    (e) =>
      (employeeFilter === "all" || e.id === employeeFilter) &&
      (e.active || (mon.data ?? []).some((r) => r.employee_id === e.id)),
  );
  const monthSum = (id: string) => summarize((mon.data ?? []).filter((r) => r.employee_id === id));
  const days = Array.from(
    { length: range.days },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );

  const exportMonth = () => {
    const rows = monthEmployees.map((e) => {
      const sum = monthSum(e.id);
      const row: Record<string, unknown> = {
        Employee: e.full_name,
        Designation: e.designation,
        Phone: e.phone,
        Present: sum.present,
        Absent: sum.absent,
        "Half Day": sum.half_day,
        Leave: sum.leave,
        "Days Worked": sum.workedDays,
      };
      for (const d of days) {
        const st = monthCell.get(`${e.id}|${d}`);
        row[d] = st ? statusLabel(st) : "";
      }
      return row;
    });
    if (downloadCsv(`attendance-${month}.csv`, rows)) toast.success("Monthly report downloaded");
    else toast.error("Nothing to export for this month");
  };

  const loadError = emps.error ?? day.error ?? mon.error;

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Mark daily attendance and review monthly reports."
      />

      {loadError ? (
        <div className="surface-panel rounded-xl">
          <EmptyState
            icon={ClipboardCheck}
            title="Couldn't load attendance"
            description={loadError.message}
          />
        </div>
      ) : (
        <Tabs defaultValue="daily" className="space-y-5">
          <TabsList>
            <TabsTrigger value="daily">Daily register</TabsTrigger>
            <TabsTrigger value="monthly">Monthly report</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                ["Present", daySum.present],
                ["Absent", daySum.absent],
                ["Half Day", daySum.half_day],
                ["Leave", daySum.leave],
                ["Not marked", unmarked.length],
              ].map(([l, v]) => (
                <div key={l} className="surface-panel rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p className="num mt-1 text-2xl font-semibold">{day.isLoading ? "—" : v}</p>
                </div>
              ))}
            </div>

            <div className="surface-panel flex flex-col gap-3 rounded-xl p-4 lg:flex-row lg:items-center">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={date}
                  max={todayIST()}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="w-auto"
                  aria-label="Attendance date"
                />
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search employee"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="lg:w-40" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="unmarked">Not marked</SelectItem>
                  {ATTENDANCE_STATUSES.map((x) => (
                    <SelectItem key={x.value} value={x.value}>
                      {x.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={!unmarked.length || mark.isPending}
                onClick={() =>
                  mark.mutate(unmarked.map((e) => ({ employee_id: e.id, status: "present" })))
                }
              >
                Mark unmarked present
              </Button>
            </div>

            <div className="surface-panel overflow-hidden rounded-xl">
              {emps.isLoading || day.isLoading ? (
                <div className="space-y-3 p-5">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : dayEmployees.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title={emps.data?.length ? "No employees match" : "No employees yet"}
                  description={
                    emps.data?.length
                      ? "Change the filters or date."
                      : "Add employees in Add Employee to start recording attendance."
                  }
                />
              ) : (
                <>
                  <ul className="divide-y">
                    {dayEmployees.map((e) => {
                      const cur = byEmp.get(e.id)?.status;
                      return (
                        <li
                          key={e.id}
                          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{e.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.designation}
                              {!e.active && " · Inactive"}
                            </p>
                          </div>
                          <div
                            className="flex flex-wrap items-center gap-1.5"
                            role="group"
                            aria-label={`Attendance for ${e.full_name}`}
                          >
                            {ATTENDANCE_STATUSES.map((x) => (
                              <button
                                key={x.value}
                                type="button"
                                aria-pressed={cur === x.value}
                                disabled={mark.isPending}
                                onClick={() =>
                                  cur !== x.value &&
                                  mark.mutate([{ employee_id: e.id, status: x.value }])
                                }
                                className={cn(
                                  "min-h-9 rounded-lg border px-3 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  cur === x.value
                                    ? tone[x.value]
                                    : "border-border text-muted-foreground hover:bg-muted",
                                )}
                              >
                                {x.label}
                              </button>
                            ))}
                            {cur && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={clear.isPending}
                                onClick={() => setClearing({ id: e.id, name: e.full_name })}
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <ConfirmDelete
                    open={!!clearing}
                    onOpenChange={(o) => !o && setClearing(null)}
                    title={`Delete attendance for ${clearing?.name ?? ""}?`}
                    confirmLabel="Delete record"
                    description={`This removes the attendance record for ${date}. The employee is not affected.`}
                    onConfirm={async () => {
                      if (!clearing) return false;
                      try {
                        await clear.mutateAsync(clearing.id);
                        return true;
                      } catch {
                        return false;
                      }
                    }}
                  />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-5">
            <div className="surface-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center">
              <Input
                type="month"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="sm:w-48"
                aria-label="Report month"
              />
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="sm:w-56" aria-label="Filter by employee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {(emps.data ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" className="sm:ml-auto" onClick={exportMonth}>
                <Download className="size-4" /> Export CSV
              </Button>
            </div>

            <div className="surface-panel overflow-hidden rounded-xl">
              {mon.isLoading || emps.isLoading ? (
                <div className="p-5">
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : monthEmployees.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No records"
                  description="No employees for this month."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b text-muted-foreground">
                      <tr>
                        <th className="sticky left-0 bg-card px-4 py-3 font-medium">Employee</th>
                        {["P", "A", "H", "L", "Worked"].map((h) => (
                          <th key={h} className="px-2 py-3 text-center font-medium">
                            {h}
                          </th>
                        ))}
                        {days.map((d) => (
                          <th key={d} className="num px-1 py-3 text-center font-medium">
                            {Number(d.slice(8))}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {monthEmployees.map((e) => {
                        const sum = monthSum(e.id);
                        return (
                          <tr key={e.id}>
                            <td className="sticky left-0 bg-card px-4 font-medium whitespace-nowrap">
                              {e.full_name}
                            </td>
                            {[sum.present, sum.absent, sum.half_day, sum.leave, sum.workedDays].map(
                              (v, i) => (
                                <td key={i} className="num px-2 text-center font-semibold">
                                  {v}
                                </td>
                              ),
                            )}
                            {days.map((d) => {
                              const st = monthCell.get(`${e.id}|${d}`);
                              return (
                                <td key={d} className="px-0.5 text-center">
                                  {st ? (
                                    <span
                                      title={`${d}: ${statusLabel(st)}`}
                                      className={cn(
                                        "inline-grid size-6 place-items-center rounded-md border text-[10px] font-bold",
                                        tone[st],
                                      )}
                                    >
                                      {short[st]}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/40">·</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              P Present · A Absent · H Half Day · L Leave · Worked counts a half day as 0.5.
            </p>
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
