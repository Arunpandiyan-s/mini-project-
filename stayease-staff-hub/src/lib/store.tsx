import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ACTIVITY,
  AUDIT_LOG,
  GUEST_REQUESTS,
  ORDERS,
  STAFF_REQUESTS,
  TASKS,
  TICKETS,
  roleName,
  type FoodOrder,
  type GuestRequest,
  type NotificationItem,
  type Priority,
  type RoleId,
  type Room,
  type RoomStatus,
  type Staff,
  type StaffRequest,
  type Task,
  type TaskStatus,
  type Ticket,
  type Reservation,
} from "./data";
import { toast } from "sonner";
import {
  getToken,
  setToken,
  removeToken,
  getMe,
  updateMyDutyStatus,
  listReservations,
  checkInReservation,
  registerUnauthorizedHandler,
  triggerN8nWebhook as _triggerN8nWebhookNoOp,
} from "./api";
import { staffWS } from "./websocket";
import type { ApiStaff } from "./types";

// ─── BACKEND → UI ADAPTER HELPERS ────────────────────────────────────────────

import type { BackendStaffRole } from "./types";

/**
 * Maps the actual backend StaffRole enum values to the frontend RoleId values used in data.ts.
 * Backend "admin" maps to frontend "manager" (the UI label for the admin role).
 */
function mapBackendRole(backendRole: BackendStaffRole | string | undefined): RoleId {
  const map: Record<string, RoleId> = {
    admin: "manager",
    reception: "reception",
    housekeeping: "housekeeping",
    maintenance: "maintenance",
    fnb: "fnb",
  };
  return map[backendRole ?? ""] ?? "reception";
}

/**
 * Builds a Session object from an ApiStaff + JWT token.
 * Keeps the token in session state (never displayed in UI).
 */
function buildSession(staff: import("./types").ApiStaff | undefined, token: string): import("./store").Session {
  if (!staff) return null;
  return {
    role: mapBackendRole(staff.role),
    name: staff.name,
    employeeId: staff.staff_id,
    staffId: staff.staff_id,
    email: staff.email,
    phone: staff.phone ?? "",
    shift: staff.shift ?? "08:00 - 17:00",
    token,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export type RequestPriority = "Low" | "Medium" | "High" | "Emergency";

export type RequestStatus = "New" | "Accepted" | "Pending" | "Completed" | "Rejected" | "Forwarded";

export type RequestSourceDept = "Guest / Customer" | "Housekeeping" | "Maintenance" | "Food & Beverage" | "Security" | "Hotel Manager" | "System Alerts";

export type RealtimeRequest = {
  id: string;
  type: string;
  roomNumber: string;
  guestName?: string;
  department: RequestSourceDept;
  priority: RequestPriority;
  description: string;
  timeReceived: string;
  timestamp: number;
  status: RequestStatus;
  acceptedBy?: string;
  acceptedAt?: string;
  completedAt?: string;
  forwardedTo?: string;
  rejectedReason?: string;
  escalationLevel?: number; // 0: Normal, 1: 30s Yellow, 2: 60s Orange, 3: 90s Red, 4: 120s Emergency
};

// AI Task Prioritization Engine
export function calculateAiTaskPriority(
  task: { type?: string; description?: string; priority?: Priority; role?: RoleId },
  room?: Room,
  guestName?: string
): Priority {
  const typeLower = (task.type || "").toLowerCase();
  const descLower = (task.description || "").toLowerCase();
  const guestLower = (guestName || room?.guest || "").toLowerCase();

  // 1. Emergency Priority Rules
  if (
    typeLower.includes("smoke") ||
    typeLower.includes("fire") ||
    typeLower.includes("medical") ||
    typeLower.includes("panic") ||
    descLower.includes("smoke") ||
    descLower.includes("panic")
  ) {
    return "Urgent";
  }

  // 2. VIP Guest Status / Occupied VIP Room
  if (guestLower.includes("vip") || typeLower.includes("vip") || descLower.includes("vip")) {
    return "Urgent";
  }

  // 3. Imminent Check-In Deadline & Dirty Room
  if (
    typeLower.includes("turnover") ||
    typeLower.includes("check-in") ||
    descLower.includes("checkout") ||
    descLower.includes("arrival")
  ) {
    return "High";
  }

  // 4. Maintenance Severity / Water Leak / AC Failure
  if (
    typeLower.includes("ac") ||
    typeLower.includes("leak") ||
    typeLower.includes("lock") ||
    typeLower.includes("plumbing")
  ) {
    return "High";
  }

  // 5. Routine Requests
  if (typeLower.includes("towel") || typeLower.includes("pillow") || typeLower.includes("linen")) {
    return "Medium";
  }

  return task.priority || "Medium";
}

// Production Backend WebSocket / SSE Realtime Channel Bus
export const RequestRealtimeBus = new EventTarget();

export function emitRequestBackendEvent(eventType: string, data: any) {
  const customEvt = new CustomEvent(eventType, { detail: data });
  RequestRealtimeBus.dispatchEvent(customEvt);
}

export type ChatMessage = {
  id: string;
  from: "me" | "manager" | "customer";
  topic: string;
  text: string;
  time: string;
};

type Session = {
  role: RoleId;
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  shift: string;
  /** FastAPI JWT access token — never expose in UI */
  token: string;
  /** Backend staff_id (e.g. EMP-1001) */
  staffId: string;
} | null;

export type Booking = {
  id: string;
  guestName: string;
  phone: string;
  email: string;
  roomType: string;
  roomNumber?: string;
  guestsCount: number;
  checkIn: string;
  checkOut: string;
  parking: boolean;
  specialRequirements: string;
  createdAt: string;
};

export type PreRegistration = {
  id: string;
  guestName: string;
  phone: string;
  email: string;
  guestCount: number;
  parking: boolean;
  specialRequests: string;
  arrivalDate: string;
  roomType: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
};

export type LeaveRequest = {
  id: string;
  staffName: string;
  role: RoleId;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
};

export type AttendanceLog = {
  id: string;
  staffName: string;
  role: RoleId;
  date: string;
  signInTime: string;
  signOutTime?: string;
  status: "On Duty" | "Off Duty";
};

export type TaskHistoryItem = {
  id: string;
  taskId: string;
  room: string;
  type: string;
  role: RoleId;
  completedAt: string;
};

export type ForceCheckoutRecord = {
  id: string;
  bookingId: string;
  roomNumber: string;
  guestName: string;
  reason: string;
  additionalNotes?: string;
  performedBy: string;
  performedRole: RoleId;
  checkoutTime: string;
  invoiceId: string;
  pendingCharges: number;
};

type AppState = {
  selectedRole: RoleId | null;
  setSelectedRole: (r: RoleId) => void;
  session: Session;
  login: (role: RoleId, identifier: string, userData?: any, workflowTasks?: any[]) => void;
  logout: () => void;
  onDuty: boolean;
  dutyStart: string | null;
  toggleDuty: () => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  setRoomStatus: (num: string, status: Room["status"]) => void;
  orders: FoodOrder[];
  setOrderStatus: (id: string, status: FoodOrder["status"]) => void;
  tickets: Ticket[];
  setTicketStatus: (id: string, status: Ticket["status"], technician?: string) => void;
  staff: Staff[];
  addStaff: (s: Staff) => void;
  updateStaff: (id: string, patch: Partial<Staff>) => void;
  notifications: NotificationItem[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  activeBroadcast: { id: string; title: string; body: string; time: string; sender: string } | null;
  sendBroadcast: (title: string, body: string) => void;
  dismissBroadcast: () => void;
  guestRequests: GuestRequest[];
  staffRequests: StaffRequest[];
  setGuestRequestStatus: (id: string, status: GuestRequest["status"]) => void;
  setStaffRequestStatus: (id: string, status: StaffRequest["status"]) => void;
  messages: ChatMessage[];
  sendMessage: (topic: string, text: string) => void;
  activity: { id: string; text: string; time: string }[];
  pushActivity: (text: string) => void;
  auditLog: { id: string; action: string; detail: string; by: string; time: string }[];
  pushAudit: (action: string, detail: string) => void;
  
  // Custom receptionist state fields (Backend integration ready)
  reservations: Reservation[];
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  refreshReservations: () => Promise<void>;
  bookings: Booking[];
  preRegistrations: PreRegistration[];
  leaveRequests: LeaveRequest[];
  attendanceLogs: AttendanceLog[];
  taskHistory: TaskHistoryItem[];
  forceCheckoutRecords: ForceCheckoutRecord[];
  createBooking: (booking: Omit<Booking, "id" | "createdAt">) => void;
  approvePreRegistration: (id: string) => void;
  rejectPreRegistration: (id: string, reason: string) => void;
  checkInGuest: (reservationId: string) => void;
  acceptTask: (taskId: string) => void;
  startTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  verifyTask: (taskId: string) => void;
  rejectTaskVerification: (taskId: string, reason?: string) => void;
  requestHelp: (taskId: string) => void;
  sendLeaveRequest: (reason: string) => void;
  assignNewTask: (task: Omit<Task, "id" | "assignedAt">) => void;
  updateTaskPriority: (taskId: string, priority: Priority) => void;
  reassignTask: (taskId: string, newAssignedTo: string) => void;
  cancelTask: (taskId: string) => void;
  checkOutGuest: (roomNumber: string) => void;
  createCustomerRequestTask: (params: {
    roomNumber: string;
    requestType: string;
    description?: string;
  }) => void;
  forceCheckOutGuest: (params: {
    roomNumber: string;
    reason: string;
    additionalNotes?: string;
  }) => void;
  recordAttendance: () => void;
  triggerN8nWebhook: (event: string, payload: any) => Promise<void>;
  newReceptionTaskAlert: Task | null;
  setNewReceptionTaskAlert: React.Dispatch<React.SetStateAction<Task | null>>;
  realtimeRequests: RealtimeRequest[];
  createRealtimeRequest: (req: Omit<RealtimeRequest, "id" | "timeReceived" | "timestamp" | "status">) => void;
  acceptRealtimeRequest: (id: string) => void;
  rejectRealtimeRequest: (id: string, reason: string) => void;
  forwardRealtimeRequest: (id: string, targetDept: string) => void;
  markPendingRealtimeRequest: (id: string) => void;
  completeRealtimeRequest: (id: string) => void;
};

const AppContext = createContext<AppState | null>(null);

const now = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const STAFF_PROFILES: Record<RoleId, { name: string; employeeId: string; shift: string }> = {
  reception: { name: "Anita Sharma", employeeId: "EMP-1001", shift: "07:00 - 15:00" },
  housekeeping: { name: "Grace Okafor", employeeId: "EMP-1003", shift: "08:00 - 16:00" },
  maintenance: { name: "Ravi Kumar", employeeId: "EMP-1002", shift: "06:00 - 14:00" },
  fnb: { name: "Mei Tanaka", employeeId: "EMP-1005", shift: "10:00 - 18:00" },
  manager: { name: "Daniel Okoye", employeeId: "EMP-1010", shift: "09:00 - 19:00" },
};

export function normalizeWorkflowTask(t: any): Task {
  const id = String(t.TaskID || t.taskId || t.id || `HK-${Math.random().toString(36).substring(2, 7)}`);
  const room = String(t.RoomNumber || t.roomNumber || t.room || "101");
  const type = String(t.CleaningType || t.cleaningType || t.type || t.title || "Standard Cleaning");
  const rawPriority = String(t.Priority || t.priority || "Medium");

  let priority: Priority = "Medium";
  const lowerP = rawPriority.toLowerCase();
  if (lowerP.includes("high") || lowerP.includes("urgent")) priority = "High";
  else if (lowerP.includes("low")) priority = "Low";
  else priority = "Medium";

  const rawStatus = String(t.Status || t.status || "Pending");
  let status: TaskStatus = "Pending";
  const lowerS = rawStatus.toLowerCase();
  if (lowerS.includes("progress")) status = "In Progress";
  else if (lowerS.includes("complete")) status = "Completed";
  else if (lowerS.includes("attention") || lowerS.includes("reassigned")) status = "Attention Needed";
  else status = "Pending";

  const assignedAt = String(t.AssignedTime || t.assignedTime || t.assignedAt || t.time || "09:00 AM");
  const description = String(t.Description || t.description || `${type} for Room ${room}`);
  const eta = String(t.ETA || t.eta || "30 min");

  return {
    id,
    room,
    type,
    priority,
    assignedAt,
    description,
    eta,
    status,
    role: "housekeeping",
    TaskID: id,
    RoomNumber: room,
    CleaningType: type,
    Priority: priority,
    AssignedStaff: String(t.AssignedStaff || t.assignedStaff || ""),
    Status: status,
    AssignedTime: assignedAt,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedRole, setSelectedRoleState] = useState<RoleId | null>(null);
  const [session, setSession] = useState<Session>(null);
  const [onDuty, setOnDuty] = useState(false);
  const [dutyStart, setDutyStart] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  // Phase 8: rooms, staff, notifications, reservations start empty — populated from FastAPI
  const [rooms, setRooms] = useState<Room[]>([]);
  const [orders, setOrders] = useState<FoodOrder[]>(ORDERS);
  const [tickets, setTickets] = useState<Ticket[]>(() =>
    TICKETS.map((t) =>
      t.id === "M-501" ? { ...t, status: "Open", technician: "Unassigned" } : t,
    ),
  );
  const [staff, setStaff] = useState<Staff[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeBroadcast, setActiveBroadcast] = useState<{ id: string; title: string; body: string; time: string; sender: string } | null>(null);
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>(GUEST_REQUESTS);
  const [staffRequests, setStaffRequests] = useState<StaffRequest[]>(STAFF_REQUESTS);
  const [activity, setActivity] = useState(ACTIVITY);
  const [auditLog, setAuditLog] = useState(AUDIT_LOG);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "C-1", from: "manager", topic: "Announcement", text: "Good morning team. VIP arrival at 13:00 in room 512.", time: "08:30" },
    { id: "C-2", from: "me", topic: "Message Manager", text: "Noted. Room 512 will be ready by 12:00.", time: "08:34" },
  ]);

  // Receptionist Backend Simulated DB tables
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [preRegistrations, setPreRegistrations] = useState<PreRegistration[]>([
    {
      id: "PR-101",
      guestName: "Samantha Miller",
      phone: "+91 95400 12345",
      email: "samantha.m@example.com",
      guestCount: 2,
      parking: true,
      specialRequests: "High floor preferred, quiet room.",
      arrivalDate: "Today",
      roomType: "Executive Suite",
      status: "Pending"
    },
    {
      id: "PR-102",
      guestName: "Rajesh Koothrappali",
      phone: "+91 99111 88776",
      email: "rajesh.k@example.com",
      guestCount: 1,
      parking: false,
      specialRequests: "Aromatic diffuser in room and extra towels.",
      arrivalDate: "Tomorrow",
      roomType: "Deluxe King",
      status: "Pending"
    }
  ]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: "LV-201",
      staffName: "Anita Sharma",
      role: "reception",
      reason: "Medical checkup - dentist appointment",
      status: "Pending",
      submittedAt: "Yesterday"
    }
  ]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([]);
  const [forceCheckoutRecords, setForceCheckoutRecords] = useState<ForceCheckoutRecord[]>([]);
  const [newReceptionTaskAlert, setNewReceptionTaskAlert] = useState<Task | null>(null);

  // Phase 8: realtimeRequests starts EMPTY — populated from GET /api/operations/feed and real WebSocket events only.
  // Do NOT pre-populate with fake events. Admin must trust these came from the backend.
  const [realtimeRequests, setRealtimeRequests] = useState<RealtimeRequest[]>([]);

  /**
   * @deprecated Phase 8: n8n webhook calls removed from all core flows.
   * This is a no-op stub retained for component interface compatibility during migration.
   * Core operations use FastAPI directly. Do NOT fire real webhook requests from here.
   */
  const triggerN8nWebhook = async (event: string, payload: unknown): Promise<void> => {
    _triggerN8nWebhookNoOp(event, payload);
  };

  // Phase 8: Restore session from FastAPI JWT on mount.
  // Only a valid GET /api/auth/me response establishes authentication.
  // Legacy localStorage keys ("stayease", "stayease_auth_token") are cleared and ignored.
  const sessionRestoredRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;

    // Clear legacy session data that may exist from old webhook-based sessions
    window.localStorage.removeItem("stayease");
    window.localStorage.removeItem("stayease_auth_token");

    const token = getToken();
    if (!token) return;

    // Validate token against backend before restoring session
    getMe().then((staff: ApiStaff) => {
      const uiRole = mapBackendRole(staff.role);
      setSelectedRoleState(uiRole);
      setSession(buildSession(staff, token));
      setOnDuty(staff.duty_status === "on_duty");
    }).catch(() => {
      // Token invalid or expired — clear it silently
      removeToken();
    });
  }, []);

  const refreshReservations = useCallback(async () => {
    try {
      const data = await listReservations();
      const mapped: Reservation[] = data.map((r) => ({
        id: r.reservation_id,
        guest: r.guest_name || `Guest #${r.guest_id}`,
        arrival: new Date(r.check_in).toLocaleDateString(),
        room: r.room_number || "TBD",
        status: r.status === "checked_in" ? "Checked In" : r.status === "booked" ? "Pending" : "Confirmed",
      }));
      setReservations(mapped);
    } catch {
      // silent background retry
    }
  }, []);

  // Register global 401 handler — fires once, redirects to login
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setSession(null);
      setOnDuty(false);
      staffWS.disconnect();
      toast.error("Session expired. Please log in again.");
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    });
  }, []);

  // Subscribe to Production Backend Real-Time Event Stream (WebSocket / SSE)
  useEffect(() => {
    const handleCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail as RealtimeRequest;
      setRealtimeRequests((prev) => [detail, ...prev]);
    };
    const handleUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as RealtimeRequest;
      setRealtimeRequests((prev) => prev.map((r) => (r.id === detail.id ? { ...r, ...detail } : r)));
    };
    const handleCompleted = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; completedAt: string };
      setRealtimeRequests((prev) => prev.map((r) => (r.id === detail.id ? { ...r, status: "Completed", completedAt: detail.completedAt } : r)));
    };

    RequestRealtimeBus.addEventListener("request.created", handleCreated);
    RequestRealtimeBus.addEventListener("request.updated", handleUpdated);
    RequestRealtimeBus.addEventListener("request.accepted", handleUpdated);
    RequestRealtimeBus.addEventListener("request.forwarded", handleUpdated);
    RequestRealtimeBus.addEventListener("request.completed", handleCompleted);

    return () => {
      RequestRealtimeBus.removeEventListener("request.created", handleCreated);
      RequestRealtimeBus.removeEventListener("request.updated", handleUpdated);
      RequestRealtimeBus.removeEventListener("request.accepted", handleUpdated);
      RequestRealtimeBus.removeEventListener("request.forwarded", handleUpdated);
      RequestRealtimeBus.removeEventListener("request.completed", handleCompleted);
    };
  }, []);

  const pushActivity = (text: string) =>
    setActivity((prev) => [{ id: `A-${prev.length + 100}`, text, time: now() }, ...prev]);

  const pushAudit = (action: string, detail: string) =>
    setAuditLog((prev) => [
      {
        id: `L-${prev.length + 100}`,
        action,
        detail,
        by: session?.name ?? "Manager",
        time: `Today ${now()}`,
      },
      ...prev,
    ]);

  const sendBroadcast = (title: string, body: string) => {
    const timeStr = `Today ${now()}`;
    const senderName = session?.name ?? "General Manager";
    const newNotif: NotificationItem = {
      id: `N-BC-${Date.now()}`,
      title: `📣 ${title}`,
      body,
      time: "Just now",
      kind: "announcement",
      read: false,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    setActiveBroadcast({
      id: newNotif.id,
      title,
      body,
      time: timeStr,
      sender: senderName,
    });

    pushActivity(`Manager Broadcast sent to all staff: "${title}"`);
    pushAudit("Manager Broadcast Sent", `Title: "${title}", Message: "${body}"`);
    void triggerN8nWebhook("broadcast_announcement", {
      Title: title,
      Body: body,
      Sender: senderName,
      Time: timeStr,
      Notifications: [newNotif],
    });
  };

  const dismissBroadcast = () => {
    setActiveBroadcast(null);
  };

  const getAutoAssignedStaff = (role: RoleId): string => {
    const staffPool: Record<RoleId, string[]> = {
      housekeeping: ["Grace Okafor", "Carlos Ruiz", "Anita Sharma"],
      maintenance: ["Ravi Kumar", "David Miller"],
      fnb: ["Mei Tanaka"],
      reception: ["Anita Sharma"],
      manager: ["Manager"],
    };

    const pool = staffPool[role] || ["Grace Okafor"];
    const counts = pool.map((name) => ({
      name,
      count: tasks.filter((t) => t.assignedTo === name && t.status !== "Completed").length,
    }));
    counts.sort((a, b) => a.count - b.count);
    return counts[0]?.name || pool[0]!;
  };

  const recordAttendance = () => {
    console.log("API CALL: POST /api/attendance/signin", { staff: session?.name });
    const log: AttendanceLog = {
      id: `ATT-${Date.now()}`,
      staffName: session?.name ?? "Receptionist",
      role: session?.role ?? "reception",
      date: new Date().toLocaleDateString(),
      signInTime: now(),
      status: "On Duty"
    };
    setAttendanceLogs(prev => [log, ...prev]);
    void triggerN8nWebhook("attendance_signin", { Attendance: log });
  };

  const value = useMemo<AppState>(
    () => ({
      selectedRole,
      setSelectedRole: (r) => setSelectedRoleState(r),
      session,
      // Phase 8: login() accepts ApiStaff from backend + the JWT access_token
      login: (role, identifier, userData?: any, workflowTasks?: any[]) => {
        // userData is ApiStaff when coming from FastAPI login
        // The token is stored separately in localStorage by login.tsx before calling login()
        const token = getToken() ?? "";
        const uiRole = mapBackendRole(userData?.role ?? role);
        setSelectedRoleState(uiRole);
        setSession(buildSession(userData, token));
        setOnDuty(userData?.duty_status === "on_duty" ?? true);
        setDutyStart(now());
        setTasks([]);
      },
      logout: () => {
        removeToken();
        staffWS.disconnect();
        setSession(null);
        setOnDuty(false);
        setDutyStart(null);
        setTasks([]);
        setRooms([]);
        setStaff([]);
        setNotifications([]);
        setReservations([]);
      },
      onDuty,
      dutyStart,
      toggleDuty: () => {
        // Phase 8: Calls FastAPI PATCH /api/staff/me/duty-status
        // Does NOT optimistically update local state — waits for API confirmation.
        const targetStatus = onDuty ? "off_duty" : "on_duty";
        updateMyDutyStatus(targetStatus).then((updated) => {
          const newOnDuty = updated.duty_status === "on_duty";
          setOnDuty(newOnDuty);
          if (newOnDuty) {
            setDutyStart(now());
            toast.success("Duty started.");
            pushActivity(`${session?.name ?? "Staff"} started duty`);
          } else {
            setDutyStart(null);
            toast.info("Duty ended.");
            pushActivity(`${session?.name ?? "Staff"} ended duty`);
          }
        }).catch((err: { status?: number; message?: string }) => {
          if (err?.status === 409) {
            toast.error(err.message || "Cannot go off duty — you have active tasks assigned.");
          } else {
            toast.error("Failed to update duty status. Please try again.");
          }
        });
      },
      tasks,
      setTasks,
      setTaskStatus: (id, status) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === id || (t as any).TaskID === id ? { ...t, status, Status: status } : t))
        );
      },
      rooms,
      setRooms,
      setRoomStatus: (num, status) =>
        setRooms((prev) => prev.map((r) => (r.number === num ? { ...r, status } : r))),
      orders,
      setOrderStatus: (id, status) =>
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o))),
      tickets,
      setTicketStatus: (id, status, technician) =>
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status, ...(technician ? { technician } : {}) } : t,
          ),
        ),
      staff,
      addStaff: (s) => {
        setStaff((prev) => [s, ...prev]);
        pushActivity(`Admin added new staff member: ${s.name} (${roleName(s.role)})`);
        pushAudit("Add Staff", `Admin added staff user '${s.name}' to ${s.role} department`);
        void triggerN8nWebhook("admin_add_staff", { newStaff: s });
      },
      removeStaff: (id: string) => {
        const target = staff.find((s) => s.id === id || s.staffId === id);
        setStaff((prev) => prev.filter((s) => s.id !== id && s.staffId !== id));
        if (target) {
          pushActivity(`Admin removed staff member: ${target.name} (${roleName(target.role)})`);
          pushAudit("Remove Staff", `Admin removed staff user '${target.name}' from Google Sheet database`);
          void triggerN8nWebhook("remove_staff", { staffId: target.staffId || target.id, email: target.email, name: target.name });
        }
      },
      updateStaff: (id, patch) =>
        setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
      notifications,
      markRead: (id) =>
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      activeBroadcast,
      sendBroadcast,
      dismissBroadcast,
      guestRequests,
      staffRequests,
      setGuestRequestStatus: (id, status) =>
        setGuestRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r))),
      setStaffRequestStatus: (id, status) =>
        setStaffRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r))),
      messages,
      sendMessage: (topic, text) => {
        const fromVal = topic === "Customer Chat" ? "customer" : "me";
        const newMsg: ChatMessage = { id: `C-${messages.length + 1}`, from: fromVal as any, topic, text, time: now() };
        setMessages((prev) => [...prev, newMsg]);

        // Trigger Notification
        const notif: NotificationItem = {
          id: `N-MSG-${Date.now()}`,
          title: `New message from ${topic}`,
          body: text,
          time: "Just now",
          kind: "announcement",
          read: false
        };
        setNotifications((prev) => [notif, ...prev]);

        void triggerN8nWebhook("message_sent", { Message: newMsg, Notification: notif });
      },
      activity,
      pushActivity,
      auditLog,
      pushAudit,

      // Custom receptionist integrations
      reservations,
      setReservations,
      bookings,
      preRegistrations,
      leaveRequests,
      attendanceLogs,
      taskHistory,
      createBooking: (bookingData) => {
        console.log("API CALL: POST /api/bookings", bookingData);
        const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
        const newBooking: Booking = {
          ...bookingData,
          id: bookingId,
          createdAt: new Date().toISOString()
        };
        setBookings((prev) => [newBooking, ...prev]);

        // Add a Reservation item
        const resId = `R-${Math.floor(9100 + Math.random() * 900)}`;
        const newRes: Reservation = {
          id: resId,
          guest: bookingData.guestName,
          arrival: bookingData.checkIn,
          room: bookingData.roomNumber || "TBD",
          status: "Confirmed"
        };
        setReservations((prev) => [newRes, ...prev]);

        // If a room number was specified, update that room's status to Reserved
        if (bookingData.roomNumber) {
          setRooms((prev) => prev.map((r) => r.number === bookingData.roomNumber ? { ...r, status: "Reserved", guest: bookingData.guestName } : r));
        }

        // Notify Manager
        const notif: NotificationItem = {
          id: `N-BK-${Date.now()}`,
          title: "New Guest Booking",
          body: `${bookingData.guestName} booked room ${bookingData.roomNumber || "TBD"} (${bookingData.roomType})`,
          time: "Just now",
          kind: "guest",
          read: false
        };
        setNotifications((prev) => [notif, ...prev]);
        pushActivity(`Guest ${bookingData.guestName} booked Room ${bookingData.roomNumber || "TBD"}`);

        void triggerN8nWebhook("booking_created", { Booking: newBooking, Reservation: newRes, Notification: notif, RoomUpdate: bookingData.roomNumber ? { number: bookingData.roomNumber, status: "Reserved" } : null });
      },
      approvePreRegistration: (id) => {
        console.log("API CALL: POST /api/pre-registrations/approve", { id });
        setPreRegistrations((prev) => prev.map((p) => p.id === id ? { ...p, status: "Approved" } : p));
        const item = preRegistrations.find((p) => p.id === id);
        if (item) {
          toast.success(`Pre-registration approved for ${item.guestName}.`);
          pushActivity(`Approved pre-registration for ${item.guestName}`);

          // Create a reservation for them
          const resId = `R-${Math.floor(9200 + Math.random() * 800)}`;
          const newRes: Reservation = {
            id: resId,
            guest: item.guestName,
            arrival: item.arrivalDate,
            room: "TBD",
            status: "Pending"
          };
          setReservations((prev) => [newRes, ...prev]);

          // Notify Manager
          const notif = {
            id: `N-PR-APP-${Date.now()}`,
            title: "Pre-registration Approved",
            body: `Approved guest ${item.guestName} for arrival on ${item.arrivalDate}`,
            time: "Just now",
            kind: "guest" as const,
            read: false
          };
          setNotifications((prev) => [notif, ...prev]);

          void triggerN8nWebhook("preregistration_approved", { PreRegistration: { ...item, status: "Approved" }, Reservation: newRes, Notification: notif });
        }
      },
      rejectPreRegistration: (id, reason) => {
        console.log("API CALL: POST /api/pre-registrations/reject", { id, reason });
        setPreRegistrations((prev) => prev.map((p) => p.id === id ? { ...p, status: "Rejected", rejectionReason: reason } : p));
        const item = preRegistrations.find((p) => p.id === id);
        if (item) {
          toast.error(`Pre-registration rejected for ${item.guestName}.`);
          pushActivity(`Rejected pre-registration for ${item.guestName}. Reason: ${reason}`);

          // Notify Customer
          const notif = {
            id: `N-PR-REJ-${Date.now()}`,
            title: "Pre-registration Rejected",
            body: `Your pre-registration was rejected. Reason: ${reason}`,
            time: "Just now",
            kind: "guest" as const,
            read: false
          };
          setNotifications((prev) => [notif, ...prev]);

          void triggerN8nWebhook("preregistration_rejected", { PreRegistration: { ...item, status: "Rejected", rejectionReason: reason }, Notification: notif });
        }
      },
      refreshReservations,
      checkInGuest: (resId) => {
        const res = reservations.find((r) => r.id === resId);
        const guestName = res?.guest || "Guest";
        const roomNum = res?.room || "Room";

        checkInReservation(resId)
          .then(() => {
            toast.success(`${guestName} successfully checked in to Room ${roomNum}!`);
            pushActivity(`Guest ${guestName} checked into Room ${roomNum}`);
            void refreshReservations();
          })
          .catch((err: { message?: string }) => {
            toast.error(err?.message || `Failed to check in ${guestName}.`);
          });
      },
      acceptTask: (taskId) => {
        console.log("API CALL: POST /api/tasks/accept", { taskId });
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "Accepted" as any } : t));
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          pushActivity(`Task ${taskId} accepted for Room ${task.room}`);
          void triggerN8nWebhook("task_accepted", { TaskId: taskId, Room: task.room });
        }
      },
      startTask: (taskId) => {
        console.log("API CALL: POST /api/tasks/start", { taskId });
        const task = tasks.find((t) => t.id === taskId);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "In Progress" } : t)));
        if (task) {
          // Live Room Status Synchronization
          if (task.room && task.room !== "Lobby" && !task.room.startsWith("Floor")) {
            setRooms((prev) =>
              prev.map((r) => {
                if (r.number === task.room && r.status !== "Occupied" && r.status !== "Reserved") {
                  const newStatus: RoomStatus =
                    task.role === "maintenance" ? "Under Maintenance" : "Cleaning In Progress";
                  return { ...r, status: newStatus };
                }
                return r;
              })
            );
          }

          pushAudit(
            "Task Started",
            `Task ${taskId} started for Room ${task.room}. Room status updated to ${
              task.role === "maintenance" ? "Under Maintenance" : "Cleaning In Progress"
            }`
          );
          pushActivity(`Task ${taskId} started for Room ${task.room}`);
          void triggerN8nWebhook("task_started", { TaskId: taskId, Room: task.room });
        }
      },
      completeTask: (taskId) => {
        console.log("API CALL: POST /api/tasks/complete", { taskId });
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          // Set status to Completed in task queue so Receptionist can verify
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "Completed" } : t)));

          // Live Room Status Synchronization -> Waiting Verification (NOT Available!)
          if (task.room && task.room !== "Lobby" && !task.room.startsWith("Floor")) {
            setRooms((prev) =>
              prev.map((r) => {
                if (r.number === task.room && r.status !== "Occupied" && r.status !== "Reserved") {
                  const newStatus: RoomStatus =
                    task.role === "maintenance"
                      ? "Waiting Maintenance Verification"
                      : "Waiting Cleaning Verification";
                  return { ...r, status: newStatus };
                }
                return r;
              })
            );
          }

          pushAudit(
            "Task Completed (Awaiting Verification)",
            `Task ${taskId} completed for Room ${task.room}. Room status updated to ${
              task.role === "maintenance" ? "Waiting Maintenance Verification" : "Waiting Cleaning Verification"
            }`
          );
          pushActivity(`Task ${taskId} completed for Room ${task.room}. Awaiting Receptionist Verification.`);
          toast.info(`Task ${taskId} completed. Room ${task.room} is now Waiting Verification.`);

          const notif = {
            id: `N-TC-${Date.now()}`,
            title: "Task Completed - Verification Required",
            body: `Task ${taskId} completed for Room ${task.room}. Verification required before making Available.`,
            time: "Just now",
            kind: "task" as const,
            read: false,
          };
          setNotifications((prev) => [notif, ...prev]);

          void triggerN8nWebhook("task_completed", { TaskId: taskId, Room: task.room, Notification: notif });
        }
      },
      verifyTask: (taskId) => {
        console.log("API CALL: POST /api/tasks/verify", { taskId });
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          // 1. Remove from active tasks list
          setTasks((prev) => prev.filter((t) => t.id !== taskId));

          // 2. Add to Task History
          const historyItem: TaskHistoryItem = {
            id: `TH-${Date.now()}`,
            taskId,
            room: task.room,
            type: task.type,
            role: task.role,
            completedAt: new Date().toISOString(),
          };
          setTaskHistory((prev) => [historyItem, ...prev]);

          // 3. Dual Dependency Logic & Room Status Update
          if (task.room && task.room !== "Lobby" && !task.room.startsWith("Floor")) {
            const remainingOtherTasks = tasks.filter(
              (t) => t.id !== taskId && t.room === task.room && t.status !== "Completed"
            );
            const remainingMaint = remainingOtherTasks.filter((t) => t.role === "maintenance");
            const remainingClean = remainingOtherTasks.filter((t) => t.role === "housekeeping");

            let targetStatus: RoomStatus = "Available";
            if (remainingMaint.length > 0) {
              targetStatus = "Maintenance Required";
            } else if (remainingClean.length > 0) {
              targetStatus = "Cleaning Required";
            }

            setRooms((prev) =>
              prev.map((r) =>
                r.number === task.room && r.status !== "Occupied" && r.status !== "Reserved"
                  ? { ...r, status: targetStatus, cleaningType: undefined, priority: undefined }
                  : r
              )
            );
          }

          // 4. Audit Log & Notifications
          pushAudit(
            "Task Verified & Approved",
            `Receptionist approved evidence for Task ${taskId} (Room ${task.room}). Dual dependency checked.`
          );
          pushActivity(`Task ${taskId} verified & approved. Room ${task.room} status updated.`);

          const notif: NotificationItem = {
            id: `N-VER-${Date.now()}`,
            title: "✅ Task Verified & Approved",
            body: `Receptionist verified evidence for Task ${taskId} (Room ${task.room}).`,
            time: "Just now",
            kind: "task",
            read: false,
          };
          setNotifications((prev) => [notif, ...prev]);

          void triggerN8nWebhook("task_verified", { TaskId: taskId, Room: task.room, Notification: notif });
          toast.success(`Task ${taskId} verified & approved! Room ${task.room} status updated.`);
        }
      },
      rejectTaskVerification: (taskId, reason) => {
        console.log("API CALL: POST /api/tasks/reject-verification", { taskId, reason });
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          const autoStaff = getAutoAssignedStaff(task.role);
          const isMaint = task.role === "maintenance";
          const newReTaskType = isMaint ? "Re-Fix Maintenance Issue" : "Re-Clean Room";
          const newRoomStatus: RoomStatus = isMaint ? "Maintenance Required" : "Cleaning Required";

          // 1. Update task description & priority to Urgent
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    type: newReTaskType,
                    status: "Attention Needed",
                    priority: "Urgent",
                    description: `[REJECTED VERIFICATION]: ${reason || "Work failed inspection. Mandatory re-clean."}`,
                    assignedTo: autoStaff,
                  }
                : t
            )
          );

          // 2. Set Room status back to Cleaning Required / Maintenance Required (NOT Available!)
          if (task.room && task.room !== "Lobby" && !task.room.startsWith("Floor")) {
            setRooms((prev) =>
              prev.map((r) =>
                r.number === task.room && r.status !== "Occupied" && r.status !== "Reserved"
                  ? {
                      ...r,
                      status: newRoomStatus,
                      cleaningType: `Re-clean: ${reason}`,
                      priority: "Urgent",
                    }
                  : r
              )
            );
          }

          pushAudit(
            "Task Verification Rejected",
            `Receptionist rejected Task ${taskId} (Room ${task.room}). Auto-generated ${newReTaskType} assigned to ${autoStaff}. Reason: ${reason}`
          );
          pushActivity(`Task ${taskId} rejected for Room ${task.room}. Status set to ${newRoomStatus}.`);

          const notif: NotificationItem = {
            id: `N-REJ-${Date.now()}`,
            title: `⚠️ Task Rejected: ${newReTaskType}`,
            body: `Room ${task.room} failed inspection. Reason: ${reason}. Re-assigned to ${autoStaff}.`,
            time: "Just now",
            kind: "task",
            read: false,
          };
          setNotifications((prev) => [notif, ...prev]);

          void triggerN8nWebhook("task_rejected", { TaskId: taskId, Room: task.room, Reason: reason, Notification: notif });
          toast.warning(`Task ${taskId} rejected! New ${newReTaskType} auto-assigned to ${autoStaff}.`);
        }
      },
      requestHelp: (taskId) => {
        console.log("API CALL: POST /api/tasks/help", { taskId });
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "Attention Needed" } : t));
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          pushActivity(`Help requested for Task ${taskId} in Room ${task.room}`);
          toast.warning("Help request submitted to Manager.");

          const notif = {
            id: `N-TH-${Date.now()}`,
            title: "Need Help Alert",
            body: `${session?.name ?? "Receptionist"} requested help for task ${taskId} (Room ${task.room})`,
            time: "Just now",
            kind: "emergency" as const,
            read: false
          };
          setNotifications((prev) => [notif, ...prev]);

          void triggerN8nWebhook("task_help_requested", { TaskId: taskId, Staff: session?.name, Notification: notif });
        }
      },
      sendLeaveRequest: (reason) => {
        console.log("API CALL: POST /api/leave-requests", { reason });
        const requestId = `LV-${Math.floor(1000 + Math.random() * 9000)}`;
        const newRequest: LeaveRequest = {
          id: requestId,
          staffName: session?.name ?? "Anita Sharma",
          role: session?.role ?? "reception",
          reason,
          status: "Pending",
          submittedAt: new Date().toISOString()
        };
        setLeaveRequests((prev) => [newRequest, ...prev]);

        const notif = {
          id: `N-LV-${Date.now()}`,
          title: "New Leave Request",
          body: `${session?.name ?? "Receptionist"} requested leave: "${reason}"`,
          time: "Just now",
          kind: "announcement" as const,
          read: false
        };
        setNotifications((prev) => [notif, ...prev]);
        pushActivity(`Leave request submitted by ${session?.name}`);

        void triggerN8nWebhook("leave_requested", { LeaveRequest: newRequest, Notification: notif });
      },
      assignNewTask: (taskData) => {
        console.log("API CALL: POST /api/tasks", taskData);
        const taskId = `T-${Math.floor(1000 + Math.random() * 9000)}`;
        const autoAssignedStaff = taskData.assignedTo || getAutoAssignedStaff(taskData.role);
        const roomObj = rooms.find((r) => r.number === taskData.room);
        const aiPriority = calculateAiTaskPriority(taskData, roomObj);

        const newTask: Task = {
          ...taskData,
          id: taskId,
          priority: aiPriority,
          assignedTo: autoAssignedStaff,
          assignedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setTasks((prev) => [newTask, ...prev]);

        pushAudit(
          "AI Task Prioritization",
          `AI Engine assigned priority [${aiPriority}] for Task ${taskId} (${taskData.type}) Room ${taskData.room}. Auto-assigned to ${autoAssignedStaff}`
        );
        pushActivity(`Task ${taskId} AI-prioritized as ${aiPriority} and auto-assigned to ${autoAssignedStaff}`);

        const notif: NotificationItem = {
          id: `N-TNEW-${Date.now()}`,
          title: "⚡ Task Auto-Assigned",
          body: `Task ${taskId} (${taskData.type}) auto-assigned to ${autoAssignedStaff} for Room ${taskData.room}`,
          time: "Just now",
          kind: "task",
          read: false,
        };
        setNotifications((prev) => [notif, ...prev]);

        if (newTask.role === "reception") {
          setNewReceptionTaskAlert(newTask);
        }

        void triggerN8nWebhook("task_assigned", { Task: newTask, Notification: notif });
        toast.success(`Task ${taskId} auto-assigned to ${autoAssignedStaff}!`);
      },
      updateTaskPriority: (taskId, priority) => {
        console.log("API CALL: PATCH /api/tasks/" + taskId, { priority });
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
        pushAudit("Task Priority Change", `Updated priority of Task ${taskId} to ${priority}`);
        toast.info(`Task ${taskId} priority updated to ${priority}.`);
        void triggerN8nWebhook("task_priority_updated", { taskId, priority });
      },
      reassignTask: (taskId, newAssignedTo) => {
        console.log("API CALL: PATCH /api/tasks/" + taskId, { assignedTo: newAssignedTo });
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, assignedTo: newAssignedTo } : t)));
        pushAudit("Task Reassigned", `Reassigned Task ${taskId} to ${newAssignedTo}`);
        toast.info(`Task ${taskId} reassigned to ${newAssignedTo}.`);
        void triggerN8nWebhook("task_reassigned", { taskId, newAssignedTo });
      },
      cancelTask: (taskId) => {
        console.log("API CALL: DELETE /api/tasks/" + taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        pushAudit("Task Cancelled", `Cancelled Task ${taskId}`);
        toast.warning(`Task ${taskId} cancelled.`);
        void triggerN8nWebhook("task_cancelled", { taskId });
      },
      checkOutGuest: (roomNumber) => {
        console.log("API CALL: POST /api/checkout", { roomNumber });
        const targetRoom = rooms.find((r) => r.number === roomNumber);
        const guestName = targetRoom?.guest || "Guest";

        // 1. Update room status to Cleaning & clear guest
        setRooms((prev) =>
          prev.map((r) =>
            r.number === roomNumber
              ? {
                  ...r,
                  status: "Cleaning",
                  guest: undefined,
                  cleaningType: "Turnover Deep Clean",
                  priority: "Urgent",
                }
              : r
          )
        );

        // 2. Automatically assign a cleaning task to optimal housekeeping staff
        const autoStaff = getAutoAssignedStaff("housekeeping");
        const taskId = `T-AUTO-HK-${Date.now()}`;
        const autoTask: Task = {
          id: taskId,
          room: roomNumber,
          type: "Turnover Deep Clean",
          priority: "Urgent",
          assignedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          description: `Automated turnover task generated upon check-out of ${guestName}.`,
          eta: "30 min",
          status: "Pending",
          role: "housekeeping",
          assignedTo: autoStaff,
        };
        setTasks((prev) => [autoTask, ...prev]);

        pushAudit("Automated Checkout Turnover", `Checked out ${guestName} from Room ${roomNumber}. Turnover task auto-assigned to ${autoStaff}`);
        pushActivity(`Guest ${guestName} checked out of Room ${roomNumber}. Turnover task auto-assigned to ${autoStaff}.`);

        const notif: NotificationItem = {
          id: `N-CO-${Date.now()}`,
          title: "⚡ Auto Task Assigned: Checkout Turnover",
          body: `Room ${roomNumber} turnover task auto-assigned to ${autoStaff} following ${guestName}'s checkout.`,
          time: "Just now",
          kind: "task",
          read: false,
        };
        setNotifications((prev) => [notif, ...prev]);

        void triggerN8nWebhook("guest_checked_out", { roomNumber, guestName, autoTask, Notification: notif });
        toast.success(`${guestName} checked out. Turnover task auto-assigned to ${autoStaff}!`);
      },
      createCustomerRequestTask: ({ roomNumber, requestType, description }) => {
        const targetRole: RoleId = requestType.toLowerCase().includes("repair") || requestType.toLowerCase().includes("ac") || requestType.toLowerCase().includes("plumbing")
          ? "maintenance"
          : requestType.toLowerCase().includes("food") || requestType.toLowerCase().includes("towel") || requestType.toLowerCase().includes("clean")
          ? "housekeeping"
          : "reception";

        const autoStaff = getAutoAssignedStaff(targetRole);
        const taskId = `T-REQ-${Date.now()}`;
        const autoTask: Task = {
          id: taskId,
          room: roomNumber,
          type: requestType,
          priority: "High",
          assignedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          description: description || `Guest request: ${requestType} for Room ${roomNumber}`,
          eta: "20 min",
          status: "Pending",
          role: targetRole,
          assignedTo: autoStaff,
        };
        setTasks((prev) => [autoTask, ...prev]);

        pushAudit("Guest Request Auto-Assigned", `Auto-assigned guest request "${requestType}" for Room ${roomNumber} to ${autoStaff}`);
        pushActivity(`Guest request "${requestType}" auto-assigned to ${autoStaff}`);

        const notif: NotificationItem = {
          id: `N-CREQ-${Date.now()}`,
          title: "⚡ Guest Request Auto-Assigned",
          body: `New request "${requestType}" for Room ${roomNumber} auto-assigned to ${autoStaff}.`,
          time: "Just now",
          kind: "task",
          read: false,
        };
        setNotifications((prev) => [notif, ...prev]);

        if (autoTask.role === "reception") {
          setNewReceptionTaskAlert(autoTask);
        }

        void triggerN8nWebhook("customer_request_created", { roomNumber, requestType, autoTask, Notification: notif });
        toast.success(`Guest request auto-assigned to ${autoStaff}!`);
      },
      forceCheckOutGuest: ({ roomNumber, reason, additionalNotes }) => {
        console.log("API CALL: POST /api/bookings/force-checkout", { roomNumber, reason, additionalNotes });

        const targetRoom = rooms.find((r) => r.number === roomNumber);
        const guestName = targetRoom?.guest || "Occupied Guest";
        const bookingId = `BK-${roomNumber}-${Math.floor(1000 + Math.random() * 9000)}`;
        const invoiceId = `INV-EV-${Math.floor(1000 + Math.random() * 9000)}`;
        const checkoutTime = new Date().toISOString();
        const pendingCharges = (targetRoom?.pricePerNight || 200) * 1.5;

        const record: ForceCheckoutRecord = {
          id: `FC-${Date.now()}`,
          bookingId,
          roomNumber,
          guestName,
          reason,
          ...(additionalNotes ? { additionalNotes } : {}),
          performedBy: session?.name || "Manager",
          performedRole: session?.role || "reception",
          checkoutTime,
          invoiceId,
          pendingCharges,
        };

        setForceCheckoutRecords((prev) => [record, ...prev]);

        // 1. Change room status to Cleaning and clear guest assignment
        setRooms((prev) =>
          prev.map((r) =>
            r.number === roomNumber
              ? {
                  ...r,
                  status: "Cleaning",
                  guest: undefined,
                  cleaningType: "Eviction Deep Clean",
                  priority: "Urgent",
                }
              : r
          )
        );

        // 2. Remove reservation if any
        setReservations((prev) => prev.filter((res) => res.room !== roomNumber));

        // 3. Add urgent housekeeping cleaning task auto-assigned to optimal staff
        const autoStaff = getAutoAssignedStaff("housekeeping");
        const newTask: Task = {
          id: `T-EVIC-${Date.now()}`,
          room: roomNumber,
          type: "Eviction Deep Clean",
          priority: "Urgent",
          assignedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          description: `Urgent turnover following force check-out for ${guestName}. Reason: ${reason}`,
          eta: "45 min",
          status: "Pending",
          role: "housekeeping",
          assignedTo: autoStaff,
        };
        setTasks((prev) => [newTask, ...prev]);

        // 4. Record in Audit Log (Permanent)
        pushAudit(
          "Force Check-Out / Eviction",
          `Evicted ${guestName} from Room ${roomNumber}. Reason: ${reason}. Invoice: ${invoiceId}. Notes: ${additionalNotes || "None"}`
        );
        pushActivity(`Force checked-out ${guestName} from Room ${roomNumber}`);

        // 5. Create notifications for Manager, Housekeeping, and Security
        const managerNotif: NotificationItem = {
          id: `N-FC-MGR-${Date.now()}`,
          title: "🚨 Force Check-Out Executed",
          body: `${session?.name || "Staff"} force checked-out ${guestName} from Room ${roomNumber}. Reason: ${reason}`,
          time: "Just now",
          kind: "emergency",
          read: false,
        };
        const hkNotif: NotificationItem = {
          id: `N-FC-HK-${Date.now()}`,
          title: "🧹 Urgent Turnover Required",
          body: `Room ${roomNumber} requires deep cleaning following force check-out.`,
          time: "Just now",
          kind: "task",
          read: false,
        };
        setNotifications((prev) => [managerNotif, hkNotif, ...prev]);

        // 6. Trigger n8n Webhook
        void triggerN8nWebhook("force_checkout", {
          bookingId,
          roomNumber,
          guestName,
          reason,
          additionalNotes,
          performedBy: session?.name,
          role: session?.role,
          invoiceId,
          pendingCharges,
          checkoutTime,
          bookingStatus: "Force Checked-Out",
          roomStatus: "Cleaning Required",
        });

        toast.error(`Force check-out executed for Room ${roomNumber}. Room status updated to Cleaning Required.`);
      },
      forceCheckoutRecords,
      recordAttendance,
      triggerN8nWebhook,
      newReceptionTaskAlert,
      setNewReceptionTaskAlert,
      realtimeRequests,
      createRealtimeRequest: (reqData) => {
        console.log("API CALL: POST /api/requests", reqData);
        const reqId = `REQ-${Math.floor(100 + Math.random() * 900)}`;
        const newReq: RealtimeRequest = {
          ...reqData,
          id: reqId,
          timeReceived: "Just now",
          timestamp: Date.now(),
          status: "New",
          escalationLevel: 0,
        };
        setRealtimeRequests((prev) => [newReq, ...prev]);

        pushAudit("Realtime Request Created", `Created request ${reqId} (${reqData.type}) for Room ${reqData.roomNumber} from ${reqData.department}`);
        pushActivity(`New ${reqData.priority} request ${reqId} received from ${reqData.department}`);

        const notif: NotificationItem = {
          id: `N-REQ-${Date.now()}`,
          title: `⚡ New Request (${reqData.priority}): ${reqData.type}`,
          body: `Room ${reqData.roomNumber} - ${reqData.description}`,
          time: "Just now",
          kind: "task",
          read: false,
        };
        setNotifications((prev) => [notif, ...prev]);

        // Dispatch Real-Time Event to WebSocket / SSE Channel
        emitRequestBackendEvent("request.created", newReq);
        void triggerN8nWebhook("realtime_request_created", { Request: newReq, Notification: notif });
        toast.error(`⚡ NEW REQUEST ${reqId} (${reqData.priority}): ${reqData.type}`);
      },
      acceptRealtimeRequest: (id) => {
        console.log("API CALL: PATCH /api/requests/" + id + "/accept");
        const acceptTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const staffName = session?.name || "Anita Sharma";

        setRealtimeRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "Accepted",
                  acceptedBy: staffName,
                  acceptedAt: acceptTime,
                }
              : r
          )
        );

        pushAudit("Request Accepted", `Receptionist ${staffName} accepted request ${id} at ${acceptTime}`);
        pushActivity(`Request ${id} accepted by ${staffName}`);

        emitRequestBackendEvent("request.accepted", { id, status: "Accepted", acceptedBy: staffName, acceptedAt: acceptTime });
        toast.success(`Request ${id} accepted by ${staffName}. Alarm sound silenced.`);
        void triggerN8nWebhook("request_accepted", { id, acceptedBy: staffName, acceptedAt: acceptTime });
      },
      rejectRealtimeRequest: (id, reason) => {
        console.log("API CALL: PATCH /api/requests/" + id + "/reject", { reason });
        setRealtimeRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "Rejected", rejectedReason: reason } : r))
        );
        pushAudit("Request Rejected", `Request ${id} rejected. Reason: ${reason}`);
        emitRequestBackendEvent("request.updated", { id, status: "Rejected", rejectedReason: reason });
        toast.warning(`Request ${id} rejected.`);
        void triggerN8nWebhook("request_rejected", { id, reason });
      },
      forwardRealtimeRequest: (id, targetDept) => {
        console.log("API CALL: PATCH /api/requests/" + id + "/forward", { targetDept });
        setRealtimeRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "Forwarded", forwardedTo: targetDept } : r))
        );
        pushAudit("Request Forwarded", `Request ${id} forwarded to ${targetDept}`);
        emitRequestBackendEvent("request.forwarded", { id, status: "Forwarded", forwardedTo: targetDept });
        toast.info(`Request ${id} forwarded to ${targetDept}.`);
        void triggerN8nWebhook("request_forwarded", { id, targetDept });
      },
      markPendingRealtimeRequest: (id) => {
        console.log("API CALL: PATCH /api/requests/" + id + "/pending");
        setRealtimeRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "Pending" } : r))
        );
        pushAudit("Request Marked Pending", `Request ${id} kept in pending queue`);
        emitRequestBackendEvent("request.updated", { id, status: "Pending" });
        toast.info(`Request ${id} marked as pending.`);
      },
      completeRealtimeRequest: (id) => {
        console.log("API CALL: PATCH /api/requests/" + id + "/complete");
        const compTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setRealtimeRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "Completed", completedAt: compTime } : r))
        );
        pushAudit("Request Completed", `Request ${id} completed at ${compTime}`);
        emitRequestBackendEvent("request.completed", { id, status: "Completed", completedAt: compTime });
        toast.success(`Request ${id} completed!`);
        void triggerN8nWebhook("request_completed", { id, completedAt: compTime });
      },
    }),
    [
      selectedRole,
      session,
      onDuty,
      dutyStart,
      tasks,
      rooms,
      orders,
      tickets,
      staff,
      notifications,
      guestRequests,
      staffRequests,
      messages,
      activity,
      auditLog,
      reservations,
      bookings,
      preRegistrations,
      leaveRequests,
      attendanceLogs,
      taskHistory,
      forceCheckoutRecords,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export { roleName };
