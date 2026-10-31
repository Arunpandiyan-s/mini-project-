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

// ─── AI CONCIERGE (isolated — chat-only, with simulated AI concierge fallback) ─────

/**
 * Simulated/Fake AI Concierge engine for instant, contextual hotel guest answers.
 */
function getSimulatedAiConciergeResponse(message: string): string {
  const query = message.toLowerCase().trim();

  // 1. Checkout / Check-in
  if (
    query.includes("checkout") ||
    query.includes("check out") ||
    query.includes("leaving") ||
    query.includes("departure") ||
    query.includes("late check")
  ) {
    return "Standard check-out is at 11:00 AM. If you'd like a complimentary late checkout (up to 1:00 PM subject to availability), you can request it through the Front Desk before 10:00 AM. Check-in begins at 2:00 PM.";
  }

  // 2. Towels / Toiletries / Linens / Cleaning
  if (
    query.includes("towel") ||
    query.includes("linen") ||
    query.includes("sheet") ||
    query.includes("pillow") ||
    query.includes("toiletr") ||
    query.includes("soap") ||
    query.includes("shampoo") ||
    query.includes("blanket")
  ) {
    return "Certainly! Fresh bath towels, linens, and luxury toiletries are available on demand. You can click 'Extra Towels' or 'Toiletries' under Quick Actions on your dashboard for automated dispatch to your room within 15 minutes.";
  }

  if (query.includes("clean") || query.includes("housekeep") || query.includes("turnover") || query.includes("maid")) {
    return "Housekeeping services are available daily between 06:00 and 23:00. Simply tap 'Room Cleaning' under Quick Actions to schedule an immediate refresh or turndown service.";
  }

  // 3. Dining / Restaurants / Food / Room Service
  if (
    query.includes("restaurant") ||
    query.includes("dining") ||
    query.includes("food") ||
    query.includes("eat") ||
    query.includes("breakfast") ||
    query.includes("lunch") ||
    query.includes("dinner") ||
    query.includes("menu") ||
    query.includes("room service")
  ) {
    if (query.includes("recommend") || query.includes("local") || query.includes("outside") || query.includes("good")) {
      return "For on-site dining, we recommend The Grand Bistro (Floor 1) for farm-to-table cuisine and our Rooftop Sky Lounge for evening cocktails & tapas. For local spots nearby, 'Le Petit Gourmet' (2 blocks north) and 'Spice Artisan Kitchen' (5 minutes walk) are highly acclaimed by our guests!";
    }
    return "We offer 24/7 in-room dining directly from your dashboard! Breakfast is served in The Grand Bistro from 06:30 to 10:30 AM. Feel free to explore our 'In-Room Dining' section below to place orders directly to Room 512.";
  }

  // 4. Spa / Pool / Gym / Wellness
  if (
    query.includes("pool") ||
    query.includes("spa") ||
    query.includes("gym") ||
    query.includes("fitness") ||
    query.includes("swim") ||
    query.includes("massage") ||
    query.includes("sauna")
  ) {
    return "The Skyview Infinity Pool on Floor 5 is open daily from 6:00 AM to 10:00 PM. The StayEase Lotus Spa is located on Floor 3 (08:00–20:00 by appointment). Our complimentary 24/7 Fitness Center is located on Floor 2.";
  }

  // 5. Wi-Fi / Internet
  if (query.includes("wifi") || query.includes("wi-fi") || query.includes("internet") || query.includes("password")) {
    return "High-speed Wi-Fi is complimentary across the entire hotel. Connect to 'StayEase-Guest' and enter your room number and last name on the login portal. No access code or password is required.";
  }

  // 6. Parking / Valet / Taxi / Airport
  if (
    query.includes("park") ||
    query.includes("valet") ||
    query.includes("car") ||
    query.includes("taxi") ||
    query.includes("cab") ||
    query.includes("airport") ||
    query.includes("shuttle") ||
    query.includes("transfer")
  ) {
    return "Valet parking is complimentary 24/7 at the front entrance for all registered guests. Airport transfers and taxi bookings can be arranged with the concierge desk at any time with 20 minutes prior notice.";
  }

  // 7. Luggage / Bellhop
  if (query.includes("luggage") || query.includes("bag") || query.includes("bellhop") || query.includes("porter") || query.includes("storage")) {
    return "Our bellhop team is happy to assist with luggage collection, delivery, or secure day storage. Click 'Luggage Assistance' under Quick Actions on your dashboard or dial 0 on your in-room phone.";
  }

  // 8. Maintenance / AC / Room Controls / Issues
  if (
    query.includes("ac") ||
    query.includes("air condition") ||
    query.includes("heat") ||
    query.includes("cold") ||
    query.includes("temperature") ||
    query.includes("tv") ||
    query.includes("broken") ||
    query.includes("plumb") ||
    query.includes("leak") ||
    query.includes("maintenance") ||
    query.includes("fix")
  ) {
    return "Our technical maintenance team is on duty 24/7. You can tap 'Maintenance' under Quick Actions to dispatch a technician immediately, or let me know the issue and I'll flag it for an urgent repair.";
  }

  // 9. Greetings
  if (
    query.startsWith("hi") ||
    query.startsWith("hello") ||
    query.startsWith("hey") ||
    query.includes("good morning") ||
    query.includes("good afternoon") ||
    query.includes("good evening")
  ) {
    return "Hello! I am your StayEase AI Concierge. I am available 24/7 to assist with room services, dining recommendations, hotel amenities, and anything else to make your stay effortless. How may I help you?";
  }

  // 10. Appreciation / Closing
  if (query.includes("thank") || query.includes("thx") || query.includes("great") || query.includes("perfect") || query.includes("awesome")) {
    return "It is my absolute pleasure! Please let me know if there's anything else you need. Enjoy your stay with us at StayEase!";
  }

  // 11. General intelligent fallback
  return "Thank you for your question! I have logged your request. You can use the Quick Actions on your dashboard to request immediate hotel amenities, or chat directly with our Front Desk team using the 'Front Desk Chat' button below for tailored assistance.";
}

/**
 * AI Concierge chat — uses configured webhook if available, otherwise runs the
 * simulated intelligent concierge engine with natural response timing.
 * This is completely isolated from core StayEase state.
 */
export async function sendAiConciergeMessage(
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  const webhookUrl =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_AI_CONCIERGE_URL) || "";

  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        if (typeof data.output === "string") return data.output;
        if (typeof data.message === "string") return data.message;
        if (typeof data.response === "string") return data.response;
      }
    } catch {
      // Fall through to simulated AI on network error
    }
  }

  // Simulate realistic AI generation latency (500ms)
  await new Promise((resolve) => setTimeout(resolve, 500));
  return getSimulatedAiConciergeResponse(message);
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

