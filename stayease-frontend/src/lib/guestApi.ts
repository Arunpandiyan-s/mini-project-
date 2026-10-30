/**
 * StayEase Guest Hub — FastAPI Client
 *
 * Replaces the SNS Agent Workbench webhook client entirely.
 * Token stored under: stayease_guest_token (separate from staff: stayease_token)
 * Legacy keys (stayease_auth_token) are NOT used as auth — they are cleaned up.
 *
 * All functions throw ApiError on non-2xx responses.
 * 401 fires the global unauthorized handler (once).
 */

import type {
  ApiGuestProfile,
  ApiGuestStay,
  ApiGuestRequest,
  ApiGuestNotification,
  ApiGuestUnreadCount,
  GuestLoginResponse,
  GuestRequestCreatePayload,
  ApiGuestBooking,
  ApiDiscoveryRoom,
  ApiGuestMessage,
  GuestPreRegisterPayload,
  GuestPreRegisterResponse,
  ApiError,
} from "./guestTypes";

// ─── CONFIG ────────────────────────────────────────────────────────────────

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  "http://127.0.0.1:8000";

// ─── TOKEN MANAGEMENT ──────────────────────────────────────────────────────

// Guest token uses its own key — never conflicts with staff token
const GUEST_TOKEN_KEY = "stayease_guest_token";

/** Returns the currently stored guest JWT, or null */
export function getGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GUEST_TOKEN_KEY);
}

/** Persists the guest JWT */
export function setGuestToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_TOKEN_KEY, token);
}

/** Removes the guest JWT (logout) */
export function removeGuestToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_TOKEN_KEY);
  // Clean up legacy keys that old webhook sessions may have left
  window.localStorage.removeItem("stayease_auth_token");
  window.localStorage.removeItem("stayease");
}

/** @deprecated Legacy function kept for migration compatibility. Always returns false now. */
export function isAuthenticated(): boolean {
  // Guest session is now validated via GET /api/guest/me on mount — not just token presence.
  // This function intentionally does NOT return true for old stayease_auth_token values.
  return false;
}

// ─── SESSION EXPIRY HOOK ──────────────────────────────────────────────────

type UnauthorizedHandler = () => void;
let _onGuestUnauthorized: UnauthorizedHandler | null = null;
let _guestAuthExpiredFired = false;

export function registerGuestUnauthorizedHandler(handler: UnauthorizedHandler): void {
  _onGuestUnauthorized = handler;
  _guestAuthExpiredFired = false;
}

function fireGuestUnauthorized(): void {
  if (!_guestAuthExpiredFired && _onGuestUnauthorized) {
    _guestAuthExpiredFired = true;
    removeGuestToken();
    _onGuestUnauthorized();
  }
}

// ─── CORE FETCH ────────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

async function guestFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getGuestToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (res.ok) {
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

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
    fireGuestUnauthorized();
  }

  throw apiError;
}

function extractMessage(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
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

// ─── AUTH ENDPOINTS ────────────────────────────────────────────────────────

/** POST /api/guest-auth/register — Public account creation */
export async function apiGuestRegister(name: string, email: string, password: string, phone?: string): Promise<GuestLoginResponse> {
  return guestFetch<GuestLoginResponse>("/api/guest-auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, phone: phone || null }),
    skipAuth: true,
  });
}

/** POST /api/guest-auth/login */
export async function guestLogin(email: string, password: string): Promise<GuestLoginResponse> {
  return guestFetch<GuestLoginResponse>("/api/guest-auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
}

/** GET /api/guest-auth/me — Validates token and returns guest profile */
export async function getGuestMe(): Promise<ApiGuestProfile> {
  return guestFetch<ApiGuestProfile>("/api/guest-auth/me");
}

/** GET /api/guest/rooms — Browse available rooms for discovery & booking */
export async function listAvailableRooms(): Promise<ApiDiscoveryRoom[]> {
  return guestFetch<ApiDiscoveryRoom[]>("/api/guest/rooms");
}

/** POST /api/guest/me/bookings — Create a new room booking reservation */
export async function createGuestBooking(room_number: string, check_in: string, check_out: string): Promise<ApiGuestBooking> {
  return guestFetch<ApiGuestBooking>("/api/guest/me/bookings", {
    method: "POST",
    body: JSON.stringify({ room_number, check_in, check_out }),
  });
}

/** GET /api/guest/me/bookings — List personal booking history */
export async function listGuestBookings(): Promise<ApiGuestBooking[]> {
  return guestFetch<ApiGuestBooking[]>("/api/guest/me/bookings");
}

// ─── GUEST PORTAL ENDPOINTS ────────────────────────────────────────────────

/** GET /api/guest/me/stay — Returns the guest's primary active stay */
export async function getGuestStay(): Promise<ApiGuestStay> {
  return guestFetch<ApiGuestStay>("/api/guest/me/stay");
}

/** GET /api/guest/me/stays — Returns all active or booked stays for the guest */
export async function getGuestStays(): Promise<ApiGuestStay[]> {
  return guestFetch<ApiGuestStay[]>("/api/guest/me/stays");
}

/** PATCH /api/guest/me — Update guest contact details (phone, email) */
export async function updateGuestProfile(payload: { email?: string; phone?: string }): Promise<ApiGuestProfile> {
  return guestFetch<ApiGuestProfile>("/api/guest/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** GET /api/guest/me/requests — List the guest's own service requests */
export async function getGuestRequests(): Promise<ApiGuestRequest[]> {
  return guestFetch<ApiGuestRequest[]>("/api/guest/me/requests");
}

/**
 * POST /api/guest/me/requests — Submit a new service request.
 * Sends ONLY request_type and description. Backend derives room, guest, priority.
 */
export async function createGuestRequest(payload: GuestRequestCreatePayload): Promise<ApiGuestRequest> {
  return guestFetch<ApiGuestRequest>("/api/guest/me/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/guest/me/requests/{request_id}/cancel — Cancel a pending request */
export async function cancelGuestRequest(requestId: string): Promise<ApiGuestRequest> {
  return guestFetch<ApiGuestRequest>(`/api/guest/me/requests/${requestId}/cancel`, {
    method: "PATCH",
  });
}

/** GET /api/guest/me/notifications — Guest-facing notifications */
export async function getGuestNotifications(): Promise<ApiGuestNotification[]> {
  return guestFetch<ApiGuestNotification[]>("/api/guest/me/notifications");
}

/** GET /api/guest/me/notifications/unread-count */
export async function getGuestUnreadCount(): Promise<ApiGuestUnreadCount> {
  return guestFetch<ApiGuestUnreadCount>("/api/guest/me/notifications/unread-count");
}

/** PATCH /api/guest/me/notifications/{notification_id}/read */
export async function markGuestNotificationRead(notificationId: string): Promise<ApiGuestNotification> {
  return guestFetch<ApiGuestNotification>(`/api/guest/me/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

/** PATCH /api/guest/me/notifications/read-all */
export async function markAllGuestNotificationsRead(): Promise<void> {
  return guestFetch<void>("/api/guest/me/notifications/read-all", { method: "PATCH" });
}

// ─── DIGITAL PRE-REGISTRATION ─────────────────────────────────────────────

/** POST /api/guest/pre-register — Complete digital pre-registration for a reservation */
export async function preRegisterStay(payload: GuestPreRegisterPayload): Promise<GuestPreRegisterResponse> {
  const url = `${API_BASE}/api/guest/pre-register`;
  const token = getGuestToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = `Pre-registration failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.detail) errorMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch { }
    throw new Error(errorMsg);
  }

  return res.json();
}

// ─── GUEST & RECEPTION MESSAGING ──────────────────────────────────────────

/** GET /api/messages — Fetch conversation messages */
export async function getGuestMessages(reservationId?: string): Promise<ApiGuestMessage[]> {
  const query = reservationId ? `?reservation_id=${encodeURIComponent(reservationId)}` : "";
  return guestFetch<ApiGuestMessage[]>(`/api/messages${query}`);
}

/** POST /api/messages — Send a message to reception */
export async function sendGuestMessage(content: string, reservationId?: string): Promise<ApiGuestMessage> {
  return guestFetch<ApiGuestMessage>("/api/messages", {
    method: "POST",
    body: JSON.stringify({ content, reservation_id: reservationId }),
  });
}

/** PATCH /api/messages/{id}/read — Mark message as read */
export async function markGuestMessageRead(messageId: number | string): Promise<ApiGuestMessage> {
  return guestFetch<ApiGuestMessage>(`/api/messages/${messageId}/read`, {
    method: "PATCH",
  });
}

// ─── AI CONCIERGE (isolated — chat-only, no operational side effects) ─────

/**
 * AI Concierge chat — forwards message to n8n/Agent Workbench.
 * This is completely isolated from core StayEase state.
 * It does NOT create authoritative GuestRequests or modify reservations.
 * Uses a separate endpoint that only the chat UI invokes.
 */
export async function sendAiConciergeMessage(
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  const webhookUrl =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_AI_CONCIERGE_URL) || "";

  if (!webhookUrl) {
    return "AI Concierge is not configured in this environment. Please contact the hotel for assistance.";
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) return "I'm unable to respond right now. Please contact reception.";
    const data = await res.json() as Record<string, unknown>;
    if (typeof data.output === "string") return data.output;
    if (typeof data.message === "string") return data.message;
    if (typeof data.response === "string") return data.response;
    return "Request acknowledged. Please hold.";
  } catch {
    return "I'm unable to respond right now. Please contact reception directly.";
  }
}

// ─── DEPRECATED STUBS (kept for import compatibility during migration) ──────

/** @deprecated Use guestLogin() instead */
export async function apiLogin(_credentials: { email: string; password: string }) {
  console.warn("[apiLogin] DEPRECATED. Use guestLogin() instead.");
  return { isSuccess: false, rawText: "Please use guestLogin()" };
}

/** @deprecated Pre-registration is not supported in Phase 7+ */
export async function apiPreRegistration(_data: unknown) {
  console.warn("[apiPreRegistration] Not connected to backend. Registration is managed by hotel staff.");
  return { isSuccess: false, rawText: "Registration is managed by hotel staff." };
}

/** @deprecated Use createGuestRequest() instead */
export async function apiServiceRequest(_data: unknown) {
  console.warn("[apiServiceRequest] DEPRECATED. Use createGuestRequest() instead.");
  return { isSuccess: false, rawText: "Use createGuestRequest() instead." };
}

/** @deprecated Use createGuestRequest() instead */
export async function apiHousekeepingRequest(_data: unknown) {
  console.warn("[apiHousekeepingRequest] DEPRECATED. Use createGuestRequest() instead.");
  return { isSuccess: false, rawText: "Use createGuestRequest() instead." };
}

/** @deprecated Use createGuestRequest() instead */
export async function apiMaintenanceRequest(_data: unknown) {
  console.warn("[apiMaintenanceRequest] DEPRECATED. Use createGuestRequest() instead.");
  return { isSuccess: false, rawText: "Use createGuestRequest() instead." };
}

/** @deprecated Use createGuestRequest() instead */
export async function apiFoodOrder(_data: unknown) {
  console.warn("[apiFoodOrder] DEPRECATED. Use createGuestRequest() instead.");
  return { isSuccess: false, rawText: "Use createGuestRequest() instead." };
}

/** @deprecated Webhook chat is replaced by sendAiConciergeMessage() */
export async function apiChatMessage(message: string, history: Array<{ role: string; content: string }> = []) {
  return sendAiConciergeMessage(message, history);
}

/** @deprecated Use getGuestRequests() instead */
export async function apiFetchRequestHistory() {
  return { isSuccess: false, rawText: "Use getGuestRequests() instead." };
}

/** @deprecated Use getGuestNotifications() instead */
export async function apiFetchNotifications() {
  return { isSuccess: false, rawText: "Use getGuestNotifications() instead." };
}

/** @deprecated Use getGuestMe() instead */
export async function apiFetchGuestDetails() {
  return { isSuccess: false, rawText: "Use getGuestMe() instead." };
}

/** @deprecated Password reset is managed via hotel reception */
export async function apiForgotPassword(_email?: string) {
  return { isSuccess: true, rawText: "Password reset request recorded. Contact reception." };
}

/** @deprecated Feedback submission stub */
export async function apiFeedbackSubmission(_data?: unknown) {
  return { isSuccess: true, rawText: "Thank you for your feedback!" };
}

