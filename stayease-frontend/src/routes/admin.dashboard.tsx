import { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  BedDouble,
  DoorOpen,
  DoorClosed,
  Sparkles,
  Wrench,
  Users,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  ArrowRight,
  ClipboardList,
  Activity,
  FileText,
  Sliders,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/store";
import {
  getAdminDashboardStats,
  getAdminAuditLogs,
  inspectRoom,
  reportRoomMaintenance,
  removeToken,
  getToken,
} from "@/lib/api";
import type { AdminDashboardStats } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Console — StayEase Executive Dashboard" },
      {
        name: "description",
        content: "StayEase Executive & Administrative Control Cockpit.",
      },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { session } = useApp();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Action Modal states
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectRoomNum, setInspectRoomNum] = useState("101");
  const [inspectNotes, setInspectNotes] = useState("Passed VIP room inspection");
  const [inspectSubmitting, setInspectSubmitting] = useState(false);

  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [maintRoomNum, setMaintRoomNum] = useState("204");
  const [maintIssue, setMaintIssue] = useState("AC temperature regulator malfunction");
  const [maintBlock, setMaintBlock] = useState(true);
  const [maintSubmitting, setMaintSubmitting] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [s, logs] = await Promise.all([
        getAdminDashboardStats(),
        getAdminAuditLogs(25),
      ]);
      setStats(s);
      setAuditLogs(logs);
    } catch {
      toast.error("Failed to refresh administrative telemetry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      void navigate({ to: "/admin/login" });
      return;
    }
    if (session && session.role !== "manager") {
      void navigate({ to: "/admin/login" });
      return;
    }
    void fetchStats();
  }, [session, navigate, fetchStats]);

  const handleRunInspection = async (passed: boolean) => {
    if (!inspectRoomNum.trim() || inspectSubmitting) return;
    setInspectSubmitting(true);
    try {
      await inspectRoom(inspectRoomNum.trim(), passed, inspectNotes);
      toast.success(
        `Room ${inspectRoomNum} inspection completed (${passed ? "PASSED - Ready for Guests" : "FAILED - Dispatched to Housekeeping"})`
      );
      setInspectModalOpen(false);
      void fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Inspection submission failed";
      toast.error(msg);
    } finally {
      setInspectSubmitting(false);
    }
  };

  const handleReportMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintRoomNum.trim() || !maintIssue.trim() || maintSubmitting) return;
    setMaintSubmitting(true);
    try {
      await reportRoomMaintenance(maintRoomNum.trim(), {
        issue_description: maintIssue.trim(),
        priority: "high",
        block_occupancy: maintBlock,
      });
      toast.warning(`Room ${maintRoomNum} placed under maintenance and task dispatched`);
      setMaintModalOpen(false);
      void fetchStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Maintenance reporting failed";
      toast.error(msg);
    } finally {
      setMaintSubmitting(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    void navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Executive Top Bar */}
      <header className="border-b border-border/80 bg-card/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-sm">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-foreground">
                StayEase Executive Admin
              </span>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                Live Cockpit
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {session?.user?.name || "Administrator"} · Global Hotel Operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5"
            disabled={loading}
          >
            <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link to="/dashboard/operations">
            <Button size="sm" variant="secondary" className="h-9 rounded-xl text-xs font-bold">
              Staff Portal
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-9 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
        {/* Welcome & Quick Action Bar */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-primary/10 to-card border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground">
              Welcome to the Executive Operations Console
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
              Real-time room availability, housekeeping turnover, active check-in lifecycle, and automated dispatch control.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={() => setInspectModalOpen(true)}
              className="rounded-xl h-10 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm"
            >
              <Sparkles className="size-3.5 mr-1.5" /> Room Inspection
            </Button>
            <Button
              onClick={() => setMaintModalOpen(true)}
              variant="outline"
              className="rounded-xl h-10 text-xs font-bold border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
            >
              <Wrench className="size-3.5 mr-1.5" /> Maintenance Block
            </Button>
          </div>
        </div>

        {/* 1. ROOM LIFECYCLE TELEMETRY */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BedDouble className="size-4 text-primary" /> Room Operational Inventory & Readiness
            </h2>
            <Link to="/dashboard/rooms" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              Floor Matrix <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="card-surface p-4 rounded-2xl border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Inventory</span>
              <p className="text-2xl sm:text-3xl font-black text-foreground mt-1 tabular-nums">{stats?.rooms.total ?? "—"}</p>
            </div>

            <div className="card-surface p-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <DoorOpen className="size-3" /> Ready for Check-in
              </span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{stats?.rooms.available ?? "—"}</p>
            </div>

            <div className="card-surface p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <DoorClosed className="size-3" /> Occupied
              </span>
              <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums">{stats?.rooms.occupied ?? "—"}</p>
            </div>

            <div className="card-surface p-4 rounded-2xl border border-sky-500/30 bg-sky-500/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Housekeeping Dirty</span>
              <p className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 mt-1 tabular-nums">{stats?.rooms.dirty ?? "—"}</p>
            </div>

            <div className="card-surface p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Sparkles className="size-3" /> Awaiting Inspection
              </span>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">{stats?.rooms.awaiting_inspection ?? "—"}</p>
            </div>

            <div className="card-surface p-4 rounded-2xl border border-orange-500/30 bg-orange-500/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <Wrench className="size-3" /> Maint. Blocked
              </span>
              <p className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 mt-1 tabular-nums">{stats?.rooms.maintenance ?? "—"}</p>
            </div>
          </div>
        </section>

        {/* 2. RESERVATIONS & DISPATCH TELEMETRY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Reservations & Guests */}
          <section className="card-surface p-5 rounded-3xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalendarCheck className="size-4 text-primary" /> Today's Guest Flow
              </h2>
              <Link to="/dashboard/operations" className="text-xs font-bold text-primary hover:underline">
                View Front Desk →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/80">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Arrivals Today</span>
                <p className="text-2xl font-black text-foreground mt-1 tabular-nums">{stats?.reservations.arrivals_today ?? 0}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/80">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Departures Today</span>
                <p className="text-2xl font-black text-foreground mt-1 tabular-nums">{stats?.reservations.departures_today ?? 0}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/80">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Active Stays</span>
                <p className="text-2xl font-black text-primary mt-1 tabular-nums">{stats?.reservations.active ?? 0}</p>
              </div>
            </div>
          </section>

          {/* Departmental Staff On Duty */}
          <section className="card-surface p-5 rounded-3xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="size-4 text-primary" /> Staff on Duty ({stats?.staff.on_duty ?? 0} active)
              </h2>
              <Link to="/dashboard/staff" className="text-xs font-bold text-primary hover:underline">
                Manage Staff →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {stats?.staff.departments ? (
                Object.entries(stats.staff.departments).map(([dept, count]) => (
                  <div key={dept} className="p-3 rounded-2xl bg-muted/50 border border-border/60 text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">{dept}</p>
                    <p className="text-xl font-black text-foreground mt-0.5 tabular-nums">{count}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-4 py-3 text-center text-xs text-muted-foreground">
                  Synchronizing shift rosters...
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 3. RECENT AUDIT LOGS FEED */}
        <section className="card-surface p-5 rounded-3xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="size-4 text-primary" /> Live Administrative Audit Log
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                System events, guest pre-registrations, room status changes, and staff dispatches
              </p>
            </div>
            <Link to="/dashboard/reports">
              <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs font-bold">
                <FileText className="size-3.5 mr-1" /> Full Reports
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-border/70 overflow-hidden divide-y divide-border/60 max-h-80 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No recent audit log entries recorded.
              </div>
            ) : (
              auditLogs.map((log, idx) => (
                <div key={idx} className="p-3.5 text-xs hover:bg-muted/40 transition-colors flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
                        {String(log.event_type || "EVENT")}
                      </span>
                      <span className="font-semibold text-foreground truncate">
                        {String(log.description || log.message || "Operational event recorded")}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Actor: <span className="font-medium text-foreground">{String(log.actor_id || "System")}</span> ({String(log.actor_type || "auto")})
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {log.created_at ? new Date(String(log.created_at)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "just now"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* MODAL: ROOM INSPECTION */}
      <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="size-5 text-amber-500" /> Room Quality Inspection
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review room cleanliness and certify readiness for guest check-in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Room Number</Label>
              <Input
                placeholder="e.g. 101, 204, 512"
                className="h-11 rounded-xl text-sm font-semibold"
                value={inspectRoomNum}
                onChange={(e) => setInspectRoomNum(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Inspector Notes</Label>
              <Input
                placeholder="Notes on inspection findings..."
                className="h-11 rounded-xl text-sm"
                value={inspectNotes}
                onChange={(e) => setInspectNotes(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <Button
                type="button"
                variant="destructive"
                className="h-11 rounded-xl font-bold text-xs"
                disabled={inspectSubmitting}
                onClick={() => handleRunInspection(false)}
              >
                <XCircle className="size-4 mr-1.5" /> Fail (Require Cleaning)
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                disabled={inspectSubmitting}
                onClick={() => handleRunInspection(true)}
              >
                <CheckCircle2 className="size-4 mr-1.5" /> Pass & Certify Clean
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: MAINTENANCE BLOCK */}
      <Dialog open={maintModalOpen} onOpenChange={setMaintModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Wrench className="size-5 text-orange-500" /> Maintenance Dispatch & Block
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Block a room from guest assignment and dispatch a maintenance task.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportMaintenance} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Room Number</Label>
              <Input
                placeholder="e.g. 204"
                className="h-11 rounded-xl text-sm font-semibold"
                value={maintRoomNum}
                onChange={(e) => setMaintRoomNum(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Defect Description</Label>
              <Input
                placeholder="e.g. Plumbing leak, AC broken, door lock issue"
                className="h-11 rounded-xl text-sm"
                value={maintIssue}
                onChange={(e) => setMaintIssue(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="block-check"
                checked={maintBlock}
                onChange={(e) => setMaintBlock(e.target.checked)}
                className="size-4 rounded accent-primary"
              />
              <Label htmlFor="block-check" className="text-xs font-semibold cursor-pointer">
                Block room immediately from guest assignment (Out of Service)
              </Label>
            </div>

            <Button
              type="submit"
              disabled={maintSubmitting || !maintRoomNum.trim() || !maintIssue.trim()}
              className="w-full h-11 rounded-xl font-bold text-xs bg-orange-600 hover:bg-orange-500 text-white mt-2"
            >
              Dispatch Maintenance Task
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
