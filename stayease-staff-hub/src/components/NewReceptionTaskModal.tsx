import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BellRing,
  Volume2,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  DoorClosed,
  ShieldAlert,
  X,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { play5SecondAlarm } from "@/components/TaskCard";

export function NewReceptionTaskModal() {
  const { newReceptionTaskAlert, setNewReceptionTaskAlert } = useApp();
  const [alarmSeconds, setAlarmSeconds] = useState(5);

  useEffect(() => {
    if (!newReceptionTaskAlert) return;

    // Play 5-second alarm sound chime
    play5SecondAlarm();
    setAlarmSeconds(5);

    const interval = setInterval(() => {
      setAlarmSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [newReceptionTaskAlert]);

  if (!newReceptionTaskAlert) return null;

  const handleClose = () => {
    setNewReceptionTaskAlert(null);
  };

  return (
    <Dialog open={!!newReceptionTaskAlert} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-card border-2 border-amber-500/50 shadow-2xl animate-in zoom-in-95">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="relative grid size-12 place-items-center rounded-2xl bg-amber-500/20 text-amber-600 ring-4 ring-amber-500/10">
              <BellRing className="size-6 text-amber-500 animate-bounce" />
              {alarmSeconds > 0 && (
                <span className="absolute -top-1 -right-1 size-3 rounded-full bg-rose-600 animate-ping" />
              )}
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-bold text-foreground">
                ⚡ New Reception Task Assigned!
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Assigned by Customer / Manager · Alarm sounding ({alarmSeconds}s)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Task Details Card */}
          <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-foreground">
                {newReceptionTaskAlert.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[11px]">
                Room {newReceptionTaskAlert.room}
              </span>
            </div>

            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Task Type: <span className="text-foreground font-bold">{newReceptionTaskAlert.type}</span>
              </p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Priority: <span className="text-destructive font-bold">{newReceptionTaskAlert.priority} 🔥</span>
              </p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Assigned Staff: <span className="text-primary font-bold">{newReceptionTaskAlert.assignedTo || "Anita Sharma"}</span>
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border text-foreground font-medium text-xs mt-2">
              "{newReceptionTaskAlert.description}"
            </div>
          </div>

          {/* Alarm sound indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300">
            <span className="flex items-center gap-2">
              <Volume2 className="size-4 text-amber-500 animate-pulse" />
              5-Second Alarm Sound
            </span>
            <span>{alarmSeconds > 0 ? `Ringing... ${alarmSeconds}s` : "Silence"}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl font-bold"
              onClick={handleClose}
            >
              Dismiss
            </Button>
            <Button
              className="flex-1 h-11 rounded-xl font-bold bg-primary text-primary-foreground shadow-md"
              onClick={handleClose}
            >
              <CheckCircle2 className="size-4" /> Acknowledge & View
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
