/**
 * StayEase Staff Hub — FastAPI Client
 *
 * Centralized HTTP client for all Staff Hub ↔ FastAPI communication.
 * Token storage keys:  stayease_token (staff JWT)
 * Legacy keys ignored: stayease, stayease_auth_token (old webhook sessions)
 *
 * All functions throw ApiError on non-2xx responses.
 * 401 is handled centrally; call onUnauthorized to hook session expiry.
 */

import type {
  ApiError,
  ApiStaff,
  ApiTask,
  ApiRoom,
  ApiReservation,
  ApiNotification,
  ApiOperationEvent,
  ApiUnreadCount,
  StaffLoginResponse,
  BackendDutyStatus,
  BackendEmploymentStatus,
  BackendStaffRole,
  BackendTaskStatus,
  BackendTaskPriority,
  BackendDepartment,
  AdminDashboardStats,
  ApiStaffMessage,
} from "./types";

// ─── CONFIG ────────────────────────────────────────────────────────────────

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  "http://127.0.0.1:8000";

// ─── TOKEN MANAGEMENT ──────────────────────────────────────────────────────

const TOKEN_KEY = "stayease_token";

/** Returns the currently stored staff JWT, or null */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** Persists the staff JWT */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

/** Removes the staff JWT (logout) */
export function removeToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  // Also clear any legacy keys from old webhook/mock sessions
  window.localStorage.removeItem("stayease");
  window.localStorage.removeItem("stayease_auth_token");
}

// ─── SESSION EXPIRY HOOK ──────────────────────────────────────────────────

type UnauthorizedHandler = () => void;
let _onUnauthorized: UnauthorizedHandler | null = null;
let _authExpiredFired = false;

/**
 * Register a global callback invoked exactly once when any API call returns 401.
 * The callback should clear session state and redirect to login.
 */
export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  _onUnauthorized = handler;
  _authExpiredFired = false;
}

function fireUnauthorized(): void {
  if (!_authExpiredFired && _onUnauthorized) {
    _authExpiredFired = true;
    removeToken();
    _onUnauthorized();
  }
}

// ─── CENTRALIZED FETCH ─────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Core fetch wrapper. Adds Bearer token, normalizes errors, fires 401 hook.
 * SSR-safe: never accesses localStorage server-side.
 */
async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (res.ok) {
    // 204 No Content or empty bodies
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  // Parse error body
  let errorBody: unknown;
  try {
    errorBody = await res.json();
  } catch {
    errorBody = { detail: res.statusText };
  }

  const detail =
    typeof errorBody === "object" && errorBody !== null
      ? (errorBody as Record<string, unknown>).detail
      : String(errorBody);

  const apiError: ApiError = {
    status: res.status,
    message: extractMessage(detail, res.status),
    detail,
  };

  if (res.status === 401) {
    fireUnauthorized();
  }

  throw apiError;
}

function extractMessage(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // FastAPI 422 validation error array
    const msgs = detail
      .map((item: unknown) => {
        if (typeof item === "object" && item !== null) {
          const d = item as Record<string, unknown>;
          const loc = Array.isArray(d.loc) ? d.loc.join(" → ") : "";
          const msg = typeof d.msg === "string" ? d.msg : "";
          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(item);
      })
      .filter(Boolean);
    return msgs.join("; ") || `HTTP ${status}`;
  }
  return `HTTP ${status}`;
}

// ─── WEBHOOK LEGACY STUB ───────────────────────────────────────────────────

/**
 * @deprecated Phase 8: n8n webhook calls removed from all core flows.
 * This function is a no-op stub retained only for component interface compatibility
 * during migration. Remove entirely once all store usages are eliminated.
 */
export function triggerN8nWebhook(action: string, payload?: unknown): void {
  console.debug("[triggerN8nWebhook] DEPRECATED no-op. Action:", action, payload);
}

// ─── EXPORTED WEBHOOK URL STUB (for compatibility) ─────────────────────────

/** @deprecated Legacy webhook URL — no longer used. Retained to avoid import errors during migration. */
export const WEBHOOK_URL = "";

// ─── AUTH ENDPOINTS ────────────────────────────────────────────────────────

/** POST /api/auth/login — Staff login. Returns JWT + staff profile. */
export async function loginStaff(identifier: string, password: string, role?: string): Promise<StaffLoginResponse> {
  return apiFetch<StaffLoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password, role }),
    skipAuth: true,
  });
}

/** GET /api/auth/me — Returns current authenticated staff profile. */
export async function getMe(): Promise<ApiStaff> {
  return apiFetch<ApiStaff>("/api/auth/me");
}

// ─── STAFF ENDPOINTS ───────────────────────────────────────────────────────

/** GET /api/staff — List all staff (ADMIN + RECEPTION only). */
export async function listStaff(): Promise<ApiStaff[]> {
  return apiFetch<ApiStaff[]>("/api/staff");
}

/** POST /api/staff — Create staff (ADMIN only). */
export async function createStaff(data: {
  staff_id: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: BackendStaffRole;
  floor?: string;
  shift?: string;
}): Promise<ApiStaff> {
  return apiFetch<ApiStaff>("/api/staff", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** PATCH /api/staff/{staff_id}/suspend — Suspend a staff member (ADMIN only). */
export async function suspendStaff(staffId: string): Promise<ApiStaff> {
  return apiFetch<ApiStaff>(`/api/staff/${staffId}/suspend`, { method: "PATCH" });
}

/** PATCH /api/staff/{staff_id}/activate — Reactivate a staff member (ADMIN only). */
export async function activateStaff(staffId: string): Promise<ApiStaff> {
  return apiFetch<ApiStaff>(`/api/staff/${staffId}/activate`, { method: "PATCH" });
}

/** DELETE /api/staff/{staff_id} — Delete a staff member (ADMIN only). */
export async function deleteStaff(staffId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/staff/${staffId}`, { method: "DELETE" });
}

/** PATCH /api/staff/me/duty-status — Toggle own duty status. Returns 409 if active tasks. */
export async function updateMyDutyStatus(dutyStatus: BackendDutyStatus): Promise<ApiStaff> {
  return apiFetch<ApiStaff>("/api/staff/me/duty-status", {
    method: "PATCH",
    body: JSON.stringify({ duty_status: dutyStatus }),
  });
}

// ─── ROOM ENDPOINTS ────────────────────────────────────────────────────────

/** GET /api/rooms — List all rooms. */
export async function listRooms(): Promise<ApiRoom[]> {
  return apiFetch<ApiRoom[]>("/api/rooms");
}

// ─── TASK ENDPOINTS ────────────────────────────────────────────────────────

/** GET /api/tasks — List tasks. ADMIN/RECEPTION see all; departmental staff see only their dept. */
export async function listTasks(params?: {
  department?: BackendDepartment;
  status?: BackendTaskStatus;
  room_number?: string;
  priority?: BackendTaskPriority;
}): Promise<ApiTask[]> {
  const query = params
    ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString()
    : "";
  return apiFetch<ApiTask[]>(`/api/tasks${query}`);
}

/** GET /api/tasks/my — Returns tasks assigned to current authenticated staff member. */
export async function getMyTasks(): Promise<ApiTask[]> {
  return apiFetch<ApiTask[]>("/api/tasks/my");
}

/** PATCH /api/tasks/{task_id}/accept — Accept a task. */
export async function acceptTask(taskId: string): Promise<ApiTask> {
  return apiFetch<ApiTask>(`/api/tasks/${taskId}/accept`, { method: "PATCH" });
}

/** PATCH /api/tasks/{task_id}/start — Start a task (moves to IN_PROGRESS). */
export async function startTask(taskId: string): Promise<ApiTask> {
  return apiFetch<ApiTask>(`/api/tasks/${taskId}/start`, { method: "PATCH" });
}

/** PATCH /api/tasks/{task_id}/complete — Complete an in-progress task. */
export async function completeTask(taskId: string): Promise<ApiTask> {
  return apiFetch<ApiTask>(`/api/tasks/${taskId}/complete`, { method: "PATCH" });
}

/** PATCH /api/tasks/{task_id}/assign — Manually assign a task (ADMIN only). */
export async function assignTask(taskId: string, staffId: string): Promise<ApiTask> {
  return apiFetch<ApiTask>(`/api/tasks/${taskId}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ staff_id: staffId }),
  });
}

/** PATCH /api/tasks/{task_id}/reassign — Manually reassign a pending task (ADMIN only). */
export async function reassignTask(taskId: string, staffId: string): Promise<ApiTask> {
  return apiFetch<ApiTask>(`/api/tasks/${taskId}/reassign`, {
    method: "PATCH",
    body: JSON.stringify({ staff_id: staffId }),
  });
}

// ─── RESERVATION ENDPOINTS ─────────────────────────────────────────────────

/** GET /api/reservations — List reservations (ADMIN + RECEPTION only). */
export async function listReservations(params?: {
  status?: string;
  room_number?: string;
}): Promise<ApiReservation[]> {
  const query = params
    ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString()
    : "";
  return apiFetch<ApiReservation[]>(`/api/reservations${query}`);
}

/** POST /api/reservations/{reservation_id}/check-in — Check in a guest (ADMIN + RECEPTION). */
export async function checkInReservation(reservationId: string): Promise<ApiReservation> {
  return apiFetch<ApiReservation>(`/api/reservations/${reservationId}/check-in`, { method: "POST" });
}

/** POST /api/reservations/{reservation_id}/checkout — Checkout a guest (ADMIN + RECEPTION). */
export async function checkoutReservation(reservationId: string): Promise<ApiReservation> {
  return apiFetch<ApiReservation>(`/api/reservations/${reservationId}/checkout`, { method: "POST" });
}

// ─── NOTIFICATION ENDPOINTS ────────────────────────────────────────────────

/** GET /api/notifications — List my notifications. Newest first. */
export async function listNotifications(params?: {
  is_read?: boolean;
  limit?: number;
}): Promise<ApiNotification[]> {
  const query = params
    ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]) as [string, string][]).toString()
    : "";
  return apiFetch<ApiNotification[]>(`/api/notifications${query}`);
}

/** GET /api/notifications/unread-count — Returns unread count for current staff. */
export async function getUnreadCount(): Promise<ApiUnreadCount> {
  return apiFetch<ApiUnreadCount>("/api/notifications/unread-count");
}

/** PATCH /api/notifications/{notification_id}/read — Mark a notification read. */
export async function markNotificationRead(notificationId: string): Promise<ApiNotification> {
  return apiFetch<ApiNotification>(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
}

/** PATCH /api/notifications/read-all — Mark all notifications read. */
export async function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>("/api/notifications/read-all", { method: "PATCH" });
}

// ─── OPERATIONS FEED & ADMIN METRICS (ADMIN ONLY) ─────────────────────────

/** GET /api/operations/feed — Admin-only operational audit log feed. */
export async function getOperationsFeed(limit = 50): Promise<ApiOperationEvent[]> {
  return apiFetch<ApiOperationEvent[]>(`/api/operations/feed?limit=${limit}`);
}

/** GET /api/admin/dashboard/stats — Live administrative dashboard statistics */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return apiFetch<AdminDashboardStats>("/api/admin/dashboard/stats");
}

/** GET /api/admin/reports — Operational reports & key performance metrics */
export async function getAdminReports(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/api/admin/reports");
}

/** GET /api/admin/audit-logs — Full administrative audit logs */
export async function getAdminAuditLogs(limit = 100): Promise<Record<string, unknown>[]> {
  return apiFetch<Record<string, unknown>[]>(`/api/admin/audit-logs?limit=${limit}`);
}

// ─── ROOM LIFECYCLE: INSPECTION & MAINTENANCE ─────────────────────────────

/** POST /api/rooms/{room_number}/inspection — Submit housekeeping inspection pass/fail */
export async function inspectRoom(
  roomNumber: string,
  passed: boolean,
  notes?: string
): Promise<ApiRoom> {
  return apiFetch<ApiRoom>(`/api/rooms/${roomNumber}/inspection`, {
    method: "POST",
    body: JSON.stringify({
      status: passed ? "pass" : "fail",
      passed,
      reason: !passed ? notes || "Inspection failed" : undefined,
      notes: notes || "",
    }),
  });
}

/** POST /api/rooms/{room_number}/clean — Request room cleaning and dispatch housekeeping task */
export async function requestRoomCleaning(
  roomNumber: string,
  payload?: { notes?: string; cleaning_type?: string; priority?: string }
): Promise<{ status: string; task_id: string; room_number: string; room_cleaning_status: string }> {
  return apiFetch<{ status: string; task_id: string; room_number: string; room_cleaning_status: string }>(
    `/api/rooms/${roomNumber}/clean`,
    {
      method: "POST",
      body: JSON.stringify({
        notes: payload?.notes || "Turnover cleaning requested.",
        cleaning_type: payload?.cleaning_type || "Standard Cleaning",
        priority: (payload?.priority || "high").toLowerCase(),
      }),
    }
  );
}

/** POST /api/rooms/{room_number}/maintenance — Report room defect and dispatch maintenance task */
export async function reportRoomMaintenance(
  roomNumber: string,
  payload: { issue?: string; issue_description?: string; priority?: string; block_occupancy?: boolean; blocks_occupancy?: boolean }
): Promise<{ status: string; task_id: string; room_number: string }> {
  return apiFetch<{ status: string; task_id: string; room_number: string }>(
    `/api/rooms/${roomNumber}/maintenance`,
    {
      method: "POST",
      body: JSON.stringify({
        issue: payload.issue || payload.issue_description || "Maintenance required",
        priority: (payload.priority || "high").toLowerCase(),
        blocks_occupancy: payload.blocks_occupancy ?? payload.block_occupancy ?? true,
      }),
    }
  );
}


/** PATCH /api/tasks/{task_id}/resolve — Resolve maintenance task and restore room to GOOD */
export async function resolveTask(taskId: string, resolutionNotes?: string): Promise<ApiTask> {
  return apiFetch<ApiTask>(`/api/tasks/${taskId}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ resolution_notes: resolutionNotes || "Maintenance work completed." }),
  });
}

// ─── GUEST & STAFF MESSAGING ──────────────────────────────────────────────

/** GET /api/messages — Fetch conversation messages */
export async function getStaffMessages(
  guestId?: string,
  reservationId?: string
): Promise<ApiStaffMessage[]> {
  const params = new URLSearchParams();
  if (guestId) params.append("guest_id", guestId);
  if (reservationId) params.append("reservation_id", reservationId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<ApiStaffMessage[]>(`/api/messages${query}`);
}

/** POST /api/messages — Staff sends a message to a guest */
export async function sendStaffMessage(
  guestId: string,
  content: string,
  reservationId?: string
): Promise<ApiStaffMessage> {
  return apiFetch<ApiStaffMessage>("/api/messages", {
    method: "POST",
    body: JSON.stringify({ guest_id: guestId, content, reservation_id: reservationId }),
  });
}

/** PATCH /api/messages/{id}/read — Mark message as read */
export async function markStaffMessageRead(messageId: number | string): Promise<ApiStaffMessage> {
  return apiFetch<ApiStaffMessage>(`/api/messages/${messageId}/read`, {
    method: "PATCH",
  });
}

// ─── CONVENIENCE ALIASES ───────────────────────────────────────────────────

/** Alias for listNotifications — returns all notifications for current staff. */
export const getNotifications = () => listNotifications();

/** Alias for listTasks — all tasks (admin) */
export const getTasks = () => listTasks();

// ─── GUEST API RE-EXPORTS ──────────────────────────────────────────────────
export * from "./guestApi";
