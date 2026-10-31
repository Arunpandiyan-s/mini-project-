import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListChecks,
  DoorClosed,
  Users,
  Inbox,
  Bell,
  FileBarChart,
  LineChart,
  Settings,
  User,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Lock,
  Building,
  Megaphone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApp } from "@/lib/store";
import { roleName, type RoleId } from "@/lib/data";
import { NewReceptionTaskModal } from "@/components/NewReceptionTaskModal";
import { BroadcastSendModal, BroadcastPopupAlertModal } from "@/components/BroadcastModal";
import { useStaffWebSocket } from "@/hooks/useWebSocket";
import { getNotifications, getUnreadCount, getTasks } from "@/lib/api";
import type { Priority, TaskStatus } from "@/lib/data";

function mapApiPriority(p: string): Priority {
  const map: Record<string, Priority> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
  return map[p.toLowerCase()] ?? "Medium";
}

function mapApiTaskStatus(s: string): TaskStatus {
  const map: Record<string, TaskStatus> = {
    pending: "Pending",
    assigned: "Pending",
    accepted: "Accepted",
    in_progress: "In Progress",
    completed: "Completed",
    attention_needed: "Attention Needed",
    escalated: "Attention Needed",
  };
  return map[s.toLowerCase()] ?? "Pending";
}

function mapApiDeptToRole(dept: string): RoleId {
  const map: Record<string, RoleId> = {
    housekeeping: "housekeeping",
    maintenance: "maintenance",
    reception: "reception",
    fnb: "fnb",
    administration: "manager",
  };
  return map[dept.toLowerCase()] ?? "housekeeping";
}

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  managerOnly?: boolean;
  hideRoles?: RoleId[];
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/dashboard", label: "Executive Admin", icon: ShieldCheck, managerOnly: true },
  { to: "/dashboard/rooms", label: "Rooms", icon: DoorClosed, hideRoles: ["housekeeping", "fnb"] },
  { to: "/dashboard/staff", label: "Staff", icon: Users, managerOnly: true },
  { to: "/dashboard/requests", label: "Requests", icon: Inbox, hideRoles: ["housekeeping"] },
  { to: "/dashboard/reports", label: "Reports", icon: FileBarChart, managerOnly: true, hideRoles: ["reception"] },
  { to: "/dashboard/analytics", label: "Analytics", icon: LineChart, managerOnly: true, hideRoles: ["reception"] },
  { to: "/dashboard/settings", label: "Settings", icon: Settings, hideRoles: ["housekeeping"] },
];

const MOBILE_NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/dashboard/requests", label: "Requests", icon: Inbox, hideRoles: ["housekeeping"] },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function AppShell({ children }: { children: ReactNode }) {
  const {
    session,
    notifications,
    logout,
    onDuty,
    setNotifications,
    setTasks,
    refreshReservations,
    refreshRooms,
    refreshStaff,
  } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [sendBroadcastOpen, setSendBroadcastOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const clock = useClock();
  const unread = notifications.filter((n) => !n.read).length;
  const isManager = session?.role === "manager";
  const isHousekeeping = session?.role === "housekeeping";
  const isReception = session?.role === "reception";

  // Fetch notifications from API (background refresh)
  const refreshNotifications = useCallback(async () => {
    try {
      const notifs = await getNotifications();
      setNotifications(notifs);
    } catch { /* ignore background errors */ }
  }, [setNotifications]);

  // Fetch tasks from API (background refresh on WS events)
  const refreshTasks = useCallback(async () => {
    try {
      const apiFetch = await import("@/lib/api");
      const isAdmin = session?.role === "manager";
      const data = isAdmin
        ? await apiFetch.getTasks()
        : await apiFetch.getMyTasks();
      setTasks(data.map((t: Record<string, unknown>) => ({
        id: String(t.task_id ?? t.id ?? ""),
        room: String(t.room_number ?? (t.room ? (t.room as any).room_number || t.room : t.room_id) ?? ""),
        type: String(t.title ?? t.task_type ?? t.type ?? "Task"),
        priority: mapApiPriority(String(t.priority ?? "medium")),
        assignedAt: String(t.created_at ?? t.assignedAt ?? ""),
        description: String(t.description ?? ""),
        eta: String(t.eta ?? "30 min"),
        status: mapApiTaskStatus(String(t.status ?? "pending")),
        role: mapApiDeptToRole(String(t.department ?? "housekeeping")),
        assignedTo: String(t.assigned_staff_id ?? t.assignedTo ?? ""),
      })));
    } catch { /* ignore background errors */ }
  }, [session?.role, setTasks]);

  // WebSocket integration: connect after session confirmed, refetch on events
  const wsToken = session?.token ?? null;
  const handleTaskEvent = useCallback(() => {
    void refreshTasks();
    void refreshNotifications();
    void refreshReservations();
    void refreshRooms();
  }, [refreshTasks, refreshNotifications, refreshReservations, refreshRooms]);

  const handleReservationCreated = useCallback((data: Record<string, unknown>) => {
    void refreshReservations();
    void refreshTasks();
    void refreshNotifications();
    void refreshRooms();
    const guestName = (data?.guest_name as string) || "Guest";
    const roomNum = (data?.room_number as string) || "";
    const resId = (data?.reservation_id as string) || "";
    toast.success(`🔔 New Room Booking! ${guestName} booked Room ${roomNum} (${resId})`, {
      duration: 7000,
    });
  }, [refreshReservations, refreshTasks, refreshNotifications, refreshRooms]);

  const handleRoomEvent = useCallback(() => {
    void refreshRooms();
  }, [refreshRooms]);

  const handleAuthExpired = useCallback(() => {
    logout();
    void navigate({ to: "/" });
  }, [logout, navigate]);

  useStaffWebSocket(wsToken, {
    onTaskAssigned: handleTaskEvent,
    onTaskUpdated: handleTaskEvent,
    onTaskReassigned: handleTaskEvent,
    onTaskRemoved: handleTaskEvent,
    onReservationCreated: handleReservationCreated,
    onReservationCheckedIn: handleTaskEvent,
    onReservationCheckedOut: handleTaskEvent,
    onRoomDirty: handleRoomEvent,
    onRoomCleaning: handleRoomEvent,
    onRoomClean: handleRoomEvent,
    onAuthExpired: handleAuthExpired,
  });

  // Load initial notifications, tasks, reservations, rooms, and staff when session is available
  useEffect(() => {
    if (session?.token) {
      void refreshNotifications();
      void refreshTasks();
      void refreshReservations();
      void refreshRooms();
      void refreshStaff();
    }
  }, [session?.token, refreshNotifications, refreshTasks, refreshReservations, refreshRooms, refreshStaff]);

  // Duty Gate Enforcement: Housekeeping and Reception staff must start duty before accessing secondary routes
  useEffect(() => {
    if (session && (isHousekeeping || isReception) && !onDuty) {
      const allowedPaths = isReception ? ["/dashboard"] : ["/dashboard", "/dashboard/profile"];
      if (!allowedPaths.includes(pathname)) {
        toast.warning("Please click 'Start Duty' on the home dashboard to unlock your shift workspace.", {
          id: "duty-lock-warning",
        });
        void navigate({ to: "/dashboard" });
      }
    }
  }, [session, isHousekeeping, isReception, onDuty, pathname, navigate]);

  const items = NAV.filter(
    (i) =>
      (!i.managerOnly || isManager) &&
      (!i.hideRoles || !session?.role || !i.hideRoles.includes(session.role)),
  );
  const mobileItems = MOBILE_NAV.filter(
    (i) =>
      (!i.managerOnly || isManager) &&
      (!i.hideRoles || !session?.role || !i.hideRoles.includes(session.role)),
  );
  const initials = (session?.name ?? "ST")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  const handleDutyLockNotice = (e: React.MouseEvent, isLocked: boolean) => {
    if (isLocked) {
      e.preventDefault();
      toast.warning("Please click 'Start Duty' on the home dashboard to unlock this feature.");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left side panel is rendered for ALL departments EXCEPT housekeeping */}
      {!isHousekeeping && (
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
            collapsed ? "w-[76px]" : "w-64",
          )}
        >
          <div className="flex h-16 items-center justify-between gap-2 px-4">
            <Logo compact={collapsed} />
            {!collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-sidebar-accent"
              >
                <PanelLeftClose className="size-4" />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="mx-auto grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-sidebar-accent"
            >
              <PanelLeft className="size-4" />
            </button>
          )}

          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-6">
            {items.map((item) => {
              const active =
                item.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.to);
              const isLocked = (isHousekeeping && !onDuty && item.to !== "/dashboard" && item.to !== "/dashboard/profile") ||
                               (isReception && !onDuty && item.to !== "/dashboard");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={isLocked ? "Duty not started" : item.label}
                  onClick={(e) => handleDutyLockNotice(e, isLocked)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    isLocked && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <item.icon className="size-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && isLocked && <Lock className="ml-auto size-3.5 text-muted-foreground" />}
                  {!collapsed && !isLocked && item.label === "Notifications" && unread > 0 && (
                    <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            <Button
              variant="ghost"
              className={cn("w-full justify-start gap-3 rounded-xl text-muted-foreground", collapsed && "justify-center")}
              onClick={() => {
                logout();
                void navigate({ to: "/" });
              }}
            >
              <LogOut className="size-[18px]" />
              {!collapsed && "Logout"}
            </Button>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-11 shrink-0 border border-border">
                <AvatarFallback className="bg-primary-soft font-semibold text-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold sm:text-base">
                  {session?.name ?? "Staff Member"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session?.employeeId} · {roleName(session?.role)} · Shift {session?.shift}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="mr-1 hidden text-right lg:block">
                <p className="text-xs font-mono font-bold tabular-nums text-foreground">
                  {clock ? clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "00:00"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {clock
                    ? clock.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })
                    : ""}
                </p>
              </div>

              {/* Broadcast Megaphone Button for Manager */}
              {isManager && (
                <button
                  type="button"
                  onClick={() => setSendBroadcastOpen(true)}
                  aria-label="Send Broadcast"
                  title="Send Staff Broadcast Announcement"
                  className="grid size-11 place-items-center rounded-xl bg-primary-soft text-accent-foreground transition-all hover:scale-105 border border-primary/20 cursor-pointer"
                >
                  <Megaphone className="size-5 text-primary animate-pulse" />
                </button>
              )}

              {/* Notification Bell button for non-housekeeping staff */}
              {!isHousekeeping && (
                <Link
                  to="/dashboard/notifications"
                  aria-label="Notifications"
                  className="relative grid size-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground border border-border/50"
                >
                  <Bell className="size-5" />
                  {unread > 0 && (
                    <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </Link>
              )}

              <Link
                to="/dashboard/profile"
                aria-label="Profile"
                className="grid size-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground border border-border/50"
              >
                <User className="size-5" />
              </Link>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
          <div className="flex justify-around items-center">
            {mobileItems.map((item) => {
              const active =
                item.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.to);
              const isLocked = (isHousekeeping && !onDuty && item.to !== "/dashboard" && item.to !== "/dashboard/profile") ||
                               (isReception && !onDuty && item.to !== "/dashboard");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={(e) => handleDutyLockNotice(e, isLocked)}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    active ? "text-primary font-bold" : "text-muted-foreground",
                    isLocked && "opacity-40 cursor-not-allowed",
                  )}
                >
                  <span className="relative">
                    {isLocked ? <Lock className="size-5" /> : <item.icon className="size-5" />}
                    {item.label === "Alerts" && unread > 0 && !isLocked && (
                      <span className="absolute -right-2 -top-1 size-2 rounded-full bg-destructive" />
                    )}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* RECEPTIONIST POP-UP ALERT MODAL & ALARM SOUND */}
      <NewReceptionTaskModal />

      {/* BROADCAST POPUP ALERT MODALS & CHIME FOR ALL STAFF */}
      <BroadcastSendModal open={sendBroadcastOpen} onOpenChange={setSendBroadcastOpen} />
      <BroadcastPopupAlertModal />
    </div>
  );
}
