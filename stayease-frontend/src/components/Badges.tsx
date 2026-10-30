import { cn } from "@/lib/utils";
import type { Priority, TaskStatus } from "@/lib/data";

const priorityStyles: Record<Priority, string> = {
  Low: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  Medium: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
  High: "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30",
  Urgent: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30 font-bold",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        priorityStyles[priority] ?? priorityStyles.Medium,
        className,
      )}
    >
      {priority}
    </span>
  );
}

const statusStyles: Record<TaskStatus, { bg: string; dot: string }> = {
  Pending: {
    bg: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-400 dark:bg-slate-500",
  },
  Accepted: {
    bg: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/25",
    dot: "bg-sky-500 animate-pulse",
  },
  "In Progress": {
    bg: "bg-primary/10 text-primary dark:text-primary-foreground border-primary/25",
    dot: "bg-primary animate-pulse",
  },
  Completed: {
    bg: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  "Attention Needed": {
    bg: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30 font-bold",
    dot: "bg-rose-500 animate-ping",
  },
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const current = statusStyles[status] ?? statusStyles.Pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        current.bg,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", current.dot)} />
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
  tone?: "muted" | "primary" | "gold" | "success" | "danger" | "sky";
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground border-border/80",
    primary: "bg-primary/10 text-primary dark:text-primary-foreground border-primary/25",
    gold: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
    success: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25",
    danger: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
    sky: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-tight",
        tones[tone] ?? tones.muted,
        className,
      )}
    >
      {children}
    </span>
  );
}
