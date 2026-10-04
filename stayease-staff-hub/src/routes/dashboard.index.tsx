import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { DutyCard } from "@/components/DutyCard";
import { ReceptionDashboard } from "@/components/dashboards/ReceptionDashboard";
import { HousekeepingDashboard } from "@/components/dashboards/HousekeepingDashboard";
import { MaintenanceDashboard } from "@/components/dashboards/MaintenanceDashboard";
import { FnbDashboard } from "@/components/dashboards/FnbDashboard";
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const { session, onDuty } = useApp();
  const role: string = session?.role ?? "reception";

  if (role === "manager") {
    return <ManagerDashboard />;
  }

  return (
    <div className="space-y-8">
      <DutyCard />
      {onDuty ? (
        <>
          {role === "reception" && <ReceptionDashboard />}
          {role === "housekeeping" && <HousekeepingDashboard />}
          {role === "maintenance" && <MaintenanceDashboard />}
          {role === "fnb" && <FnbDashboard />}
        </>
      ) : (
        <div className="surface flex flex-col items-center justify-center p-8 text-center sm:p-12 rounded-2xl border border-border/60 shadow-sm bg-card">
          <div className="grid size-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Clock className="size-7" />
          </div>
          <h3 className="mt-4 text-xl font-bold">Shift Not Started</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            You are currently Off Duty. Click the <strong className="text-foreground font-semibold">Start Duty</strong> button above to mark your attendance and unlock today's active tasks and workspace.
          </p>
        </div>
      )}
    </div>
  );
}
