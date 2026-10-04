import { useState, useMemo } from "react";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, Play, User, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { SectionHeader } from "@/components/Primitives";
import { useApp } from "@/lib/store";
import type { Task, RoleId } from "@/lib/data";

const ROLE_LABELS: Record<RoleId, { label: string; color: string }> = {
  reception: { label: "Reception", color: "text-purple-600 bg-purple-500/10 border-purple-500/30" },
  housekeeping: { label: "Housekeeping", color: "text-sky-600 bg-sky-500/10 border-sky-500/30" },
  maintenance: { label: "Maintenance", color: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
  fnb: { label: "Food & Beverage", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  manager: { label: "Management", color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/30" },
};

export function StaffTaskBoard() {
  const { tasks } = useApp();
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedRole !== "All" && task.role !== selectedRole) return false;
      if (selectedStatus !== "All" && task.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const staffMatch = (task.assignedTo || "").toLowerCase().includes(q);
        const roomMatch = task.room.toLowerCase().includes(q);
        const typeMatch = task.type.toLowerCase().includes(q);
        const descMatch = task.description.toLowerCase().includes(q);
        if (!staffMatch && !roomMatch && !typeMatch && !descMatch) return false;
      }
      return true;
    });
  }, [tasks, selectedRole, selectedStatus, searchQuery]);

  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const attentionCount = tasks.filter((t) => t.status === "Attention Needed").length;

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Staff Tasks & Active Assignments"
        subtitle="Real-time live view of staff members and their assigned tasks"
      />

      {/* SUMMARY COUNTERS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setSelectedStatus("All")}
          className={cn(
            "surface p-3.5 flex items-center justify-between text-left transition-all cursor-pointer hover:border-primary/40",
            selectedStatus === "All" && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Staff Tasks</p>
            <p className="font-display text-2xl font-extrabold text-foreground mt-0.5">{totalTasks}</p>
          </div>
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="size-4" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === "In Progress" ? "All" : "In Progress")}
          className={cn(
            "surface p-3.5 flex items-center justify-between text-left transition-all cursor-pointer hover:border-sky-500/40",
            selectedStatus === "In Progress" && "ring-2 ring-sky-500 ring-offset-2 ring-offset-background"
          )}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">In Progress</p>
            <p className="font-display text-2xl font-extrabold text-sky-700 dark:text-sky-400 mt-0.5">{inProgressCount}</p>
          </div>
          <span className="grid size-9 place-items-center rounded-xl bg-sky-500/10 text-sky-600">
            <Play className="size-4" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === "Pending" ? "All" : "Pending")}
          className={cn(
            "surface p-3.5 flex items-center justify-between text-left transition-all cursor-pointer hover:border-amber-500/40",
            selectedStatus === "Pending" && "ring-2 ring-amber-500 ring-offset-2 ring-offset-background"
          )}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending</p>
            <p className="font-display text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{pendingCount}</p>
          </div>
          <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <Clock className="size-4" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === "Completed" ? "All" : "Completed")}
          className={cn(
            "surface p-3.5 flex items-center justify-between text-left transition-all cursor-pointer hover:border-emerald-500/40",
            selectedStatus === "Completed" && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
          )}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completed</p>
            <p className="font-display text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">{completedCount}</p>
          </div>
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-4" />
          </span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="surface p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by staff name, room, or task description..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="All">All Departments</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="maintenance">Maintenance</option>
            <option value="reception">Reception</option>
            <option value="fnb">Food & Beverage</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="All">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Attention Needed">Attention Needed</option>
          </select>

          {(selectedRole !== "All" || selectedStatus !== "All" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedRole("All");
                setSelectedStatus("All");
                setSearchQuery("");
              }}
              className="h-10 px-3 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              Reset ✕
            </button>
          )}
        </div>
      </div>

      {/* STAFF TASKS DISPLAY LIST / CARDS */}
      <div className="surface p-4 space-y-3">
        {filteredTasks.length === 0 ? (
          <p className="p-8 text-center text-xs sm:text-sm text-muted-foreground italic bg-muted/20 rounded-xl">
            No active staff tasks match the selected filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredTasks.map((task) => {
              const roleMeta = ROLE_LABELS[task.role] || ROLE_LABELS.housekeeping;
              const staffName = task.assignedTo || "Unassigned Staff";

              return (
                <div
                  key={task.id}
                  className="group relative rounded-2xl border border-border/80 bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 flex flex-col justify-between space-y-3"
                >
                  {/* Top Bar: Room # & Priority / Status Badges */}
                  <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-bold text-foreground">Room {task.room}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", roleMeta.color)}>
                          {roleMeta.label}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-primary mt-0.5">{task.type}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </div>
                  </div>

                  {/* Task Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {task.description}
                  </p>

                  {/* Bottom Staff Member & ETA Meta */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    {/* Staff Assigned Name */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                        <User className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase font-bold text-muted-foreground leading-none">Assigned To</p>
                        <p className="font-bold text-foreground text-xs truncate mt-0.5">{staffName}</p>
                      </div>
                    </div>

                    {/* ETA & Time */}
                    <div className="text-right shrink-0">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground leading-none">Est. Time</p>
                      <p className="font-bold text-foreground text-xs mt-0.5">{task.eta}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
