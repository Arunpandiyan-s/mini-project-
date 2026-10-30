import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Search, UserPlus, Ban, CheckCircle2, Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill } from "@/components/Badges";
import { SectionHeader } from "@/components/Primitives";
import { RoleDistributionChart } from "@/components/Charts";
import { ROLES, roleName, type RoleId, type Staff } from "@/lib/data";
import { useApp } from "@/lib/store";
import { listStaff, createStaff, suspendStaff, activateStaff, deleteStaff } from "@/lib/api";
import type { ApiStaff, BackendStaffRole } from "@/lib/types";

export const Route = createFileRoute("/dashboard/staff")({
  component: StaffPage,
});

function mapApiStaffToUi(s: ApiStaff): Staff {
  const roleMap: Record<string, RoleId> = {
    admin: "manager",
    reception: "reception",
    housekeeping: "housekeeping",
    maintenance: "maintenance",
    fnb: "fnb",
  };
  return {
    id: s.staff_id,
    name: s.name,
    role: roleMap[s.role] ?? "reception",
    floor: s.floor ?? "Floor 1",
    phone: s.phone ?? "",
    email: s.email,
    joined: new Date(s.created_at).toLocaleDateString([], { month: "short", year: "numeric" }),
    employment: s.employment_status === "active" ? "Active" : s.employment_status === "suspended" ? "Suspended" : "Terminated",
    duty: s.duty_status === "on_duty" ? "On Duty" : "Off Duty",
    shift: s.shift ?? "08:00 - 16:00",
    performance: 85,
    completion: 90,
    responseMin: 10,
    lastLogin: "Today",
    notes: "-",
  };
}

function StaffPage() {
  const { session, auditLog, pushAudit } = useApp();
  const isAdmin = session?.role === "manager";
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dutyFilter, setDutyFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Staff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [drawer, setDrawer] = useState<Staff | null>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await listStaff();
      setStaffList(data.map(mapApiStaffToUi));
    } catch {
      toast.error("Failed to load staff directory from backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStaff();
  }, []);

  const list = staffList.filter(
    (s) =>
      (roleFilter === "all" || s.role === roleFilter) &&
      (dutyFilter === "all" || s.duty === dutyFilter) &&
      (s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.id.toLowerCase().includes(query.toLowerCase())),
  );

  const distribution = ROLES.map((r) => ({
    name: r.name,
    value: staffList.filter((s) => s.role === r.id && s.employment !== "Terminated").length,
  }));

  const handleSuspend = async (s: Staff) => {
    if (!isAdmin) {
      toast.error("Operation not permitted: Staff suspension requires Manager/Admin role.");
      return;
    }
    try {
      await suspendStaff(s.id);
      pushAudit("Staff Suspended", `Admin suspended staff member ${s.name} (${s.id})`);
      toast.warning(`${s.name} has been suspended. Login disabled.`);
      void fetchStaff();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast.error(apiErr?.message ?? "Failed to suspend staff member");
    }
  };

  const handleActivate = async (s: Staff) => {
    if (!isAdmin) {
      toast.error("Operation not permitted: Staff activation requires Manager/Admin role.");
      return;
    }
    try {
      await activateStaff(s.id);
      pushAudit("Staff Activated", `Admin reactivated staff member ${s.name} (${s.id})`);
      toast.success(`${s.name} has been reactivated.`);
      void fetchStaff();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast.error(apiErr?.message ?? "Failed to activate staff member");
    }
  };

  const handleDelete = async (s: Staff) => {
    if (!isAdmin) {
      toast.error("Operation not permitted: Staff deletion requires Manager/Admin role.");
      return;
    }
    try {
      await deleteStaff(s.id);
      pushAudit("Staff Deleted", `Admin deleted staff member ${s.name} (${s.id})`);
      toast.success(`${s.name} (${s.id}) deleted successfully.`);
      void fetchStaff();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast.error(apiErr?.message ?? "Failed to delete staff member");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Staff Management"
        subtitle="Directory, roles, and employment status"
        action={
          <Pill tone="gold" className="gap-2">
            <ShieldCheck className="size-3.5" /> Manager Only Access
          </Pill>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or employee ID"
            className="h-12 rounded-xl pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-12 rounded-xl lg:w-44"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dutyFilter} onValueChange={setDutyFilter}>
          <SelectTrigger className="h-12 rounded-xl lg:w-40"><SelectValue placeholder="Duty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All duty states</SelectItem>
            <SelectItem value="On Duty">On Duty</SelectItem>
            <SelectItem value="Off Duty">Off Duty</SelectItem>
          </SelectContent>
        </Select>
        <Button className="h-12 rounded-xl" onClick={() => setAddOpen(true)}>
          <UserPlus className="size-4" /> Add Staff
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 surface">
          <Loader2 className="size-6 animate-spin text-primary mr-2" />
          <span>Loading staff directory from FastAPI...</span>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((s) => (
            <article key={s.id} className="surface p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.id} · {s.floor} · joined {s.joined}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{s.phone} · {s.email}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Pill tone="primary">{roleName(s.role)}</Pill>
                  <Pill tone={s.duty === "On Duty" ? "success" : "muted"}>{s.duty}</Pill>
                  <Pill tone={s.employment === "Active" ? "success" : "danger"}>{s.employment}</Pill>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="h-11 rounded-xl text-xs flex-1" onClick={() => setDrawer(s)}>
                  <Eye className="size-4" /> View Details
                </Button>
                {s.employment === "Active" ? (
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-warning/50 text-xs flex-1 text-amber-600 hover:bg-amber-50"
                    onClick={() => {
                      if (!isAdmin) {
                        toast.error("Operation not permitted: Staff suspension requires Manager/Admin role.");
                        return;
                      }
                      setSuspendTarget(s);
                    }}
                  >
                    <Ban className="size-4" /> Suspend
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-success/50 text-xs flex-1 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => {
                      if (!isAdmin) {
                        toast.error("Operation not permitted: Staff activation requires Manager/Admin role.");
                        return;
                      }
                      void handleActivate(s);
                    }}
                  >
                    <CheckCircle2 className="size-4" /> Activate
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-destructive/50 text-xs text-rose-600 hover:bg-rose-50 hover:border-destructive"
                    onClick={() => setDeleteTarget(s)}
                    title="Delete Staff Member"
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                )}
              </div>
            </article>
          ))}
          {list.length === 0 && (
            <p className="surface p-8 text-center text-sm text-muted-foreground col-span-2">No staff members found.</p>
          )}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <RoleDistributionChart data={distribution} />
        <section className="surface p-5">
          <h2 className="text-lg font-semibold">Activity & audit log</h2>
          <div className="mt-4 space-y-4">
            {auditLog.slice(0, 6).map((l) => (
              <div key={l.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{l.action}</p>
                  <p className="text-sm text-muted-foreground">{l.detail}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{l.by} · {l.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AddStaffDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => void fetchStaff()}
      />

      <Dialog open={!!suspendTarget} onOpenChange={(o) => !o && setSuspendTarget(null)}>
        <DialogContent className="rounded-2xl border-warning/40">
          <DialogHeader>
            <DialogTitle className="text-amber-600">Suspend {suspendTarget?.name}</DialogTitle>
            <DialogDescription>
              This will temporarily disable login access for employee {suspendTarget?.id}. You can reactivate this account later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="secondary" className="h-11 rounded-xl" onClick={() => setSuspendTarget(null)}>Cancel</Button>
            <Button
              className="h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
              onClick={() => {
                if (suspendTarget) {
                  void handleSuspend(suspendTarget);
                  setSuspendTarget(null);
                }
              }}
            >
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl border-destructive/40">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Delete {deleteTarget?.name} ({deleteTarget?.id})</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this staff member? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="secondary" className="h-11 rounded-xl" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={() => {
                if (deleteTarget) {
                  void handleDelete(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{drawer?.name}</SheetTitle>
            <SheetDescription>{drawer?.id} · {roleName(drawer?.role)}</SheetDescription>
          </SheetHeader>
          {drawer && (
            <div className="space-y-3 px-4 pb-6 mt-4">
              {[
                ["Employee ID", drawer.id],
                ["Email", drawer.email],
                ["Phone", drawer.phone || "Not provided"],
                ["Department", roleName(drawer.role)],
                ["Floor Assignment", drawer.floor],
                ["Shift", drawer.shift],
                ["Employment Status", drawer.employment],
                ["Duty Status", drawer.duty],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-0.5 font-semibold">{value}</p>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AddStaffDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const { pushAudit } = useApp();
  const [form, setForm] = useState({
    staffId: "EMP-3005",
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "reception" as RoleId,
    floor: "Floor 1",
    shift: "08:00 - 16:00",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.staffId.trim() || !form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("Staff ID, Name, Email, and Password are required.");
      return;
    }

    if (!/^EMP-\d+$/.test(form.staffId.trim())) {
      toast.error("Staff ID must match format EMP-XXXX (e.g. EMP-3005)");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    const roleMap: Record<RoleId, BackendStaffRole> = {
      manager: "admin",
      reception: "reception",
      housekeeping: "housekeeping",
      maintenance: "maintenance",
      fnb: "fnb",
    };

    setSaving(true);
    try {
      await createStaff({
        staff_id: form.staffId.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: roleMap[form.role],
        floor: form.floor.trim() || undefined,
        shift: form.shift.trim() || undefined,
      });

      pushAudit("Add Staff", `Admin created staff user '${form.name}' (${form.staffId})`);
      toast.success(`Staff member ${form.name} created successfully.`);
      onCreated();
      onOpenChange(false);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr?.status === 409) {
        toast.error("A staff member with this Staff ID or Email already exists.");
      } else {
        toast.error(apiErr?.message ?? "Failed to create staff member.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add new staff member</DialogTitle>
          <DialogDescription>Create a new staff account in StayEase FastAPI backend.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="staffId">Staff ID (e.g. EMP-3005)</Label>
            <Input id="staffId" className="h-11 rounded-xl" value={form.staffId} onChange={(e) => set("staffId", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" className="h-11 rounded-xl" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" className="h-11 rounded-xl" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Initial Password</Label>
            <Input id="password" type="password" className="h-11 rounded-xl" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input id="phone" className="h-11 rounded-xl" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="floor">Floor Assignment</Label>
            <Input id="floor" className="h-11 rounded-xl" value={form.floor} onChange={(e) => set("floor", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shift">Shift</Label>
            <Input id="shift" className="h-11 rounded-xl" value={form.shift} onChange={(e) => set("shift", e.target.value)} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button className="h-12 w-full rounded-xl font-bold" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            {saving ? "Creating..." : "Create Staff Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
