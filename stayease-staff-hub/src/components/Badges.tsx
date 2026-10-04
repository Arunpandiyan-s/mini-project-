import { cn } from "@/lib/utils";
import type { Priority, TaskStatus } from "@/lib/data";

const priorityStyles: Record<Priority, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-gold-soft text-gold-foreground",
  High: "bg-warning/20 text-warning-foreground",
  Urgent: "bg-destructive/12 text-destructive",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        priorityStyles[priority],
        className,
      )}
    >
      {priority}
    </span>
  );
}

const statusStyles: Record<TaskStatus, string> = {
  Pending: "bg-muted text-muted-foreground",
  "In Progress": "bg-primary-soft text-accent-foreground",
  Completed: "bg-success/15 text-success",
  "Attention Needed": "bg-destructive/12 text-destructive",
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        statusStyles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "gold" | "success" | "danger";
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary-soft text-accent-foreground",
    gold: "bg-gold-soft text-gold-foreground",
    success: "bg-success/15 text-success",
    danger: "bg-destructive/12 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
