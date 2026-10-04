/**
 * StayEase Guest Hub — WebSocket Service
 *
 * Connects to ws://127.0.0.1:8000/ws?token=<guest JWT>
 * SSR-safe: WebSocket only instantiated client-side.
 * Singleton — use the exported `guestWS` instance.
 *
 * Only connects AFTER getGuestMe() confirms the token is valid.
 * Same events as Staff Hub (backend emits globally filtered by role/guest).
 */

const WS_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_WS_BASE_URL) ||
  "ws://127.0.0.1:8000";

type EventHandler = (data: Record<string, unknown>) => void;

const INITIAL_RETRY_MS = 2000;
const MAX_RETRIES = 5;
const BACKOFF_MULTIPLIER = 2;

export class GuestWebSocketService {
  private socket: WebSocket | null = null;
  private handlers: Map<string, EventHandler[]> = new Map();
  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentToken: string | null = null;
  private isDestroyed = false;
  private onAuthExpired: (() => void) | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  setAuthExpiredCallback(cb: () => void): void {
    this.onAuthExpired = cb;
  }

  /**
   * Connect using guest JWT. Only call after getGuestMe() succeeds.
   */
  connect(token: string): void {
    if (typeof window === "undefined") return;
    if (this.isDestroyed) return;
    this.currentToken = token;
    this.retryCount = 0;
    this._openSocket();
  }

  private _openSocket(): void {
    if (typeof window === "undefined") return;
    if (!this.currentToken || this.isDestroyed) return;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    this._cleanup(false);

    try {
      this.socket = new WebSocket(`${WS_BASE}/ws?token=${encodeURIComponent(this.currentToken)}`);
    } catch {
      this._scheduleRetry();
      return;
    }

    this.socket.onopen = () => {
      console.debug("[GuestWS] Connected.");
      this.retryCount = 0;
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const envelope = JSON.parse(event.data as string) as {
          event?: string;
          type?: string;
          data?: Record<string, unknown>;
        };
        const eventType = envelope.event ?? envelope.type;
        if (!eventType || eventType === "pong") return;

        const data = (envelope.data ?? {}) as Record<string, unknown>;
        const handlers = this.handlers.get(eventType) ?? [];
        for (const h of handlers) {
          try { h(data); } catch (err) {
            console.error(`[GuestWS] Handler error for '${eventType}':`, err);
          }
        }
      } catch { /* ignore malformed frames */ }
    };

    this.socket.onerror = () => { /* onclose handles retry */ };

    this.socket.onclose = (event: CloseEvent) => {
      console.debug(`[GuestWS] Closed. Code=${event.code}`);
      if (event.code === 1008) {
        console.warn("[GuestWS] Auth rejected. Stopping reconnect.");
        this.onAuthExpired?.();
        return;
      }
      if (!this.isDestroyed) {
        this._scheduleRetry();
      }
    };

    this._startHeartbeat();
  }

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
      console.warn(`[GuestWS] Max retries reached.`);
      return;
    }
    const delay = INITIAL_RETRY_MS * Math.pow(BACKOFF_MULTIPLIER, this.retryCount);
    this.retryCount += 1;
    console.debug(`[GuestWS] Reconnecting in ${delay}ms (attempt ${this.retryCount}/${MAX_RETRIES})...`);
    this.retryTimeout = setTimeout(() => this._openSocket(), delay);
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

  disconnect(): void {
    this._cleanup(true);
    this.handlers.clear();
    this.currentToken = null;
    console.debug("[GuestWS] Disconnected and destroyed.");
  }

  on(event: string, handler: EventHandler): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  off(event: string, handler: EventHandler): void {
    const list = this.handlers.get(event) ?? [];
    this.handlers.set(event, list.filter((h) => h !== handler));
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

/** Singleton instance. Use this across Guest Hub — do NOT create multiple instances. */
export const guestWS = new GuestWebSocketService();
