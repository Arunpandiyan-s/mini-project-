import { CheckCircle2, ClipboardList, Clock, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";

export function DutyCard() {
  const { onDuty, dutyStart, toggleDuty, tasks, session, pushActivity } = useApp();
  const mine = tasks.filter((t) => t.role === session?.role);
  const completed = mine.filter((t) => t.status === "Completed").length;

  const handle = () => {
    toggleDuty();
  };

  return (
    <section className="surface hero-gradient overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                onDuty ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="size-2 rounded-full bg-current" />
              {onDuty ? "On Duty" : "Off Duty"}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold">
            {onDuty ? "You're on shift" : "Ready to start your shift?"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {onDuty
              ? "Attendance marked. Your assigned tasks are visible below."
              : "Start duty to mark attendance and unlock today's assigned tasks."}
          </p>
        </div>

        <Button
          size="lg"
          onClick={handle}
          className={`h-16 w-full rounded-2xl text-base font-semibold lg:w-56 ${
            onDuty ? "bg-destructive hover:bg-destructive/90" : ""
          }`}
        >
          <Power className="size-5" />
          {onDuty ? "End Duty" : "Start Duty"}
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={Clock} label="Duty start" value={dutyStart ?? "--:--"} />
        <MiniStat icon={Clock} label="Shift duration" value={onDuty ? "Live" : "0h 00m"} />
        <MiniStat icon={ClipboardList} label="Tasks today" value={String(mine.length)} />
        <MiniStat icon={CheckCircle2} label="Completed" value={String(completed)} />
      </div>
    </section>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 truncate font-display text-lg font-bold">{value}</p>
    </div>
  );
}
