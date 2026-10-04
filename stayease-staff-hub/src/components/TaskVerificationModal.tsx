import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Sparkles,
  Volume2,
  Play,
  Pause,
  Image as ImageIcon,
  User,
  Clock,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { useApp } from "@/lib/store";
import type { Task } from "@/lib/data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TaskVerificationModal({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { verifyTask, rejectTaskVerification } = useApp();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectionReasonSelect, setRejectionReasonSelect] = useState("Dust found");

  if (!task) return null;

  const isMaintenance = task.role === "maintenance";

  // Mock Evidence Assets
  const proofImages = [
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
  ];

  const handleToggleAudio = () => {
    setIsPlayingAudio(!isPlayingAudio);
    if (!isPlayingAudio) {
      toast.info("Playing staff audio inspection clip...");
      setTimeout(() => setIsPlayingAudio(false), 4000);
    }
  };

  const handleConfirmVerification = () => {
    verifyTask(task.id);
    onOpenChange(false);
  };

  const handleRequestReClean = () => {
    rejectTaskVerification(task.id, rejectionReasonSelect);
    setShowRejectPrompt(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-card border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-emerald-600/15 text-emerald-600 ring-4 ring-emerald-600/10">
              <ShieldCheck className="size-6 text-emerald-600" />
            </span>
            <div>
              <DialogTitle className="font-display text-2xl font-bold text-foreground">
                Task Completion Verification
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review image & audio evidence before final receptionist approval.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Task Info Summary */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/50 border border-border text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Task ID & Room</p>
              <p className="font-bold text-foreground text-sm">{task.id} · Room {task.room}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Staff</p>
              <p className="font-bold text-foreground text-sm">{task.assignedTo || "Grace Okafor"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Task Type</p>
              <p className="font-semibold text-foreground">{task.type}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority</p>
              <p className="font-semibold text-foreground">{task.priority}</p>
            </div>
          </div>

          {/* Image Evidence Section */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="size-4 text-primary" /> Image Evidence (Cleanliness / Repair Proof)
            </p>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950 aspect-video">
              <img
                src={proofImages[selectedImageIndex]}
                alt="Work Completion Proof"
                className="w-full h-full object-cover transition-all"
              />
              <div className="absolute bottom-2 right-2 flex gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl">
                {proofImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={cn(
                      "size-2.5 rounded-full transition-all",
                      selectedImageIndex === idx ? "bg-white scale-125" : "bg-white/40"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Audio Evidence Section */}
          <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-2">
            <p className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
              <Volume2 className="size-4 text-sky-500" /> Staff Voice Inspection Clip
            </p>
            <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="size-9 rounded-full p-0 shrink-0"
                  onClick={handleToggleAudio}
                >
                  {isPlayingAudio ? <Pause className="size-4 text-primary" /> : <Play className="size-4 text-primary" />}
                </Button>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {isPlayingAudio ? "Playing audio inspection..." : "Voice note (0:14s)"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    "{task.assignedTo || "Staff"}: Room {task.room} turnover completed & sanitized."
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">0:14</span>
            </div>
          </div>

          {/* Mandatory Rejection Reason Selector */}
          {showRejectPrompt ? (
            <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-2">
              <label className="text-xs font-bold text-destructive uppercase">Mandatory Rejection Reason *</label>
              <select
                value={rejectionReasonSelect}
                onChange={(e) => setRejectionReasonSelect(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-bold"
              >
                <option value="Dust found">Dust found</option>
                <option value="Bathroom not cleaned">Bathroom not cleaned</option>
                <option value="Bed not changed">Bed not changed</option>
                <option value="Floor dirty">Floor dirty</option>
                <option value="Fixture still broken">Fixture still broken / dripping</option>
              </select>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" className="h-9 font-bold text-xs" onClick={() => setShowRejectPrompt(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="destructive" className="h-9 font-bold text-xs flex-1" onClick={handleRequestReClean}>
                  Confirm Rejection & Create Re-Task
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl font-bold text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowRejectPrompt(true)}
              >
                <RotateCcw className="size-4" /> {isMaintenance ? "Reject Maintenance" : "Reject Cleaning"}
              </Button>
              <Button
                type="button"
                className="flex-1 h-12 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                onClick={handleConfirmVerification}
              >
                <CheckCircle2 className="size-5" /> {isMaintenance ? "Approve Maintenance" : "Approve Cleaning"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
