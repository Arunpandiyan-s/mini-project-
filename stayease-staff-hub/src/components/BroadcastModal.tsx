import { useState } from "react";
import { Megaphone, Send, BellRing, Volume2 } from "lucide-react";
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
import { useApp } from "@/lib/store";
import { play5SecondAlarm } from "@/components/TaskCard";

export function BroadcastSendModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { sendBroadcast, session } = useApp();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      toast.error("Please enter a broadcast message to send.");
      return;
    }

    const broadcastTitle = title.trim() || "Important Operations Announcement";
    sendBroadcast(broadcastTitle, body.trim());
    toast.success("Broadcast sent! All staff members notified with popup alert.", {
      duration: 8000,
    });

    setTitle("");
    setBody("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-lg rounded-3xl p-5 sm:p-6 bg-card border-border shadow-2xl">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold font-display text-primary">
            <Megaphone className="size-5 text-primary animate-pulse shrink-0" /> Send Staff Broadcast
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Instantly sends an urgent notification popup & chime alert to all staff members on duty.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Announcement Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mandatory Briefing at 4:00 PM / VIP Arrival Alert"
              className="w-full h-11 px-3 rounded-xl border border-border bg-muted/40 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Broadcast Message <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type announcement message for all department staff..."
              className="w-full p-3 rounded-xl border border-border bg-muted/40 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium resize-none"
              required
            />
          </div>

          <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <BellRing className="size-4 shrink-0 text-amber-500" />
            <span>This will trigger an active audio chime & popup alert on all staff screens.</span>
          </div>

          <DialogFooter className="pt-2 gap-2 flex-col sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-xl w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-primary text-primary-foreground font-bold gap-2 w-full sm:w-auto shadow-md"
            >
              <Send className="size-4" /> Send Broadcast to All Staff
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BroadcastPopupAlertModal() {
  const { activeBroadcast, dismissBroadcast } = useApp();

  if (!activeBroadcast) return null;

  const handleAcknowledge = () => {
    dismissBroadcast();
  };

  return (
    <Dialog open={!!activeBroadcast} onOpenChange={(open) => !open && handleAcknowledge()}>
      <DialogContent className="w-[92vw] max-w-md rounded-3xl p-5 sm:p-6 bg-card border-2 border-primary shadow-2xl animate-in zoom-in-95">
        <DialogHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-black uppercase tracking-wider animate-bounce">
              <Megaphone className="size-3.5" /> URGENT BROADCAST
            </span>
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Volume2 className="size-3 text-primary animate-pulse" /> {activeBroadcast.time}
            </span>
          </div>

          <DialogTitle className="pt-3 text-xl font-black font-display text-foreground leading-tight">
            {activeBroadcast.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            From: <strong className="text-foreground">{activeBroadcast.sender || "Management"}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="rounded-2xl bg-primary-soft p-4 border border-primary/20 shadow-inner">
            <p className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
              {activeBroadcast.body}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleAcknowledge}
            className="h-12 w-full rounded-xl bg-primary text-primary-foreground font-extrabold text-sm shadow-lg hover:bg-primary/90"
          >
            ✓ Acknowledge & Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
