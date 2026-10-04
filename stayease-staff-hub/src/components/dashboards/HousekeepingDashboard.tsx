import { useState } from "react";
import { useApp } from "@/lib/store";
import { TaskCard } from "@/components/TaskCard";
import { Sparkles } from "lucide-react";

const TABS = ["Pending", "In Progress", "Completed"] as const;
type Tab = (typeof TABS)[number];

export function HousekeepingDashboard() {
  const { tasks, session } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("Pending");

  // Filter tasks for housekeeping department or general tasks
  const hkTasks = tasks.filter((t) => {
    const role = (t.role || (t as any).Role || "").toString().toLowerCase();
    return role.includes("housekeep") || role.includes("clean") || role === "housekeeping";
  });

  const displayTasks = hkTasks.length > 0 ? hkTasks : tasks;

  const pendingTasks = displayTasks.filter((t) => {
    const s = (t.status || (t as any).Status || "").toString().toLowerCase();
    return s === "pending" || s === "open" || s === "assigned";
  });

  const inProgressTasks = displayTasks.filter((t) => {
    const s = (t.status || (t as any).Status || "").toString().toLowerCase();
    return s.includes("progress") || s === "in progress" || s === "accepted" || s === "attention needed";
  });

  const completedTasks = displayTasks.filter((t) => {
    const s = (t.status || (t as any).Status || "").toString().toLowerCase();
    return s.includes("complete") || s === "completed" || s === "verified";
  });

  const getListForTab = () => {
    switch (activeTab) {
      case "Pending":
        return pendingTasks;
      case "In Progress":
        return inProgressTasks;
      case "Completed":
        return completedTasks;
      default:
        return [];
    }
  };

  const currentList = getListForTab();

  return (
    <div className="space-y-6">
      {/* Housekeeping Shift Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">Housekeeping Operations</h3>
            <p className="text-xs text-muted-foreground">
              {session?.name ? `Logged in as ${session.name}` : "Housekeeping Staff Workspace"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Pending: {pendingTasks.length}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Active: {inProgressTasks.length}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Done: {completedTasks.length}
          </span>
        </div>
      </div>

      {/* 3 Status Tabs: Pending, In Progress, Completed with task counts */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("Pending")}
          className={`h-12 w-full rounded-2xl border px-2 sm:px-4 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === "Pending"
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <span>Pending</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              activeTab === "Pending"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {pendingTasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("In Progress")}
          className={`h-12 w-full rounded-2xl border px-2 sm:px-4 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === "In Progress"
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <span>In Progress</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              activeTab === "In Progress"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {inProgressTasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("Completed")}
          className={`h-12 w-full rounded-2xl border px-2 sm:px-4 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === "Completed"
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <span>Completed</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              activeTab === "Completed"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {completedTasks.length}
          </span>
        </button>
      </div>

      {/* Task List / Empty Category Display */}
      <div className="space-y-4">
        {currentList.length === 0 ? (
          <div className="surface p-8 text-center text-sm font-medium text-muted-foreground rounded-2xl border border-dashed border-border">
            No {activeTab.toLowerCase()} housekeeping tasks found.
          </div>
        ) : (
          currentList.map((task) => (
            <TaskCard key={task.id || (task as any).TaskID} task={task} />
          ))
        )}
      </div>
    </div>
  );
}
