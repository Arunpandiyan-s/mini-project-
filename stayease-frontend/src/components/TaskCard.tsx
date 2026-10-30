import { useEffect, useRef, useState } from "react";
import {
  Clock,
  HelpCircle,
  Play,
  Check,
  Timer,
  BellRing,
  AlertTriangle,
  Mic,
  Camera,
  Upload,
  CheckCircle2,
  Image as ImageIcon,
  Trash2,
  FileText,
  Paperclip,
  Send,
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
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import type { Task } from "@/lib/data";
import { useApp } from "@/lib/store";

// Global AudioContext reference
let globalAudioCtx: AudioContext | null = null;
let activeAlarmInterval: ReturnType<typeof setInterval> | null = null;

export function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!globalAudioCtx || globalAudioCtx.state === "closed") {
      globalAudioCtx = new AudioCtx();
    }
    if (globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch {
    return null;
  }
}

// Single ring chime pulse
function playAlarmChimePulse() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const startTime = now + i * 0.22;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? "square" : "sine";
      osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 1046, startTime);

      gain.gain.setValueAtTime(0.55, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    }
  } catch (e) {
    console.error("Audio chime error:", e);
  }
}

// Start continuous repeating alarm loop until Complete or action is taken
export function startRepeatingAlarm() {
  stopRepeatingAlarm();
  playAlarmChimePulse();
  activeAlarmInterval = setInterval(() => {
    playAlarmChimePulse();
  }, 1600); // Rings every 1.6 seconds continuously
}

// Stop continuous repeating alarm sound
export function stopRepeatingAlarm() {
  if (activeAlarmInterval) {
    clearInterval(activeAlarmInterval);
    activeAlarmInterval = null;
  }
}

// Play exact 5-second alarm sound chime for new receptionist tasks
export function play5SecondAlarm() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    for (let sec = 0; sec < 5; sec++) {
      for (let i = 0; i < 3; i++) {
        const startTime = now + sec * 1.0 + i * 0.2;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = i % 2 === 0 ? "sawtooth" : "square";
        osc.frequency.setValueAtTime(i === 0 ? 880 : i === 1 ? 1108 : 1318, startTime);

        gain.gain.setValueAtTime(0.6, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.18);
      }
    }
  } catch (e) {
    console.error("5-second alarm error:", e);
  }
}

export function TaskCard({ task }: { task: Task }) {
  const { setTaskStatus, pushActivity } = useApp();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const alarmTriggered = useRef(false);

  // Completion Report Modal States
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [roomCondition, setRoomCondition] = useState<"good" | "broken" | "missing">("good");
  const [reportMessage, setReportMessage] = useState("");
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecorded, setVoiceRecorded] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop sound when component unmounts or completes
  useEffect(() => {
    return () => {
      stopRepeatingAlarm();
    };
  }, []);

  // Voice recording timer simulation
  useEffect(() => {
    if (!isRecordingVoice) return;
    const interval = setInterval(() => {
      setVoiceSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Initialize timer if task is already in progress
  useEffect(() => {
    if (task.status === "In Progress" && secondsLeft === null) {
      setSecondsLeft(60); // 1 minute = 60 seconds
      setTimerActive(true);
    } else if (task.status === "Completed") {
      setTimerActive(false);
      stopRepeatingAlarm();
    }
  }, [task.status, secondsLeft]);

  // Countdown effect
  useEffect(() => {
    if (!timerActive || secondsLeft === null || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          if (!alarmTriggered.current) {
            alarmTriggered.current = true;
            startRepeatingAlarm(); // Start continuous alarm chime loop!
            toast.error(`Timer ended for Room ${task.room}: ringing until completed.`, {
              duration: 15000,
            });
            pushActivity(`Timer ended for Room ${task.room}: alarm ringing until completed`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, secondsLeft, task.room, pushActivity]);

  const handleStart = async () => {
    getAudioContext(); // Pre-warm Web Audio API on user click gesture
    try {
      const { acceptTask: apiAcceptTask, startTask: apiStartTask } = await import("@/lib/api");
      const s = (task.status || "").toString().toLowerCase();
      if (s === "pending" || s === "assigned" || s === "open") {
        await apiAcceptTask(task.id).catch(() => {});
      }
      await apiStartTask(task.id);
    } catch {
      // fallback local update if API is unreachable
    }
    setTaskStatus(task.id, "In Progress");
    setSecondsLeft(60); // 1 minute timer
    setTimerActive(true);
    alarmTriggered.current = false;
    stopRepeatingAlarm();
    pushActivity(`Started task for Room ${task.room}`);
    toast.success(`Task started for Room ${task.room}. 1-minute timer active.`);
  };

  const handleOpenCompleteReport = () => {
    setReportDialogOpen(true);
  };

  const toggleVoiceRecording = () => {
    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      setVoiceRecorded(true);
      toast.success("Voice note recorded and attached for Manager!");
    } else {
      setIsRecordingVoice(true);
      setVoiceSeconds(0);
      toast.info("Recording voice note for Manager...");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        toast.success("Room photo attached!");
      };
      reader.readAsDataURL(file);
    }
  };

  const submitCompletionReport = async () => {
    stopRepeatingAlarm(); // Stop continuous alarm ring sound!
    try {
      const {
        acceptTask: apiAcceptTask,
        startTask: apiStartTask,
        completeTask: apiCompleteTask,
        resolveTask: apiResolveTask,
      } = await import("@/lib/api");
      const s = (task.status || "").toString().toLowerCase();
      if (s === "pending" || s === "assigned" || s === "open") {
        await apiAcceptTask(task.id).catch(() => {});
        await apiStartTask(task.id).catch(() => {});
      } else if (s === "accepted") {
        await apiStartTask(task.id).catch(() => {});
      }
      if (task.role === "maintenance" || (task.type || "").toLowerCase().includes("maint")) {
        await apiResolveTask(task.id).catch(() => apiCompleteTask(task.id));
      } else {
        await apiCompleteTask(task.id);
      }
    } catch {
      // fallback local update
    }
    setTaskStatus(task.id, "Completed");
    setTimerActive(false);
    setReportDialogOpen(false);

    const conditionText =
      roomCondition === "good"
        ? "Nothing broken or missing (Intact)"
        : roomCondition === "broken"
        ? "⚠️ Item Broken / Damaged"
        : "⚠️ Item Missing from Room";

    const voiceText = voiceRecorded ? " | 🎙️ Voice Note Attached" : "";
    const photoText = photoPreview ? " | 📸 Room Photo Attached" : "";
    const msgText = reportMessage.trim() ? ` | Note: "${reportMessage.trim()}"` : "";

    pushActivity(
      `Completed Room ${task.room}: Condition ${conditionText}${msgText}${voiceText}${photoText} -> Report transferred to Manager`
    );

    toast.success(
      `Room ${task.room} completed! Inspection report, voice note & photo transferred to Manager.`,
      { duration: 10000 }
    );
  };

  const handleNeedHelpClick = () => {
    setHelpDialogOpen(true);
  };

  const confirmNeedHelp = () => {
    stopRepeatingAlarm(); // Stop alarm if help requested
    setTaskStatus(task.id, "Attention Needed");
    setTimerActive(false);
    setHelpDialogOpen(false);
    pushActivity(`Help requested for Room ${task.room}: transferred to another staff member`);
    toast.warning("Task moved to another housekeeping member. You must see the Manager.", {
      duration: 8000,
    });
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <article className="rounded-xl border border-border bg-card flex flex-col gap-3.5 p-4 sm:p-5 transition-all hover:border-border/80 hover:shadow-soft w-full">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Unit Designation
          </p>
          <p className="truncate font-mono text-xl sm:text-2xl font-extrabold text-foreground tracking-tight leading-tight mt-0.5">
            Room {task.room || (task as any).RoomNumber}
          </p>
          <p className="mt-1 truncate text-xs sm:text-sm font-semibold text-foreground/90">
            {task.type || (task as any).CleaningType}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <PriorityBadge priority={task.priority || (task as any).Priority} />
          <StatusBadge status={task.status || (task as any).Status} />
        </div>
      </div>

      {task.description && (
        <p className="text-xs leading-relaxed text-muted-foreground">{task.description}</p>
      )}

      <div className="flex flex-col gap-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border/60">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
            <Clock className="size-3.5 shrink-0 text-muted-foreground" />
            <span>Assigned: {task.assignedAt || (task as any).AssignedTime}</span>
          </span>
          {task.eta && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
              <Timer className="size-3.5 shrink-0 text-muted-foreground" />
              <span>Est: {task.eta}</span>
            </span>
          )}
        </div>

        {/* 1-minute live countdown timer badge */}
        {secondsLeft !== null && task.status === "In Progress" && (
          <div
            className={`inline-flex w-fit items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-mono font-bold transition-all ${
              secondsLeft === 0
                ? "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300 animate-pulse"
                : "bg-primary/10 border-primary/25 text-primary"
            }`}
          >
            {secondsLeft === 0 ? (
              <BellRing className="size-3.5 shrink-0" />
            ) : (
              <Timer className="size-3.5 shrink-0 text-primary" />
            )}
            <span>Timer: {formatTime(secondsLeft)}</span>
            {secondsLeft === 0 && <span className="font-sans font-bold">· Alarm</span>}
          </div>
        )}
      </div>

      {/* Action Buttons: Start / Complete + Need Help */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
        {task.status === "Pending" || task.status === "Attention Needed" ? (
          <Button
            className="h-10 w-full rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            onClick={handleStart}
          >
            <Play className="size-3.5 shrink-0" /> <span className="truncate">Start Task</span>
          </Button>
        ) : task.status === "In Progress" ? (
          <Button
            className="h-10 w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-bold text-xs shadow-2xs"
            onClick={handleOpenCompleteReport}
          >
            <Check className="size-3.5 shrink-0" /> <span className="truncate">Complete and Report</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-10 w-full rounded-lg border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-bold text-xs"
            disabled
          >
            <Check className="size-3.5 shrink-0" /> <span className="truncate">Task Finished</span>
          </Button>
        )}

        <Button
          variant="outline"
          className="h-10 w-full rounded-lg text-xs font-semibold border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          onClick={handleNeedHelpClick}
          disabled={task.status === "Completed"}
        >
          <HelpCircle className="size-3.5 shrink-0" /> <span className="truncate">Request Reassignment</span>
        </Button>
      </div>

      {/* Ultra-Simple WhatsApp-Style Room Completion Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="w-[92vw] max-w-md rounded-3xl p-4 sm:p-5 shadow-2xl border-border">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold font-display">
              <CheckCircle2 className="size-5 text-success shrink-0" /> Finish Room {task.room}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Inspection status & optional photo or voice note for Manager.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Condition Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setRoomCondition("good")}
                className={`px-3 py-1.5 rounded-full font-bold shrink-0 border transition-all ${
                  roomCondition === "good"
                    ? "bg-success/20 text-success border-success/40 shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                }`}
              >
                ✓ Nothing Broken
              </button>
              <button
                type="button"
                onClick={() => setRoomCondition("broken")}
                className={`px-3 py-1.5 rounded-full font-bold shrink-0 border transition-all ${
                  roomCondition === "broken"
                    ? "bg-destructive/20 text-destructive border-destructive/40 shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                }`}
              >
                ⚠ Broken Item
              </button>
              <button
                type="button"
                onClick={() => setRoomCondition("missing")}
                className={`px-3 py-1.5 rounded-full font-bold shrink-0 border transition-all ${
                  roomCondition === "missing"
                    ? "bg-amber-500/20 text-amber-600 border-amber-500/40 shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                }`}
              >
                ⚠ Missing Item
              </button>
            </div>

            {/* Active Attachment Badges (Voice / Photo) */}
            {(photoPreview || voiceRecorded || isRecordingVoice) && (
              <div className="flex items-center gap-2 flex-wrap text-xs bg-muted/30 p-2 rounded-xl border border-border/40">
                {isRecordingVoice && (
                  <span className="inline-flex items-center gap-1.5 text-destructive font-bold animate-pulse">
                    <Mic className="size-3.5 animate-bounce" /> Recording... (00:{String(voiceSeconds).padStart(2, "0")})
                  </span>
                )}
                {voiceRecorded && !isRecordingVoice && (
                  <span className="inline-flex items-center gap-1 text-success font-semibold bg-success/15 px-2.5 py-1 rounded-lg">
                    <Mic className="size-3.5" /> Voice Note Attached
                  </span>
                )}
                {photoPreview && (
                  <span className="inline-flex items-center gap-1 text-primary font-semibold bg-primary-soft px-2.5 py-1 rounded-lg">
                    <ImageIcon className="size-3.5" /> Room Photo Attached
                  </span>
                )}
              </div>
            )}

            {/* Responsive WhatsApp Chat-Style Message Container */}
            <div className="rounded-2xl border border-border bg-muted/30 p-2.5 space-y-2 shadow-inner">
              {/* Text Input Field */}
              <input
                type="text"
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="Type note for Manager..."
                className="w-full bg-transparent text-xs sm:text-sm px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border/40 pb-2"
              />

              {/* Bottom Toolbar: Attach Photo + Record Mic + Submit Send Button */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5">
                  {/* Photo Upload Icon */}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      photoPreview
                        ? "bg-primary-soft text-primary font-bold shadow-sm"
                        : "text-muted-foreground hover:bg-card hover:text-foreground border border-border/50 bg-card/60"
                    }`}
                    title="Upload/Snap Photo"
                  >
                    <Paperclip className="size-4 shrink-0" />
                    <span className="hidden min-[380px]:inline">Photo</span>
                  </button>

                  {/* Mic Voice Record Icon */}
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isRecordingVoice
                        ? "bg-destructive text-destructive-foreground animate-bounce shadow-md"
                        : voiceRecorded
                        ? "bg-success/20 text-success font-bold"
                        : "text-muted-foreground hover:bg-card hover:text-foreground border border-border/50 bg-card/60"
                    }`}
                    title="Record Voice Note"
                  >
                    <Mic className="size-4 shrink-0" />
                    <span className="hidden min-[380px]:inline">Voice</span>
                  </button>
                </div>

                {/* Submit Send Button */}
                <Button
                  type="button"
                  onClick={submitCompletionReport}
                  className="h-10 px-4 rounded-xl bg-success text-success-foreground hover:bg-success/90 font-bold shrink-0 text-xs gap-1.5 shadow-md min-w-[100px] justify-center"
                >
                  <Send className="size-3.5 shrink-0" /> Send Report
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Need Help Confirmation & Manager Notification Dialog */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="w-[92vw] max-w-md rounded-2xl border-destructive/40 p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-lg sm:text-xl">
              <AlertTriangle className="size-5 shrink-0" /> Task Transfer Notice
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm sm:text-base font-medium text-foreground">
              Task moved to another housekeeping member. You must see the Manager.
            </DialogDescription>
          </DialogHeader>

          <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            Reassigning Room {task.room} ({task.type}) to available floor staff and notifying supervisor.
          </p>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button variant="secondary" className="h-11 w-full sm:w-auto rounded-xl" onClick={() => setHelpDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-11 w-full sm:w-auto rounded-xl" onClick={confirmNeedHelp}>
              Confirm Transfer & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
