import { CheckCircle2, ClipboardList, Clock, Power, Shield, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";

export function DutyCard() {
  const { onDuty, dutyStart, toggleDuty, tasks, session } = useApp();
  const mine = tasks.filter((t) => t.role === session?.role);
  const completed = mine.filter((t) => t.status === "Completed").length;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-soft transition-all">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${
                onDuty
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                  : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  onDuty ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              {onDuty ? "Shift Active · On Duty" : "Standby · Off Duty"}
            </span>

            {session?.name && (
              <span className="text-xs text-muted-foreground font-mono">
                Staff: <span className="font-semibold text-foreground">{session.name}</span>
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {onDuty ? "Current Shift Roster" : "Start your assigned shift"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
            {onDuty
              ? "Attendance confirmed. Your queue is synchronized with live room requests and automated dispatch."
              : "Mark attendance to record your shift timestamp and unlock departmental task assignment."}
          </p>
        </div>

        <Button
          size="lg"
          onClick={toggleDuty}
          className={`h-12 w-full rounded-xl text-xs sm:text-sm font-bold tracking-tight lg:w-48 shadow-xs flex items-center justify-center gap-2 ${
            onDuty
              ? "bg-rose-600 hover:bg-rose-500 text-white"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          <Power className="size-4" />
          {onDuty ? "Conclude Duty" : "Start Shift Duty"}
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 pt-5 border-t border-border/60">
        <MiniStat icon={Clock} label="Shift Started" value={dutyStart ?? "Not clocked in"} />
        <MiniStat
          icon={UserCheck}
          label="Duty Status"
          value={onDuty ? "Active On Shift" : "Standby"}
          highlight={onDuty}
        />
        <MiniStat icon={ClipboardList} label="Assigned Tasks" value={String(mine.length)} />
        <MiniStat icon={CheckCircle2} label="Completed Tasks" value={String(completed)} />
      </div>
    </section>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5 text-primary" /> {label}
      </p>
      <p
        className={`font-mono text-base font-bold tabular-nums truncate ${
          highlight ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
