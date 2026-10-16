import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Phone, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteEmployee,
  listEmployees,
  saveEmployee,
  setEmployeeActive,
  todayIST,
  type Employee,
} from "@/lib/employees";

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "Employees — SOHAN PIPELINES Admin" },
      { name: "description", content: "Create and manage SOHAN PIPELINES employee profiles." },
      { property: "og:title", content: "Employees — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content: "Create and manage SOHAN PIPELINES employee profiles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmployeesPage,
});

const schema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{6,20}$/, "Enter a valid phone number"),
  email: z.string().trim().max(255).email("Enter a valid email").or(z.literal("")),
  designation: z.string().trim().min(1, "Designation is required").max(80),
  joining_date: z.string().min(1, "Joining date is required"),
  active: z.boolean(),
});
type Draft = z.infer<typeof schema> & { id?: string };
const blank = (): Draft => ({
  full_name: "",
  phone: "",
  email: "",
  designation: "",
  joining_date: todayIST(),
  active: true,
});

function EmployeesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["employees"], queryFn: listEmployees });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const done = () => qc.invalidateQueries({ queryKey: ["employees"] });
  const onErr = (e: Error) => toast.error("Couldn't save", { description: e.message });

  const save = useMutation({
    mutationFn: (d: Draft) => saveEmployee({ ...d, email: d.email || null }),
    onSuccess: (_r, d) => {
      toast.success(d.id ? "Employee updated" : "Employee added");
      setDraft(null);
      void done();
    },
    onError: onErr,
  });
  const toggle = useMutation({
    mutationFn: (e: Employee) => setEmployeeActive(e.id, !e.active),
    onSuccess: (_r, e) => {
      toast.success(`${e.full_name} marked ${e.active ? "inactive" : "active"}`);
      void done();
    },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: (e: Employee) => deleteEmployee(e.id),
    onSuccess: () => {
      toast.success("Employee removed");
      setToDelete(null);
      void done();
    },
    onError: onErr,
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter(
      (e) =>
        (tab === "all" || (tab === "active") === e.active) &&
        (!s ||
          [e.full_name, e.phone, e.email ?? "", e.designation].some((v) =>
            v.toLowerCase().includes(s),
          )),
    );
  }, [q.data, search, tab]);
  const activeCount = (q.data ?? []).filter((e) => e.active).length;

  const submit = () => {
    if (!draft) return;
    const r = schema.safeParse(draft);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    save.mutate(draft.id ? { ...r.data, id: draft.id } : r.data);
  };
  const field = (k: keyof Draft, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`emp-${k}`}>{label}</Label>
      <Input
        id={`emp-${k}`}
        type={type}
        value={String(draft?.[k] ?? "")}
        onChange={(ev) => setDraft((d) => (d ? { ...d, [k]: ev.target.value } : d))}
        aria-invalid={!!errors[k]}
      />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Employees"
        description="Create, view and manage employee profiles."
        actions={
          <Button
            onClick={() => {
              setErrors({});
              setDraft(blank());
            }}
          >
            <Plus className="size-4" /> Add employee
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Total employees", q.data?.length ?? 0],
          ["Active", activeCount],
          ["Inactive", (q.data?.length ?? 0) - activeCount],
        ].map(([l, v]) => (
          <div key={l} className="surface-panel rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="num mt-1 text-2xl font-semibold">{q.isLoading ? "—" : v}</p>
          </div>
        ))}
      </div>

      <div className="surface-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, phone, email or designation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="surface-panel overflow-hidden rounded-xl">
        {q.isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : q.error ? (
          <EmptyState
            icon={UserPlus}
            title="Couldn't load employees"
            description={q.error.message}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={q.data?.length ? "No matching employees" : "No employees yet"}
            description={
              q.data?.length
                ? "Try a different search or filter."
                : "Add your first employee to start tracking attendance."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4">
                      <p className="font-medium">{e.full_name}</p>
                      <p className="text-xs text-muted-foreground">{e.designation}</p>
                    </td>
                    <td className="px-4">
                      <a
                        href={`tel:${e.phone}`}
                        className="num inline-flex items-center gap-1.5 hover:text-primary"
                      >
                        <Phone className="size-3.5" /> {e.phone}
                      </a>
                      {e.email && <p className="text-xs text-muted-foreground">{e.email}</p>}
                    </td>
                    <td className="num px-4 whitespace-nowrap">
                      {new Date(e.joining_date).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                      })}
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={e.active}
                          disabled={toggle.isPending}
                          onCheckedChange={() => toggle.mutate(e)}
                          aria-label={`Toggle ${e.full_name} active`}
                        />
                        <StatusBadge value={e.active ? "Active" : "Inactive"} />
                      </div>
                    </td>
                    <td className="px-4 text-right whitespace-nowrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${e.full_name}`}
                        onClick={() => {
                          setErrors({});
                          setDraft({ ...e, email: e.email ?? "" });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${e.full_name}`}
                        onClick={() => setToDelete(e)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit employee" : "Add employee"}</DialogTitle>
            <DialogDescription>Employee profile details used for attendance.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("full_name", "Full name")}</div>
            {field("phone", "Phone", "tel")}
            {field("email", "Email (optional)", "email")}
            {field("designation", "Designation")}
            {field("joining_date", "Joining date", "date")}
            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <Label htmlFor="emp-active">Active employee</Label>
              <Switch
                id="emp-active"
                checked={draft?.active ?? true}
                onCheckedChange={(v) => setDraft((d) => (d ? { ...d, active: v } : d))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? "Saving…" : draft?.id ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the employee and all their attendance records. To keep
              history, mark them inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault();
                if (toDelete) remove.mutate(toDelete);
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
