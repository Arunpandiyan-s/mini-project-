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
  const roomNumber = stay?.room.room_number ?? "—";
  const roomType = stay?.room.room_type ?? "";
  const checkIn = stay ? formatDate(stay.check_in) : "—";
  const checkOut = stay ? formatDate(stay.check_out) : "—";

  return (
    <header className="gradient-primary rounded-b-[2rem] px-5 lg:px-8 pt-6 pb-8 lg:pt-8 lg:pb-10 text-primary-foreground">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={avatar}
            alt={`${guestName} profile photo`}
            width={512}
            height={512}
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-gold/70"
          />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/70">
              Welcome back
            </p>
            <h1 className="truncate text-lg font-semibold">{guestName}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Open notifications"
            className="relative grid h-11 w-11 place-items-center rounded-2xl bg-primary-foreground/12 transition hover:bg-primary-foreground/20"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-[11px] font-bold text-gold-foreground">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open profile and settings"
            className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-foreground/12 transition hover:bg-primary-foreground/20"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[1.25rem] bg-primary-foreground/12 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/70">Room</p>
            <p className="text-2xl font-semibold leading-tight">{roomNumber}</p>
            <p className="text-xs text-primary-foreground/80">{roomType}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-foreground" />
              {stay ? "Checked In" : "—"}
            </span>
            <p className="mt-2 text-xs text-primary-foreground/80">
              {activeRequests} active request{activeRequests === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-primary-foreground/15 pt-3 text-xs text-primary-foreground/85">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {checkIn} → {checkOut}
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