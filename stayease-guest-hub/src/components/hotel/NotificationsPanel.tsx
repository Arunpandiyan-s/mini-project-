/**
 * NotificationsPanel — Phase 8 Integration
 * Uses ApiGuestNotification from backend (not hotel-data.ts Notification type).
 */
import { BellRing } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { ApiGuestNotification } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: ApiGuestNotification[];
  onMarkAllRead: () => void;
};

function formatNotifTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  } catch {
    return isoString;
  }
}

export function NotificationsPanel({ open, onOpenChange, notifications, onMarkAllRead }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[88%] overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" /> Notifications
          </SheetTitle>
        </SheetHeader>
        <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={onMarkAllRead}>
          Mark all as read
        </Button>
        <div className="mt-3 space-y-3">
          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No notifications yet.</p>
          )}
          {notifications.map((item) => (
            <article
              key={item.notification_id}
              className={`rounded-2xl p-3 ${!item.is_read ? "bg-primary/8" : "bg-secondary/50"}`}
            >
              <div className="flex items-start gap-2">
                {!item.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Unread" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {formatNotifTime(item.created_at)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}