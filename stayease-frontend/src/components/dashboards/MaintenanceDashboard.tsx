import { useEffect, useRef, useState, useMemo } from "react";
import {
  Check,
  Timer,
  Wrench,
  User,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PriorityBadge, Pill } from "@/components/Badges";
import { SectionHeader, StatCard } from "@/components/Primitives";
import { useApp } from "@/lib/store";
import type { Ticket, Priority } from "@/lib/data";

export function MaintenanceDashboard() {
  const { tickets, setTicketStatus, tasks, setTasks, rooms, setRoomStatus, pushActivity, session } = useApp();

  // Timers (seconds)
  const WORK_DURATION = 30;
  const ASSIGNMENT_WINDOW = 20;
  const COOLDOWN_DURATION = 15;

  const [workSeconds, setWorkSeconds] = useState<number | null>(null);
  const [workDone, setWorkDone] = useState(false);
  const workRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<Ticket | null>(null);
  const [assignmentSeconds, setAssignmentSeconds] = useState<number | null>(null);
  const assignmentRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackImages, setFeedbackImages] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [ticketAwaitingFeedback, setTicketAwaitingFeedback] = useState<Ticket | null>(null);

  // Filter & Search states for the Maintenance Queue
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const activeTicket = tickets.find((t) => t.status === "In Progress");
  const nextTicket = [...tickets]
    .filter((t) => t.status === "Paused" || t.status === "Open")
    .sort((a, b) => {
      const stateOrder: Record<Ticket["status"], number> = { Open: 1, Paused: 2, "In Progress": 3, Completed: 0, Escalated: 0 };
      const order: Record<Ticket["priority"], number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      if (stateOrder[a.status] !== stateOrder[b.status]) {
        return stateOrder[b.status] - stateOrder[a.status];
      }
      return order[b.priority] - order[a.priority];
    })[0];
  const currentTicket = activeTicket ?? null;

  // Filtered maintenance queue
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filterStatus !== "All") {
        if (filterStatus === "Open" && t.status !== "Open" && t.status !== "Paused") return false;
        if (filterStatus === "In Progress" && t.status !== "In Progress") return false;
        if (filterStatus === "Completed" && t.status !== "Completed") return false;
        if (filterStatus === "Escalated" && t.status !== "Escalated") return false;
      }
      if (filterPriority !== "All" && t.priority !== filterPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mRoom = t.room.toLowerCase().includes(q);
        const mIssue = t.issue.toLowerCase().includes(q);
        const mNotes = (t.notes || "").toLowerCase().includes(q);
        const mId = t.id.toLowerCase().includes(q);
        if (!mRoom && !mIssue && !mNotes && !mId) return false;
      }
      return true;
    });
  }, [tickets, filterStatus, filterPriority, searchQuery]);

  // Operational metrics
  const metrics = useMemo(() => {
    const total = tickets.length;
    const inProgress = tickets.filter((t) => t.status === "In Progress").length;
    const open = tickets.filter((t) => t.status === "Open" || t.status === "Paused").length;
    const completed = tickets.filter((t) => t.status === "Completed").length;
    const urgent = tickets.filter((t) => t.priority === "Urgent" && t.status !== "Completed").length;
    return { total, inProgress, open, completed, urgent };
  }, [tickets]);

  const clearWork = () => {
    if (workRef.current) clearInterval(workRef.current);
    workRef.current = null;
  };
  const clearCooldown = () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = null;
  };

  const startWorkTimer = (_ticket: Ticket) => {
    clearWork();
    setWorkDone(false);
    setWorkSeconds(WORK_DURATION);
    let remaining = WORK_DURATION;
    workRef.current = setInterval(() => {
      remaining -= 1;
      setWorkSeconds(remaining);
      if (remaining <= 0) {
        clearWork();
        setWorkSeconds(0);
        setWorkDone(true);
      }
    }, 1000);
  };

  const clearAssignmentTimer = () => {
    if (assignmentRef.current) clearInterval(assignmentRef.current);
    assignmentRef.current = null;
    setAssignmentSeconds(null);
  };

  const acceptAssignment = (ticket: Ticket, autoAccepted = false) => {
    clearAssignmentTimer();
    const techName = session?.name ?? "Marcus Torres";
    setTicketStatus(ticket.id, "In Progress", techName);
    pushActivity(`Ticket ${ticket.id} (Room ${ticket.room}) → Accepted & In Progress`);

    // Sync to backend task API
    import("@/lib/api").then(({ acceptTask, startTask }) => {
      void acceptTask(ticket.id)
        .then(() => startTask(ticket.id))
        .catch(() => {});
    });

    toast.dismiss();
    toast.success(autoAccepted ? `Auto-accepted task for room ${ticket.room}.` : `Accepted task for room ${ticket.room}.`);
    startWorkTimer(ticket);
    setPendingAssignment(null);
    setAssignmentDialogOpen(false);
  };

  const rejectAssignment = (ticket: Ticket, autoRejected = false) => {
    clearAssignmentTimer();
    setTicketStatus(ticket.id, "Escalated");
    pushActivity(
      `Ticket ${ticket.id} (Room ${ticket.room}) → ${autoRejected ? "Auto-rejected" : "Rejected"} from dispatch popup`,
    );
    toast[autoRejected ? "error" : "warning"](
      autoRejected
        ? `Dispatch window expired for room ${ticket.room}. Ticket escalated.`
        : `Rejected task for room ${ticket.room}. Ticket escalated.`,
      { duration: 8000 },
    );
    setPendingAssignment(null);
    setAssignmentDialogOpen(false);
  };

  // Finalize completion (internal)
  const completeTask = (ticket: Ticket) => {
    clearWork();
    setWorkSeconds(null);
    setWorkDone(false);
    setTicketStatus(ticket.id, "Completed");
    setRoomStatus(ticket.room, "Available");
    pushActivity(`Ticket ${ticket.id} (Room ${ticket.room}) → Completed & Room Restored to Available`);

    // Sync to backend
    import("@/lib/api").then(({ resolveTask, completeTask: apiComplete }) => {
      void resolveTask(ticket.id, feedbackText || "Maintenance defect repaired.")
        .catch(() => apiComplete(ticket.id))
        .catch(() => {});
    });

    toast.success(`Task for Room ${ticket.room} completed! Room restored to Available.`);
    setPendingAssignment(null);
    setAssignmentDialogOpen(false);

    // Start cooldown then show the next popup
    setCooldownSeconds(COOLDOWN_DURATION);
    let remaining = COOLDOWN_DURATION;
    cooldownRef.current = setInterval(() => {
      remaining -= 1;
      setCooldownSeconds(remaining);
      if (remaining <= 0) {
        clearCooldown();
        setCooldownSeconds(null);
      }
    }, 1000);
  };

  // Open feedback dialog before completing so staff can add notes/images/voice
  const promptCompleteWithFeedback = (ticket: Ticket) => {
    setTicketAwaitingFeedback(ticket);
    setFeedbackText("");
    setFeedbackImages([]);
    setAudioUrl(null);
    setFeedbackDialogOpen(true);
  };

  const handleImageFiles = (files: FileList | null) => {
    if (!files) return;
    const arr: string[] = [];
    Array.from(files).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") arr.push(reader.result);
        setFeedbackImages((prev) => [...prev, ...(arr.length ? [arr[arr.length - 1]] : [])]);
      };
      reader.readAsDataURL(f);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      mr.start();
      setRecording(true);
    } catch {
      toast.error("Microphone not available or permission denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const submitFeedbackAndComplete = () => {
    if (!ticketAwaitingFeedback) return;
    const parts: string[] = [];
    if (feedbackText) parts.push(`Note: ${feedbackText}`);
    if (feedbackImages.length) parts.push(`${feedbackImages.length} image(s) attached`);
    if (audioUrl) parts.push(`Voice note attached`);
    pushActivity(`Feedback for ${ticketAwaitingFeedback.id}: ${parts.join(" | ")}`);
    completeTask(ticketAwaitingFeedback);
    setFeedbackDialogOpen(false);
    setTicketAwaitingFeedback(null);
  };

  const skipFeedbackAndComplete = () => {
    if (!ticketAwaitingFeedback) return;
    completeTask(ticketAwaitingFeedback);
    setFeedbackDialogOpen(false);
    setTicketAwaitingFeedback(null);
  };

  useEffect(() => () => {
    clearWork();
    clearCooldown();
    clearAssignmentTimer();
  }, []);

  const ignoreDialogClose = (open: boolean) => {
    if (open) {
      setAssignmentDialogOpen(true);
    }
  };

  useEffect(() => {
    if (!assignmentDialogOpen || !pendingAssignment) {
      return;
    }

    clearAssignmentTimer();
    setAssignmentSeconds(ASSIGNMENT_WINDOW);
    let remaining = ASSIGNMENT_WINDOW;
    assignmentRef.current = setInterval(() => {
      remaining -= 1;
      setAssignmentSeconds(remaining);
      if (remaining <= 0) {
        clearAssignmentTimer();
        rejectAssignment(pendingAssignment, true);
      }
    }, 1000);

    return () => {
      clearAssignmentTimer();
    };
  }, [assignmentDialogOpen, pendingAssignment?.id]);

  useEffect(() => {
    if (currentTicket) {
      setAssignmentDialogOpen(false);
      setPendingAssignment(null);
      clearAssignmentTimer();
      return;
    }

    if (!nextTicket || cooldownSeconds !== null || assignmentDialogOpen) {
      return;
    }

    setPendingAssignment(nextTicket);
    setAssignmentDialogOpen(true);
  }, [currentTicket, nextTicket, cooldownSeconds, assignmentDialogOpen]);

  const assignmentTicket = pendingAssignment ?? nextTicket;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ─── METRIC STAT CARDS ─── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Tickets" value={metrics.total} icon={ClipboardList} />
        <StatCard label="In Progress" value={metrics.inProgress} icon={Wrench} tone="primary" />
        <StatCard label="Open / In Queue" value={metrics.open} icon={Clock} tone="warning" />
        <StatCard label="Completed" value={metrics.completed} icon={CheckCircle2} tone="success" />
        <StatCard label="Urgent Defects" value={metrics.urgent} icon={AlertTriangle} tone={metrics.urgent > 0 ? "danger" : "default"} />
      </section>

      {/* ─── ACTIVE ASSIGNMENT / WORK STATION ─── */}
      {currentTicket ? (
        <section className="space-y-4">
          <SectionHeader
            title="Active Work Station"
            subtitle="Current assignment in progress. Mark complete when repair and testing finish."
            action={<PriorityBadge priority={currentTicket.priority} />}
          />
          <article className="surface p-6 border-2 border-primary/25 shadow-lg rounded-2xl bg-card">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-display text-4xl font-extrabold tracking-tight text-foreground">
                    Room {currentTicket.room}
                  </span>
                  <Pill tone="primary" className="text-xs px-3 py-1 font-bold">In Progress</Pill>
                </div>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {currentTicket.issue}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold tabular-nums text-primary">
                  <Timer className="size-4" />
                  {Math.floor(currentTicket.openedMinutes / 60)}h {currentTicket.openedMinutes % 60}m open
                </span>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Row icon={User} label="Technician" value={currentTicket.technician} />
              <Row icon={Clock} label="Reported" value={currentTicket.reportedAt} />
              <Row icon={Timer} label="Est. completion" value={currentTicket.eta} />
              <Row icon={Wrench} label="Parts required" value={currentTicket.parts} />
            </dl>

            {currentTicket.notes && (
              <p className="mt-4 rounded-xl bg-muted/60 border border-border/50 p-3.5 text-sm text-foreground leading-relaxed">
                <strong className="text-muted-foreground uppercase text-xs tracking-wider block mb-1">Issue Details & Instructions:</strong>
                {currentTicket.notes}
              </p>
            )}

            {/* Live Work Timer */}
            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Work Timer</p>
                <p className="text-3xl font-extrabold tabular-nums leading-none text-foreground mt-1">
                  {workSeconds !== null ? (
                    <span className={workSeconds <= 5 ? "text-destructive animate-pulse" : "text-primary"}>
                      {workSeconds}s
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xl">Starting…</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {workDone ? "Work duration elapsed. Ready to verify and complete." : "Task is in progress. Timer running."}
                </p>
              </div>

              <div className="w-full sm:w-56">
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${workSeconds !== null ? Math.max(0, (workSeconds / WORK_DURATION) * 100) : 100}%`,
                      background: workSeconds !== null && workSeconds <= 5 ? "hsl(var(--destructive))" : "hsl(var(--primary))",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button
                size="lg"
                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all gap-2"
                onClick={() => promptCompleteWithFeedback(currentTicket)}
              >
                <Check className="size-5" /> Mark Task Complete & Restore Room
              </Button>
            </div>
          </article>
        </section>
      ) : (
        <section className="surface p-6 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4 hero-gradient">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {nextTicket ? `Next Assignment Available: Room ${nextTicket.room}` : "All Systems Operational"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {nextTicket
                  ? `${nextTicket.issue} · Click Start Work below to accept and begin.`
                  : "No tickets currently in progress. Incoming room defects appear automatically."}
              </p>
            </div>
          </div>
          {nextTicket && (
            <Button
              className="h-11 px-5 rounded-xl font-bold bg-primary text-primary-foreground shadow-md gap-2"
              onClick={() => acceptAssignment(nextTicket)}
            >
              <Play className="size-4" /> Start Work on Room {nextTicket.room}
            </Button>
          )}
        </section>
      )}

      {/* ─── REALTIME MAINTENANCE QUEUE & TICKET MATRIX ─── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Wrench className="size-5 text-primary" /> Maintenance Tickets & Defect Queue
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time feed of all maintenance requests booked via Reception, Guest Portal, or Inspection audits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search room or issue..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open / Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Escalated">Escalated</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="h-10 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="surface p-12 text-center rounded-2xl border border-border">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500/50 mb-3" />
            <h4 className="text-base font-bold text-foreground">No Maintenance Tickets Found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery || filterStatus !== "All"
                ? "No tickets match your search or filter criteria. Try resetting filters."
                : "All room defects and maintenance tasks have been attended to."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((t) => {
              const isOpen = t.status === "Open" || t.status === "Paused";
              const isInProgress = t.status === "In Progress";
              const isCompleted = t.status === "Completed";
              const isEscalated = t.status === "Escalated";

              return (
                <div
                  key={t.id}
                  className={`surface p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isInProgress
                      ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
                      : isEscalated
                      ? "border-destructive/30 bg-destructive/[0.02]"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-sm">
                      {t.room}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-muted-foreground">{t.id}</span>
                        <PriorityBadge priority={t.priority} />
                        <Pill
                          tone={
                            isInProgress
                              ? "primary"
                              : isCompleted
                              ? "success"
                              : isEscalated
                              ? "danger"
                              : "warning"
                          }
                          className="text-[10px] py-0 px-2 font-bold"
                        >
                          {t.status}
                        </Pill>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" /> {t.reportedAt}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground truncate">{t.issue}</h4>
                      {t.notes && t.notes !== t.issue && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{t.notes}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="size-3" /> Assigned: <strong className="text-foreground font-semibold">{t.technician || "Marcus Torres"}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="size-3" /> ETA: <strong className="text-foreground font-semibold">{t.eta}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {isOpen && (
                      <Button
                        size="sm"
                        className="h-10 px-4 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-1.5"
                        onClick={() => acceptAssignment(t)}
                      >
                        <Play className="size-3.5" /> Start Work
                      </Button>
                    )}

                    {isInProgress && (
                      <Button
                        size="sm"
                        className="h-10 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5"
                        onClick={() => promptCompleteWithFeedback(t)}
                      >
                        <Check className="size-3.5" /> Complete
                      </Button>
                    )}

                    {isEscalated && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 px-4 rounded-xl font-bold text-xs gap-1.5"
                        onClick={() => acceptAssignment(t)}
                      >
                        <RotateCcw className="size-3.5" /> Re-open Task
                      </Button>
                    )}

                    {isCompleted && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="size-4" /> Fixed & Good
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── INCOMING ASSIGNMENT BLOCKING MODAL ─── */}
      <Dialog open={assignmentDialogOpen} onOpenChange={ignoreDialogClose}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-card border-border shadow-2xl" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2 text-foreground">
              <Wrench className="size-5 text-amber-500 animate-bounce" />
              New Maintenance Assignment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Room {assignmentTicket?.room ?? "Unassigned"}: {assignmentTicket?.issue ?? "No ticket available"}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Status: Awaiting Response
          </div>

          <div className="rounded-xl bg-muted/70 p-3.5 text-xs text-muted-foreground leading-relaxed">
            Accept or reject this task within 20 seconds. If you do not respond, it will be escalated automatically.
          </div>

          <div className="rounded-xl border border-muted bg-background px-4 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Response window</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">{assignmentSeconds ?? 0}s</p>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0 pt-2">
            <Button
              variant="destructive"
              className="h-12 w-full rounded-xl font-bold text-sm shadow-md"
              onClick={() => {
                if (pendingAssignment) {
                  rejectAssignment(pendingAssignment);
                }
              }}
            >
              Reject
            </Button>
            <Button
              className="h-12 w-full rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
              disabled={!pendingAssignment}
              onClick={() => {
                if (pendingAssignment) {
                  acceptAssignment(pendingAssignment);
                }
              }}
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── FEEDBACK DIALOG ON TASK COMPLETION ─── */}
      <Dialog open={feedbackDialogOpen} onOpenChange={(open) => setFeedbackDialogOpen(open)}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-500" /> Task Completion Notes
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add details, parts replaced, or photos of the repair for room {ticketAwaitingFeedback?.room}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe work completed (e.g. AC compressor filter cleaned, thermostat calibrated)..."
              className="w-full rounded-xl border border-border bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Images (optional)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageFiles(e.target.files)}
                className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {feedbackImages.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {feedbackImages.map((src, i) => (
                    <img key={i} src={src} className="h-16 w-16 rounded-lg object-cover border border-border" />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Voice note (optional)</label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={startRecording}
                  disabled={recording}
                  className="h-9 rounded-xl font-bold text-xs"
                >
                  Start Recording
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={stopRecording}
                  disabled={!recording}
                  className="h-9 rounded-xl font-bold text-xs"
                >
                  Stop Recording
                </Button>
                {audioUrl && <audio src={audioUrl} controls className="h-8 max-w-[200px]" />}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-3">
            <Button variant="ghost" className="h-10 rounded-xl font-bold text-xs" onClick={skipFeedbackAndComplete}>
              Skip & Finish
            </Button>
            <Button className="h-10 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={submitFeedbackAndComplete}>
              Save & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/50 p-2.5 border border-border/40">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 text-primary" /> {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
