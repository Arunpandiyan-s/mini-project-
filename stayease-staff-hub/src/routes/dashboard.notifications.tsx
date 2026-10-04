import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, AlarmClock, ConciergeBell, Megaphone, Clock, Siren, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/Primitives";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import type { NotificationItem } from "@/lib/data";

export const Route = createFileRoute("/dashboard/notifications")({
  component: NotificationsPage,
});

const icons: Record<NotificationItem["kind"], LucideIcon> = {
  task: Bell,
  overdue: AlarmClock,
  guest: ConciergeBell,
  announcement: Megaphone,
  shift: Clock,
  emergency: Siren,
};

function NotificationsPage() {
  const { notifications, markRead, markAllRead, session } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.role === "housekeeping" || session?.role === "fnb") {
      void navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  if (session?.role === "housekeeping" || session?.role === "fnb") return null;

  return (
    <div>
      <SectionHeader
        title="Notifications"
        subtitle={`${notifications.filter((n) => !n.read).length} unread`}
        action={
          <Button variant="secondary" className="h-11 rounded-xl" onClick={markAllRead}>
            Mark all read
          </Button>
        }
      />
      <div className="space-y-3">
        {notifications.map((n) => {
          const Icon = icons[n.kind];
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n.id)}
              className={cn(
                "surface grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40",
                !n.read && "border-primary/40 bg-primary-soft/40",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl",
                  n.kind === "emergency"
                    ? "bg-destructive/12 text-destructive"
                    : "bg-primary-soft text-accent-foreground",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">{n.title}</span>
                  {!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{n.time}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
