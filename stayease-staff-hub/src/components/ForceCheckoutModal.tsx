import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertTriangle, User, Calendar, Clock, Lock } from "lucide-react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";

const REASON_OPTIONS = [
  "Creating Disturbance",
  "Violation of Hotel Policy",
  "Non-payment",
  "Illegal Activity",
  "Emergency Evacuation",
  "Requested by Management",
  "Other",
];

export function ForceCheckoutModal({
  roomNumber,
  guestName,
  open,
  onOpenChange,
}: {
  roomNumber: string;
  guestName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { session, forceCheckOutGuest } = useApp();
  const [selectedReason, setSelectedReason] = useState<string>("Creating Disturbance");
  const [otherReason, setOtherReason] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const [confirmInput, setConfirmInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Permission Check: Manager, Admin, or Receptionist
  const userRole = session?.role;
  const isAuthorized = userRole === "manager" || userRole === "reception" || (session as any)?.role === "admin";

  if (!isAuthorized) {
    return null;
  }

  const effectiveReason = selectedReason === "Other" ? otherReason.trim() : selectedReason;
  const isConfirmValid = confirmInput.trim().toUpperCase() === "CONFIRM" && effectiveReason.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmValid) {
      toast.error("Please select a reason and type 'CONFIRM' to proceed.");
      return;
    }

    setIsSubmitting(true);
    try {
      forceCheckOutGuest({
        roomNumber,
        reason: effectiveReason,
        additionalNotes: additionalNotes.trim(),
      });
      onOpenChange(false);
      // Reset form
      setConfirmInput("");
      setAdditionalNotes("");
      setOtherReason("");
      setSelectedReason("Creating Disturbance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-card border-destructive/30 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 text-destructive">
            <span className="grid size-10 place-items-center rounded-2xl bg-destructive/15 ring-4 ring-destructive/10">
              <ShieldAlert className="size-6 text-destructive" />
            </span>
            <div>
              <DialogTitle className="font-display text-2xl font-bold text-foreground">
                Force Check-Out / Evict Guest
              </DialogTitle>
              <DialogDescription className="text-xs text-destructive font-semibold">
                ⚠️ Management Action: Immediate guest removal and room eviction.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Guest & Room Meta Info */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-destructive/5 border border-destructive/15 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Guest Name</p>
              <p className="font-bold text-foreground text-sm truncate">{guestName || "Occupied Guest"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Room Number</p>
              <p className="font-bold text-foreground text-sm">Room {roomNumber}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Check-in Date</p>
              <p className="font-semibold text-foreground">Today 08:30 AM</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stay Duration</p>
              <p className="font-semibold text-foreground">1 Day 6 Hours</p>
            </div>
          </div>

          {/* Reason Select */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reason for Force Check-Out <span className="text-destructive">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-destructive"
              required
            >
              {REASON_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === "Other" && (
            <div className="space-y-1 animate-in fade-in duration-200">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Specify Reason <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Enter custom reason for eviction..."
                className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
                required
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Additional Notes / Incident Report
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={2}
              placeholder="Provide security context, police report #, or staff observations..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-destructive resize-none"
            />
          </div>

          {/* Confirmation Typed Requirement */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="size-4 shrink-0 text-amber-500" /> Type "CONFIRM" below to proceed
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Type CONFIRM to enable action"
              className="w-full h-11 px-3 rounded-xl border border-amber-500/40 bg-card text-foreground text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-widest"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 h-12 rounded-xl font-bold"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isConfirmValid || isSubmitting}
              className="flex-1 h-12 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20 disabled:opacity-50"
            >
              <ShieldAlert className="size-5" />
              {isSubmitting ? "Processing Eviction..." : "Force Check-Out"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
