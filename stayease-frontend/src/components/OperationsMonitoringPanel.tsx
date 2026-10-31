import { useState, useMemo } from "react";
import {
  Sparkles,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Plus,
  Search,
  Filter,
  Users,
  Building,
  TrendingUp,
  ShieldAlert,
  ArrowUpDown,
  FileText,
  UserPlus,
  RefreshCw,
  XCircle,
  BarChart2,
  PieChart as PieChartIcon,
  BedDouble,
  DoorOpen,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import type { Task, Priority, TaskStatus, RoleId, Room } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskVerificationModal } from "@/components/TaskVerificationModal";

/* ─── STATUS BADGE STYLING CONFIG ─────────────────────────────────── */
const TASK_STATUS_CONFIG: Record<
  string,
  { bg: string; dotColor: string; label: string }
> = {
  Completed: { bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25", dotColor: "bg-emerald-500", label: "Completed" },
  Pending: { bg: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25", dotColor: "bg-amber-500", label: "Pending" },
  "In Progress": { bg: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25", dotColor: "bg-sky-500", label: "In Progress" },
  Delayed: { bg: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25", dotColor: "bg-rose-500", label: "Delayed" },
  "Attention Needed": { bg: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25", dotColor: "bg-orange-500", label: "Escalated" },
};

export function OperationsMonitoringPanel() {
  const {
    tasks,
    setTasks,
    rooms,
    assignNewTask,
    updateTaskPriority,
    reassignTask,
    cancelTask,
    taskHistory,
    setTaskStatus,
    pushActivity,
    staff,
  } = useApp();

  const staffList = useMemo(() => {
    if (staff && staff.length > 0) {
      return staff.map((s) => ({
        name: s.name,
        role: s.role,
        activeTasks: tasks.filter((t) => t.assignedTo === s.name && t.status !== "Completed").length,
      }));
    }
    return [
      { name: "Sarah Miller", role: "reception", activeTasks: tasks.filter((t) => t.assignedTo === "Sarah Miller" && t.status !== "Completed").length },
      { name: "Elena Rostova", role: "housekeeping", activeTasks: tasks.filter((t) => t.assignedTo === "Elena Rostova" && t.status !== "Completed").length },
      { name: "Marcus Torres", role: "maintenance", activeTasks: tasks.filter((t) => t.assignedTo === "Marcus Torres" && t.status !== "Completed").length },
      { name: "Carlos Mendez", role: "fnb", activeTasks: tasks.filter((t) => t.assignedTo === "Carlos Mendez" && t.status !== "Completed").length },
    ];
  }, [staff, tasks]);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFloor, setFilterFloor] = useState<number>(0);
  const [filterRole, setFilterRole] = useState<string>("All");
  const [filterEmployee, setFilterEmployee] = useState<string>("All");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  // Modal Dialog States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [newTaskRoom, setNewTaskRoom] = useState("");
  const [newTaskType, setNewTaskType] = useState("Standard Cleaning");
  const [newTaskRole, setNewTaskRole] = useState<RoleId>("housekeeping");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("Medium");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("Elena Rostova");
  const [newTaskEta, setNewTaskEta] = useState("30 min");
  const [newTaskDescription, setNewTaskDescription] = useState("");

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [verifyingTask, setVerifyingTask] = useState<Task | null>(null);

  // Operational KPIs
  const kpis = useMemo(() => {
    const hkTasks = tasks.filter((t) => t.role === "housekeeping");
    const mtTasks = tasks.filter((t) => t.role === "maintenance");

    const hkTotal = hkTasks.length;
    const hkPending = hkTasks.filter((t) => t.status === "Pending").length;
    const hkInProgress = hkTasks.filter((t) => t.status === "In Progress").length;
    const hkCompleted = taskHistory.filter((t) => t.role === "housekeeping").length + hkTasks.filter((t) => t.status === "Completed").length;

    const mtTotal = mtTasks.length;
    const mtPending = mtTasks.filter((t) => t.status === "Pending").length;
    const mtInProgress = mtTasks.filter((t) => t.status === "In Progress").length;
    const mtCompleted = taskHistory.filter((t) => t.role === "maintenance").length + mtTasks.filter((t) => t.status === "Completed").length;

    const readyRooms = rooms.filter((r) => r.status === "Available").length;
    const cleaningRooms = rooms.filter((r) => r.status === "Cleaning").length;
    const maintRooms = rooms.filter((r) => r.status === "Maintenance").length;

    return {
      hkTotal,
      hkPending,
      hkInProgress,
      hkCompleted,
      mtTotal,
      mtPending,
      mtInProgress,
      mtCompleted,
      readyRooms,
      cleaningRooms,
      maintRooms,
    };
  }, [tasks, rooms, taskHistory]);

  // Filtered Task List
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterRole !== "All" && t.role !== filterRole) return false;
      if (filterPriority !== "All" && t.priority !== filterPriority) return false;
      if (filterStatus !== "All" && t.status !== filterStatus) return false;
      if (filterEmployee !== "All" && (t.assignedTo || "") !== filterEmployee) return false;
      if (filterFloor > 0) {
        const roomObj = rooms.find((r) => r.number === t.room);
        if (!roomObj || roomObj.floor !== filterFloor) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRoom = t.room.toLowerCase().includes(q);
        const matchType = t.type.toLowerCase().includes(q);
        const matchEmp = (t.assignedTo || "").toLowerCase().includes(q);
        const matchId = t.id.toLowerCase().includes(q);
        if (!matchRoom && !matchType && !matchEmp && !matchId) return false;
      }
      return true;
    });
  }, [tasks, filterRole, filterPriority, filterStatus, filterEmployee, filterFloor, searchQuery, rooms]);

  // Handle Assigning New Task
  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskRoom.trim()) {
      toast.error("Please enter a room number.");
      return;
    }
    assignNewTask({
      room: newTaskRoom.trim(),
      type: newTaskType,
      role: newTaskRole,
      priority: newTaskPriority,
      assignedTo: newTaskAssignedTo,
      eta: newTaskEta,
      description: newTaskDescription.trim() || `${newTaskType} for Room ${newTaskRoom}`,
      status: "Pending",
    });
    setIsAssignModalOpen(false);
    setNewTaskRoom("");
    setNewTaskDescription("");
  };

  return (
    <div className="space-y-6">
      {/* REAL-TIME OPERATIONAL STATS (KPI CARDS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Building className="size-5 text-primary" /> Operations Monitoring KPIs
          </h3>
          <Button
            size="sm"
            className="h-10 rounded-xl font-bold gap-2"
            onClick={() => setIsAssignModalOpen(true)}
          >
            <Plus className="size-4" /> Assign New Task
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <KpiCard label="Rooms Ready" value={kpis.readyRooms} icon={DoorOpen} color="text-emerald-600" bg="bg-emerald-600/10 border-emerald-600/30" />
          <KpiCard label="Rooms Under Clean" value={kpis.cleaningRooms} icon={Sparkles} color="text-sky-600" bg="bg-sky-500/10 border-sky-500/30" />
          <KpiCard label="Rooms Under Maint." value={kpis.maintRooms} icon={Wrench} color="text-orange-600" bg="bg-orange-500/10 border-orange-500/30" />
          <KpiCard label="Pending Housekeeping" value={kpis.hkPending} icon={Clock} color="text-amber-600" bg="bg-amber-400/20 border-amber-500/30" />
          <KpiCard label="Pending Maintenance" value={kpis.mtPending} icon={Clock} color="text-orange-600" bg="bg-orange-500/10 border-orange-500/30" />
          <KpiCard label="Completed Today" value={kpis.hkCompleted + kpis.mtCompleted} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-600/10 border-emerald-600/30" />
        </div>
      </section>

      {/* DASHBOARD ANALYTICS & WORKLOAD OVERVIEW */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Performance & Workload */}
        <div className="surface p-4 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Users className="size-4 text-primary" /> Staff Workload & Active Tasks
            </h4>
            <span className="text-xs text-muted-foreground font-semibold">Live Staff Monitor</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {staffList.map((st) => {
              const activeCount = tasks.filter((t) => (t.assignedTo === st.name || (t.role === st.role && t.status !== "Completed"))).length;
              return (
                <div key={st.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl bg-primary-soft font-bold text-xs">
                      {st.name.charAt(0)}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-foreground">{st.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">{st.role}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold border",
                    activeCount > 2 ? "bg-amber-400/20 text-amber-700 border-amber-500/30" : "bg-emerald-600/10 text-emerald-700 border-emerald-600/30"
                  )}>
                    {activeCount} active tasks
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Turnaround Averages */}
        <div className="surface p-4 space-y-3">
          <h4 className="font-bold text-sm flex items-center gap-2 border-b border-border pb-2">
            <TrendingUp className="size-4 text-primary" /> Service SLA Averages
          </h4>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Avg Cleaning Turnaround</p>
              <p className="font-display text-2xl font-bold tracking-tight tabular-nums text-foreground mt-0.5">28 Mins</p>
              <p className="text-[10px] text-muted-foreground mt-1">SLA Target: 35 Mins (On Track)</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Avg Maintenance Repair</p>
              <p className="font-display text-2xl font-bold tracking-tight tabular-nums text-foreground mt-0.5">42 Mins</p>
              <p className="text-[10px] text-muted-foreground mt-1">SLA Target: 60 Mins (On Track)</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH & FILTERS BAR */}
      <section className="surface p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Room, Task Type, Staff Name..."
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none"
            >
              <option value="All">All Departments</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="maintenance">Maintenance</option>
              <option value="reception">Reception</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Attention Needed">Escalated</option>
            </select>

            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none"
            >
              <option value="All">All Employees</option>
              {staffList.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* TASK MONITORING DATA TABLE / CARDS */}
      <section className="surface overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h4 className="font-bold text-base flex items-center gap-2">
            <CheckSquare className="size-5 text-primary" /> Active Operational Tasks ({filteredTasks.length})
          </h4>
          <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => setHistoryModalOpen(true)}>
            <FileText className="size-3.5" /> Task History Log
          </Button>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No active operational tasks found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border uppercase font-bold tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Task ID</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Task Type</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Assigned Staff</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Assigned Time</th>
                  <th className="p-3">ETA</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredTasks.map((task) => {
                  const defaultCfg = TASK_STATUS_CONFIG["Pending"]!;
                  const cfg = TASK_STATUS_CONFIG[task.status] ?? defaultCfg;
                  return (
                    <tr key={task.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-mono text-xs text-muted-foreground">{task.id}</td>
                      <td className="p-3 font-mono font-bold text-foreground">ROOM {task.room}</td>
                      <td className="p-3 font-semibold text-foreground">{task.type}</td>
                      <td className="p-3 uppercase font-bold text-muted-foreground text-[10px]">{task.role}</td>
                      <td className="p-3">
                        <select
                          value={task.assignedTo || "Grace Okafor"}
                          onChange={(e) => reassignTask(task.id, e.target.value)}
                          className="bg-transparent border border-border rounded-lg px-2 py-1 text-xs font-semibold text-foreground focus:outline-none"
                        >
                          {STAFF_LIST.map((s) => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-xs font-semibold border inline-flex items-center gap-1",
                          task.priority === "Urgent" ? "bg-destructive/15 text-destructive border-destructive/30" :
                          task.priority === "High" ? "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" :
                          "bg-muted text-muted-foreground border-border"
                        )}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-semibold border inline-flex items-center gap-1.5", cfg.bg)}>
                          <span className={cn("size-1.5 rounded-full", cfg.dotColor)} /> {cfg.label}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs tabular-nums">{task.assignedAt}</td>
                      <td className="p-3 font-mono text-xs font-bold text-foreground tabular-nums">{task.eta}</td>
                      <td className="p-3 text-right">
                        {task.status === "Completed" ? (
                          <Button
                            size="sm"
                            className="h-8 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 ml-auto"
                            onClick={() => setVerifyingTask(task)}
                          >
                            <CheckCircle2 className="size-3.5" /> Verify (OK)
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10"
                            onClick={() => cancelTask(task.id)}
                          >
                            <XCircle className="size-3.5" /> Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ASSIGN NEW TASK MODAL */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Plus className="size-6 text-primary" /> Assign Operational Task
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dispatch a new task to Housekeeping, Maintenance, or FnB staff.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Room Number *</label>
                <input
                  type="text"
                  value={newTaskRoom}
                  onChange={(e) => setNewTaskRoom(e.target.value)}
                  placeholder="e.g. 204"
                  className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Department</label>
                <select
                  value={newTaskRole}
                  onChange={(e) => setNewTaskRole(e.target.value as RoleId)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm font-semibold focus:outline-none"
                >
                  <option value="housekeeping">Housekeeping</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="fnb">Food & Beverage</option>
                  <option value="reception">Reception</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Task Type</label>
                <input
                  type="text"
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value)}
                  placeholder="e.g. Deep Cleaning, AC Repair"
                  className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm font-semibold focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Assign Staff</label>
                <select
                  value={newTaskAssignedTo}
                  onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm font-semibold focus:outline-none"
                >
                  {STAFF_LIST.map((s) => (
                    <option key={s.name} value={s.name}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Expected ETA</label>
                <input
                  type="text"
                  value={newTaskEta}
                  onChange={(e) => setNewTaskEta(e.target.value)}
                  placeholder="e.g. 30 min"
                  className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Description & Instructions</label>
              <textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                rows={2}
                placeholder="Special notes or guest instructions..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-12 rounded-xl font-bold">
                Dispatch Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* TASK HISTORY LOG MODAL */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="size-6 text-primary" /> Task History Log
            </DialogTitle>
            <DialogDescription className="text-xs">
              Immutable record of completed operational tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {taskHistory.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No completed tasks recorded in history yet.</p>
            ) : (
              taskHistory.map((item) => (
                <div key={item.id} className="surface p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-foreground">{item.type} · Room {item.room}</p>
                    <p className="text-muted-foreground">{item.id} · Role: {item.role}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/25 text-xs inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> Completed
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* TASK VERIFICATION MODAL */}
      <TaskVerificationModal
        task={verifyingTask}
        open={!!verifyingTask}
        onOpenChange={(o) => !o && setVerifyingTask(null)}
      />
    </div>
  );
}

/* ─── KPI CARD HELPER ─────────────────────────────────────────────── */
function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: typeof Building;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-3.5 flex items-center justify-between shadow-xs", bg)}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn("font-display text-2xl font-extrabold mt-0.5", color)}>{value}</p>
      </div>
      <span className="grid size-9 place-items-center rounded-xl bg-muted/60 text-muted-foreground">
        <Icon className="size-4" />
      </span>
    </div>
  );
}
