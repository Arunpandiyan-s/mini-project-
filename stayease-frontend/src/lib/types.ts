/**
 * API Types — derived directly from backend Pydantic schemas (Phase 1-7).
 * These are the exact field names the FastAPI backend returns.
 * Do NOT modify to match old frontend mock data structures.
 * Use adapter functions (mapApiXxx) to convert to UI models.
 */

// ─── ENUMS (exact backend values) ────────────────────────────────────────────

export type BackendStaffRole = "admin" | "reception" | "housekeeping" | "maintenance" | "fnb";
export type BackendDutyStatus = "on_duty" | "off_duty";
export type BackendEmploymentStatus = "active" | "suspended" | "terminated";
export type BackendAvailabilityStatus = "available" | "busy";

export type BackendTaskStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "escalated";

export type BackendTaskPriority = "low" | "medium" | "high" | "urgent";
export type BackendDepartment = "reception" | "housekeeping" | "maintenance" | "fnb" | "administration";

export type BackendOccupancyStatus = "vacant" | "occupied";
export type BackendCleaningStatus = "clean" | "dirty" | "cleaning" | "inspecting";
export type BackendMaintenanceStatus = "good" | "maintenance_required" | "under_maintenance" | "out_of_service";

export type BackendReservationStatus = "booked" | "checked_in" | "checked_out" | "cancelled";

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

// ─── STAFF ─────────────────────────────────────────────────────────────────

export interface ApiStaff {
  id: number;
  staff_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: BackendStaffRole;
  floor: string | null;
  shift: string | null;
  duty_status: BackendDutyStatus;
  employment_status: BackendEmploymentStatus;
  availability_status: BackendAvailabilityStatus;
  created_at: string;
  updated_at: string;
}

export interface StaffLoginResponse {
  status: string;
  authenticated: boolean;
  access_token: string;
  token_type: string;
  user: ApiStaff;
}

// ─── ROOM ──────────────────────────────────────────────────────────────────

export interface ApiRoom {
  id: number;
  room_number: string;
  floor: number;
  room_type: string;
  occupancy_status: BackendOccupancyStatus;
  cleaning_status: BackendCleaningStatus;
  maintenance_status: BackendMaintenanceStatus;
  current_guest_id: number | null;
  created_at: string;
  updated_at: string;
}

// ─── TASK ──────────────────────────────────────────────────────────────────

export interface ApiTask {
  id: number;
  task_id: string;
  request_id: number | null;
  room_id: number;
  department: BackendDepartment;
  assigned_staff_id: number | null;
  title: string;
  description: string | null;
  priority: BackendTaskPriority;
  status: BackendTaskStatus;
  created_at: string;
  assigned_at: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  source_type: string | null;
  source_id: string | null;
}

// ─── RESERVATION ───────────────────────────────────────────────────────────

export interface ApiReservation {
  id: number;
  reservation_id: string;
  guest_id: number;
  room_id: number;
  guest_name?: string;
  room_number?: string;
  check_in: string;
  check_out: string;
  status: BackendReservationStatus;
  created_at: string;
  updated_at: string;
}

// ─── STAFF NOTIFICATION ────────────────────────────────────────────────────

export interface ApiNotification {
  notification_id: string;
  recipient_staff_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  priority: string | null;
}

export interface ApiUnreadCount {
  unread_count: number;
}

// ─── OPERATIONS FEED ───────────────────────────────────────────────────────

export interface ApiOperationEvent {
  event_type: string;
  actor_type: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

// ─── GUEST (portal) ────────────────────────────────────────────────────────

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
}

export interface ApiGuestRequest {
  request_id: string;
  request_type: BackendRequestType;
  description: string;
  status: BackendRequestStatus;
  room_number: string;
  created_at: string;
  completed_at: string | null;
}

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

// ─── API ERROR ─────────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  detail?: string | unknown;
}

// ─── ADMIN DASHBOARD STATS & MESSAGING ─────────────────────────────────────

export interface AdminDashboardStats {
  rooms: {
    total: number;
    available: number;
    occupied: number;
    dirty: number;
    awaiting_inspection: number;
    maintenance: number;
  };
  reservations: {
    active: number;
    arrivals_today: number;
    departures_today: number;
  };
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
  staff: {
    total: number;
    on_duty: number;
    departments: Record<string, number>;
  };
}

export interface ApiStaffMessage {
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

// ─── GUEST TYPES RE-EXPORTS ────────────────────────────────────────────────
export * from "./guestTypes";
