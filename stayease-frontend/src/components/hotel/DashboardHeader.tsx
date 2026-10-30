/**
 * DashboardHeader — Phase 8 Integration
 * Renders real guest profile and stay data from FastAPI.
 * Falls back gracefully when stay is not yet loaded.
 * No hardcoded Room 512 or "Aisha Rahman".
 */
import { Bell, CalendarDays, Settings } from "lucide-react";
import avatar from "@/assets/guest-avatar.jpg";
import type { ApiGuestProfile, ApiGuestStay } from "@/lib/types";

type Props = {
  unreadCount: number;
  activeRequests: number;
  guest: ApiGuestProfile | null;
  stay: ApiGuestStay | null;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
};

export function DashboardHeader({
  unreadCount,
  activeRequests,
  guest,
  stay,
  onOpenNotifications,
  onOpenSettings,
}: Props) {
  const guestName = guest?.name ?? "Guest";
  const roomNumber = stay?.room.room_number ?? "Unassigned";
  const roomType = stay?.room.room_type ?? "Standard Suite";
  const checkIn = stay ? formatDate(stay.check_in) : "Pending";
  const checkOut = stay ? formatDate(stay.check_out) : "Pending";

  return (
    <header className="rounded-2xl border border-border bg-card p-5 lg:p-6 shadow-soft text-foreground">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <img
            src={avatar}
            alt={`${guestName} profile photo`}
            width={512}
            height={512}
            loading="lazy"
            className="size-12 shrink-0 rounded-xl object-cover ring-1 ring-border shadow-2xs"
          />
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Guest Resident
            </p>
            <h1 className="truncate text-lg font-bold text-foreground">{guestName}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Open notifications"
            className="relative grid size-9 place-items-center rounded-lg border border-border bg-background hover:bg-accent text-foreground transition-colors"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open profile and settings"
            className="grid size-9 place-items-center rounded-lg border border-border bg-background hover:bg-accent text-foreground transition-colors"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {/* Luxury Digital Room Key Card */}
      <div className="mt-4 rounded-xl border border-border/80 bg-background/80 p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Active Room</p>
            <p className="font-mono text-2xl font-extrabold text-foreground leading-tight mt-0.5 tabular-nums">
              {roomNumber}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{roomType}</p>
          </div>
          <div className="text-right space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {stay ? "Checked In" : "Pre-Registered"}
            </span>
            <p className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {activeRequests} active request{activeRequests === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-xs font-mono text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0 text-primary" />
          <span className="truncate tabular-nums">
            {checkIn} to {checkOut}
          </span>
        </div>
      </div>
    </header>
  );
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}