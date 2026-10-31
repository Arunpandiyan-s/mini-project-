/**
 * useStaffWebSocket — React hook for Staff Hub WebSocket lifecycle.
 *
 * Rules:
 * - Only connects AFTER token is confirmed valid (by /api/auth/me).
 * - SSR-safe: relies on useEffect which only runs client-side.
 * - Stable handler references required — wrap handlers in useCallback at call site
 *   to avoid disconnect/reconnect on every re-render.
 * - One WebSocket connection per authenticated browser tab.
 */

import { useEffect } from "react";
import { staffWS } from "@/lib/websocket";

export type StaffWSHandlers = {
  /** Called when a task is assigned to the current staff member */
  onTaskAssigned?: (data: Record<string, unknown>) => void;
  /** Called when a task is reassigned (to or from current staff) */
  onTaskReassigned?: (data: Record<string, unknown>) => void;
  /** Called when a task is removed/cancelled (was assigned to current staff) */
  onTaskRemoved?: (data: Record<string, unknown>) => void;
  /** Called when a task status changes (accepted, started, completed) */
  onTaskUpdated?: (data: Record<string, unknown>) => void;
  /** Called when a guest request is created */
  onGuestRequestCreated?: (data: Record<string, unknown>) => void;
  /** Called when a guest request is cancelled */
  onGuestRequestCancelled?: (data: Record<string, unknown>) => void;
  /** Called when a reservation is checked in */
  onReservationCheckedIn?: (data: Record<string, unknown>) => void;
  /** Called when a new reservation is created */
  onReservationCreated?: (data: Record<string, unknown>) => void;
  /** Called when a reservation is checked out */
  onReservationCheckedOut?: (data: Record<string, unknown>) => void;
  /** Called when room becomes dirty */
  onRoomDirty?: (data: Record<string, unknown>) => void;
  /** Called when room cleaning starts */
  onRoomCleaning?: (data: Record<string, unknown>) => void;
  /** Called when room is clean */
  onRoomClean?: (data: Record<string, unknown>) => void;
  /** Called when auth is rejected by the server (token expired/invalid) */
  onAuthExpired?: () => void;
};

/**
 * Manages the StaffWS lifecycle for the authenticated session.
 *
 * @param token - JWT token. Pass null/undefined when not authenticated.
 *                WebSocket connects only when token is non-null.
 * @param handlers - Event handlers. Must be stable (useCallback) to avoid re-connecting on render.
 */
export function useStaffWebSocket(
  token: string | null | undefined,
  handlers: StaffWSHandlers
): void {
  useEffect(() => {
    // SSR guard — this never runs server-side
    if (typeof window === "undefined") return;
    if (!token) return;

    // Register auth expiry
    if (handlers.onAuthExpired) {
      staffWS.setAuthExpiredCallback(handlers.onAuthExpired);
    }

    // Register event handlers
    const rawHandlers: Array<[string, (data: Record<string, unknown>) => void]> = [];

    function reg(event: string, handler?: (data: Record<string, unknown>) => void) {
      if (!handler) return;
      rawHandlers.push([event, handler]);
      staffWS.on(event, handler);
    }

    reg("task.assigned", handlers.onTaskAssigned);
    reg("task.reassigned", handlers.onTaskReassigned);
    reg("task.removed", handlers.onTaskRemoved);
    reg("task.accepted", handlers.onTaskUpdated);
    reg("task.started", handlers.onTaskUpdated);
    reg("task.completed", handlers.onTaskUpdated);
    reg("guest_request.created", handlers.onGuestRequestCreated);

    reg("guest_request.cancelled", handlers.onGuestRequestCancelled);
    reg("reservation.created", handlers.onReservationCreated);
    reg("reservation.checked_in", handlers.onReservationCheckedIn);
    reg("reservation.checked_out", handlers.onReservationCheckedOut);
    reg("room.dirty", handlers.onRoomDirty);
    reg("room.cleaning", handlers.onRoomCleaning);
    reg("room.clean", handlers.onRoomClean);

    // Connect (no-op if already connected with same token)
    staffWS.connect(token);

    return () => {
      // Unsubscribe handlers on cleanup — do NOT disconnect (connection persists for session lifetime)
      for (const [event, handler] of rawHandlers) {
        staffWS.off(event, handler);
      }
    };
  }, [token]); // Only re-run when token changes
}
