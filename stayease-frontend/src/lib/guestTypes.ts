/**
 * StayEase Guest Hub — API Types
 * Derived from backend Pydantic schemas (Phases 1-7).
 * Use these as the source of truth for all API communication.
 */

// ─── ENUMS (exact backend values from enums.py) ───────────────────────────

export type BackendRequestType =
  | "extra_towel"
  | "room_cleaning"
  | "toiletries"
  | "luggage_assistance"
  | "maintenance"
  | "room_service"
  | "food_order"
  | "other";

export type BackendRequestStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "attention_needed"
  | "cancelled";

// ─── GUEST AUTH ────────────────────────────────────────────────────────────

export interface ApiGuestProfile {
  guest_id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface GuestLoginResponse {
  status: string;
  authenticated: boolean;
  access_token: string;
  token_type: string;
  user: ApiGuestProfile;
}

// ─── GUEST STAY ────────────────────────────────────────────────────────────

export interface ApiGuestStay {
  guest_id: string;
  reservation_id: string;
  room: {
    room_number: string;
    floor: number;
    room_type: string;
  };
  check_in: string;
  check_out: string;
  status?: string;
}

// ─── GUEST REQUESTS ────────────────────────────────────────────────────────

export interface ApiGuestRequest {
  request_id: string;
  request_type: BackendRequestType;
  description: string;
  status: BackendRequestStatus;
  room_number: string;
  created_at: string;
  completed_at: string | null;
}

export interface GuestRequestCreatePayload {
  request_type: BackendRequestType;
  description: string;
  room_number?: string;
}

// ─── GUEST NOTIFICATIONS ───────────────────────────────────────────────────

export interface ApiGuestNotification {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ApiGuestUnreadCount {
  unread_count: number;
}

export interface ApiGuestBooking {
  reservation_id: string;
  guest_id: string;
  room_number: string;
  room_type: string;
  check_in: string;
  check_out: string;
  status: string;
  created_at: string;
}

export interface ApiDiscoveryRoom {
  room_number: string;
  floor: number;
  room_type: string;
  occupancy_status: string;
  cleaning_status: string;
}

// ─── API ERROR ─────────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  detail?: string | unknown;
}

// ─── UI MODEL (derived from backend) ──────────────────────────────────────

/**
 * UI-friendly request model for rendering.
 * All fields mapped from ApiGuestRequest via mapApiGuestRequestToUi().
 */
export interface UiGuestRequest {
  id: string;          // request_id
  type: string;        // Human-readable request_type label
  description: string;
  status: BackendRequestStatus;
  statusLabel: string; // Human-readable status label
  submitted: string;   // Formatted created_at
  canCancel: boolean;  // Only pending requests can be cancelled
}

/**
 * Maps a backend BackendRequestStatus to a user-facing label.
 * One centralised conversion — never spread across components.
 */
export function mapGuestRequestStatus(status: BackendRequestStatus): string {
  const labels: Record<BackendRequestStatus, string> = {
    pending: "Requested",
    in_progress: "In Progress",
    completed: "Completed",
    attention_needed: "Attention Needed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

/**
 * Maps a backend BackendRequestType to a user-facing label.
 */
export function mapRequestTypeLabel(type: BackendRequestType | string): string {
  const labels: Record<string, string> = {
    extra_towel: "Extra Towels",
    room_cleaning: "Room Cleaning",
    toiletries: "Toiletries",
    luggage_assistance: "Luggage Assistance",
    maintenance: "Maintenance",
    room_service: "Room Service",
    food_order: "Food Order",
    other: "Other Request",
  };
  return labels[type] ?? type;
}

/**
 * Converts an ApiGuestRequest to a UI-friendly UiGuestRequest.
 * This is the single authoritative adapter — import this, not raw API types.
 */
export function mapApiGuestRequestToUi(req: ApiGuestRequest): UiGuestRequest {
  const canCancel = req.status === "pending";
  return {
    id: req.request_id,
    type: mapRequestTypeLabel(req.request_type),
    description: req.description,
    status: req.status,
    statusLabel: mapGuestRequestStatus(req.status),
    submitted: formatCreatedAt(req.created_at),
    canCancel,
  };
}

function formatCreatedAt(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Today · ${timeStr}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate();
    if (isYesterday) return `Yesterday · ${timeStr}`;
    return d.toLocaleDateString([], { day: "numeric", month: "short" }) + ` · ${timeStr}`;
  } catch {
    return isoString;
  }
}

// ─── MESSAGING & PRE-REGISTRATION ──────────────────────────────────────────

export interface ApiGuestMessage {
  id: number;
  message_id: string;
  guest_id: string;
  reservation_id?: string | null;
  sender_type: "guest" | "staff";
  sender_id: string;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface GuestPreRegisterPayload {
  reservation_id: string;
  estimated_arrival?: string;
  id_document_number?: string;
  special_requests?: string;
  emergency_contact?: string;
}

export interface GuestPreRegisterResponse {
  status: string;
  message: string;
  reservation_id: string;
  room_number: string;
  room_type: string;
  check_in: string;
  check_out: string;
  guest_name: string;
}
