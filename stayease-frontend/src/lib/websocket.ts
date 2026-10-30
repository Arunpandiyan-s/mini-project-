/**
 * StayEase Staff Hub — WebSocket Service
 *
 * Connects to ws://127.0.0.1:8000/ws?token=<JWT>
 * Only connects AFTER session validation confirms the token is valid.
 *
 * Events actually emitted by Phase 6 backend (verified from event_service.py):
 *   connection.ready
 *   task.assigned
 *   task.reassigned
 *   task.removed
 *   task.accepted
 *   task.started
 *   task.completed
 *   guest_request.created
 *   guest_request.cancelled
 *   reservation.created
 *   reservation.cancelled
 *   reservation.checked_in
 *   reservation.checked_out
 *   room.dirty
 *   room.cleaning
 *   room.clean
 *
 * This file is SSR-safe: WebSocket is only instantiated client-side.
 */

const WS_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_WS_BASE_URL) ||
  "ws://127.0.0.1:8000";

type EventHandler = (data: Record<string, unknown>) => void;

const INITIAL_RETRY_MS = 2000;
const MAX_RETRIES = 5;
const BACKOFF_MULTIPLIER = 2;

export class StaffWebSocketService {
  private socket: WebSocket | null = null;
  private handlers: Map<string, EventHandler[]> = new Map();
  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentToken: string | null = null;
  private isDestroyed = false;
  private onAuthExpired: (() => void) | null = null;

  /**
   * Register a callback invoked once when the token is rejected by the WS server.
   */
  setAuthExpiredCallback(cb: () => void): void {
    this.onAuthExpired = cb;
  }

  /**
   * Connect to the WebSocket server using the given JWT.
   * Must only be called after session validation completes successfully.
   * SSR-safe: no-op if window is not defined.
   */
  connect(token: string): void {
    if (typeof window === "undefined") return;
    if (this.isDestroyed) return;

    this.currentToken = token;
    this.retryCount = 0; // Reset on fresh connect
    this._openSocket();
  }

  private _openSocket(): void {
    if (typeof window === "undefined") return;
    if (!this.currentToken || this.isDestroyed) return;

    // Prevent duplicate connections
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    this._cleanup(false); // Close previous socket without destroying service

    try {
      this.socket = new WebSocket(`${WS_BASE}/ws?token=${encodeURIComponent(this.currentToken)}`);
    } catch {
      this._scheduleRetry();
      return;
    }

    this.socket.onopen = () => {
      console.debug("[StaffWS] Connected.");
      this.retryCount = 0; // Reset backoff counter after successful connection
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const envelope = JSON.parse(event.data as string) as {
          event?: string;
          type?: string;
          data?: Record<string, unknown>;
        };
        const eventType = envelope.event ?? envelope.type;
        if (!eventType) return;

        // Handle ping/pong keepalive
        if (eventType === "pong" || envelope.type === "pong") return;

        const data = (envelope.data ?? {}) as Record<string, unknown>;
        const handlers = this.handlers.get(eventType) ?? [];
        for (const h of handlers) {
          try {
            h(data);
          } catch (err) {
            console.error(`[StaffWS] Handler error for event '${eventType}':`, err);
          }
        }
      } catch {
        /* Ignore malformed frames */
      }
    };

    this.socket.onerror = () => {
      /* onclose will handle retry */
    };

    this.socket.onclose = (event: CloseEvent) => {
      console.debug(`[StaffWS] Closed. Code=${event.code}`);
      // Code 1008 is the server's auth-rejection code (invalid/expired token)
      if (event.code === 1008) {
        console.warn("[StaffWS] Auth rejected by server. Stopping reconnect.");
        this.onAuthExpired?.();
        return;
      }
      if (!this.isDestroyed) {
        this._scheduleRetry();
      }
    };

    // Heartbeat ping every 30 seconds
    this._startHeartbeat();
  }

  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    if (typeof window === "undefined") return;
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private _scheduleRetry(): void {
    if (this.isDestroyed) return;
    if (this.retryCount >= MAX_RETRIES) {
      console.warn(`[StaffWS] Max retries (${MAX_RETRIES}) reached. Giving up.`);
      return;
    }

    const delay = INITIAL_RETRY_MS * Math.pow(BACKOFF_MULTIPLIER, this.retryCount);
    this.retryCount += 1;
    console.debug(`[StaffWS] Reconnecting in ${delay}ms (attempt ${this.retryCount}/${MAX_RETRIES})...`);

    this.retryTimeout = setTimeout(() => {
      this._openSocket();
    }, delay);
  }

  private _cleanup(destroy: boolean): void {
    this._stopHeartbeat();
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close(1000, "Client disconnect");
      }
      this.socket = null;
    }
    if (destroy) this.isDestroyed = true;
  }

  /** Cleanly disconnect and prevent future reconnection attempts. Call on logout. */
  disconnect(): void {
    this._cleanup(true);
    this.handlers.clear();
    this.currentToken = null;
    console.debug("[StaffWS] Disconnected and destroyed.");
  }

  /**
   * Subscribe to a named WebSocket event.
   * Handlers registered before connect() are preserved.
   */
  on(event: string, handler: EventHandler): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  /** Remove a previously registered event handler. */
  off(event: string, handler: EventHandler): void {
    const list = this.handlers.get(event) ?? [];
    this.handlers.set(event, list.filter((h) => h !== handler));
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

/** Singleton instance. Use this across the app — do NOT create multiple instances. */
export const staffWS = new StaffWebSocketService();
export const guestWS = new StaffWebSocketService();
