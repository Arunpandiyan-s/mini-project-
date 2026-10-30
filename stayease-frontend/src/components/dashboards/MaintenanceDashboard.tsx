import { useEffect, useRef, useState } from "react";
import { Check, Timer, Wrench, User, ShieldCheck } from "lucide-react";
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
import { SectionHeader } from "@/components/Primitives";
import { useApp } from "@/lib/store";
import type { Ticket } from "@/lib/data";

export function MaintenanceDashboard() {
  const { tickets, setTicketStatus, pushActivity, session } = useApp();
  // timers (seconds)
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

  const clearWork = () => {
    if (workRef.current) clearInterval(workRef.current);
    workRef.current = null;
  };
  const clearCooldown = () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = null;
  };

  const startWorkTimer = (ticket: Ticket) => {
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
    const techName = session?.name ?? "Technician";
    setTicketStatus(ticket.id, "In Progress", techName);
    pushActivity(`Ticket ${ticket.id} (Room ${ticket.room}) → Accepted & In Progress`);
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

  // finalize completion (internal)
  const completeTask = (ticket: Ticket) => {
    clearWork();
    setWorkSeconds(null);
    setWorkDone(false);
    setTicketStatus(ticket.id, "Completed");
    pushActivity(`Ticket ${ticket.id} (Room ${ticket.room}) → Completed`);
    toast.success("Task completed. Preparing next assignment...");
    setPendingAssignment(null);
    setAssignmentDialogOpen(false);

    // start cooldown then show the next popup
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
    } catch (e) {
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
    // record feedback in activity (no persistent store for files)
    const parts: string[] = [];
    if (feedbackText) parts.push(`Note: ${feedbackText}`);
    if (feedbackImages.length) parts.push(`${feedbackImages.length} image(s) attached`);
    if (audioUrl) parts.push(`Voice note attached`);
    pushActivity(`Feedback for ${ticketAwaitingFeedback.id}: ${parts.join(" | ")}`);
    toast.success("Feedback saved and task completed.");
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
    <div className="space-y-8">
      {currentTicket ? (
        <section className="space-y-4">
          <SectionHeader
            title="Current Assignment"
            subtitle="Only one maintenance ticket is assigned at a time."
            action={<PriorityBadge priority={currentTicket.priority} />}
          />
          <article className="surface p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="font-display text-3xl font-bold leading-none">{currentTicket.room}</p>
                <p className="mt-2 truncate text-sm font-semibold">{currentTicket.issue}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Pill tone={currentTicket.status === "Escalated" ? "danger" : "primary"}>{currentTicket.status}</Pill>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
                  <Timer className="size-3.5" />
                  {Math.floor(currentTicket.openedMinutes / 60)}h {currentTicket.openedMinutes % 60}m open
                </span>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Row icon={User} label="Technician" value={currentTicket.technician} />
              <Row icon={Timer} label="Reported" value={currentTicket.reportedAt} />
              <Row icon={Timer} label="Est. completion" value={currentTicket.eta} />
              <Row icon={Wrench} label="Parts required" value={currentTicket.parts} />
            </dl>

            <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Notes: </span>
              {currentTicket.notes}
            </p>
            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 flex items-center gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Work Timer</p>
                <p className="text-3xl font-bold tabular-nums leading-none text-foreground">
                  {workSeconds !== null ? (
                    <span className={workSeconds <= 5 ? "text-destructive" : ""}>{workSeconds}s</span>
                  ) : (
                    <span className="text-muted-foreground text-xl">Starting…</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {workDone ? "Ready to complete" : "Task is in progress while the timer runs"}
                </p>
              </div>

              <div className="ml-auto w-44">
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
                className="w-full h-14 rounded-xl bg-success hover:bg-success/90 text-success-foreground font-bold text-lg shadow-md"
                onClick={() => promptCompleteWithFeedback(currentTicket)}
              >
                <Check className="size-5 mr-2" /> Complete Task
              </Button>
            </div>
          </article>
        </section>
      ) : (
        <section className="surface flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-success/10 text-success">
            <ShieldCheck className="size-7" />
          </div>
          <h2 className="text-xl font-bold">Waiting for assignment</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The next maintenance task will appear in a blocking popup. Accept it to start working, or let it auto-accept after 15 seconds.
          </p>
        </section>
      )}

      <Dialog open={assignmentDialogOpen} onOpenChange={ignoreDialogClose}>
        <DialogContent className="sm:max-w-md" hideCloseButton>
          <DialogHeader>
            <DialogTitle>New maintenance assignment</DialogTitle>
            <DialogDescription>
              Room {assignmentTicket?.room ?? "Unassigned"}: {assignmentTicket?.issue ?? "No ticket available"}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Status: Awaiting response
          </div>

          <div className="rounded-xl bg-muted/70 p-3 text-sm text-muted-foreground">
            Accept or reject this task within 20 seconds. If you do not respond, it will be escalated automatically.
          </div>

          <div className="rounded-xl border border-muted bg-background px-4 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Response window</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{assignmentSeconds ?? 0}s</p>
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
              className="h-12 w-full rounded-xl font-bold text-sm bg-success hover:bg-success/90 text-success-foreground shadow-lg"
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

      {/* Feedback dialog shown when staff completes early */}
      <Dialog open={feedbackDialogOpen} onOpenChange={(open) => setFeedbackDialogOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Task Feedback</DialogTitle>
            <DialogDescription>Add notes, images, or a voice note about the completed task.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Add notes about work done, parts used, or follow-ups..."
              className="w-full rounded-xl border p-3 text-sm"
              rows={4}
            />

            <div>
              <label className="text-sm font-semibold">Images (optional)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => handleImageFiles(e.target.files)} />
              <div className="mt-2 flex gap-2">
                {feedbackImages.map((src, i) => (
                  <img key={i} src={src} className="h-20 w-20 rounded-lg object-cover" />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Voice note (optional)</label>
              <div className="mt-2 flex items-center gap-2">
                <Button onClick={startRecording} disabled={recording} className="h-10">
                  Start
                </Button>
                <Button onClick={stopRecording} disabled={!recording} className="h-10">
                  Stop
                </Button>
                {audioUrl ? <audio src={audioUrl} controls /> : null}
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={skipFeedbackAndComplete}>
              Skip & Complete
            </Button>
            <Button onClick={submitFeedbackAndComplete}>
              Submit Feedback & Complete
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
    <div className="min-w-0 rounded-xl bg-muted/50 p-2.5">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" /> {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold">{value}</dd>
    </div>
  );
}
