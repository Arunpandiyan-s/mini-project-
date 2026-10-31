import { useState, useEffect, useRef, useCallback } from "react";
import {
  LogIn,
  CalendarPlus,
  Search,
  BedDouble,
  ClipboardCheck,
  PlaneLanding,
  PlaneTakeoff,
  Clock,
  Crown,
  DoorOpen,
  DoorClosed,
  Send,
  MessageSquare,
  CalendarOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Timer,
  HelpCircle,
  User,
  Phone,
  Mail,
  Car,
  Sparkles,
  FileText,
  Power,
  ShieldAlert,
  Lock,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { SectionHeader, StatCard } from "@/components/Primitives";
import { Pill } from "@/components/Badges";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/store";
import type { Task, Priority } from "@/lib/data";
import { RoomGrid } from "@/components/RoomGrid";

import { FloorWiseRoomGrid } from "@/components/FloorWiseRoomGrid";
import { OperationsMonitoringPanel } from "@/components/OperationsMonitoringPanel";
import { RealtimeNotificationCenter } from "@/components/RealtimeNotificationCenter";

/* ─── DUTY OVERLAY ─────────────────────────────────────────────────── */
function DutyOverlay({ onStartDuty }: { onStartDuty: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-lg rounded-2xl">
      <div className="text-center max-w-md p-8 space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 ring-4 ring-primary/20">
          <Lock className="size-10 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">Start Your Duty</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Start your duty to unlock today's receptionist operations. Attendance will be recorded automatically.
        </p>
        <Button
          size="lg"
          className="h-14 w-full max-w-xs rounded-2xl text-base font-bold shadow-lg hover:shadow-xl transition-all"
          onClick={onStartDuty}
        >
          <Power className="size-5" /> Start Duty
        </Button>
      </div>
    </div>
  );
}

/* ─── SHIFT TIMER ──────────────────────────────────────────────────── */
function ShiftTimer({ dutyStart }: { dutyStart: string | null }) {
  const [elapsed, setElapsed] = useState("0h 00m 00s");

  useEffect(() => {
    if (!dutyStart) {
      setElapsed("0h 00m 00s");
      return;
    }
    const parseTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h! * 60 + m!;
    };
    const startMin = parseTime(dutyStart);

    const tick = () => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const currentSec = now.getSeconds();
      const diff = Math.max(0, (currentMin - startMin) * 60 + currentSec);
      const h = Math.floor(diff / 3600);
      const mi = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(`${h}h ${String(mi).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dutyStart]);

  return <span className="font-display text-lg font-bold tabular-nums">{elapsed}</span>;
}

/* ─── NEW BOOKING MODAL POPUP ───────────────────────────────────────── */
function NewBookingModal() {
  const { rooms, createBooking } = useApp();
  const [open, setOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [roomType, setRoomType] = useState("Deluxe King");
  const [roomNumber, setRoomNumber] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [parking, setParking] = useState(false);
  const [specialReq, setSpecialReq] = useState("");

  const availableRooms = rooms.filter(
    (r) => r.status === "Available" && r.type === roomType
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !phone || !checkIn || !checkOut) {
      toast.error("Please fill all required fields.");
      return;
    }
    createBooking({
      guestName,
      phone,
      email,
      roomType,
      roomNumber: roomNumber || "",
      guestsCount,
      checkIn,
      checkOut,
      parking,
      specialRequirements: specialReq,
    });
    toast.success(`Booking created for ${guestName}!`);
    // Reset & close
    setGuestName("");
    setPhone("");
    setEmail("");
    setRoomNumber("");
    setGuestsCount(1);
    setCheckIn("");
    setCheckOut("");
    setParking(false);
    setSpecialReq("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-13 px-6 rounded-2xl font-bold text-base shadow-md hover:shadow-lg flex items-center gap-2">
          <CalendarPlus className="size-5" /> New Offline Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold flex items-center gap-2 text-foreground">
            <CalendarPlus className="size-6 text-primary" />
            New Offline Booking
          </DialogTitle>
          <DialogDescription className="text-xs">
            Enter guest details to process an offline or walk-in booking immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField label="Guest Name *" value={guestName} onChange={setGuestName} placeholder="Full name" />
            <InputField label="Phone *" value={phone} onChange={setPhone} placeholder="+91 98888 77777" />
            <InputField label="Email" value={email} onChange={setEmail} placeholder="guest@email.com" />
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Room Type</label>
              <select
                value={roomType}
                onChange={(e) => { setRoomType(e.target.value); setRoomNumber(""); }}
                className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {["Deluxe King", "Twin Classic", "Executive Suite", "Standard Queen"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Room Number</label>
              <select
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Auto-assign</option>
                {availableRooms.map((r) => (
                  <option key={r.number} value={r.number}>Room {r.number} (Floor {r.floor})</option>
                ))}
              </select>
            </div>
            <InputField label="Guests Count" value={String(guestsCount)} onChange={(v) => setGuestsCount(Number(v) || 1)} type="number" />
            <InputField label="Check-In Date *" value={checkIn} onChange={setCheckIn} type="date" />
            <InputField label="Check-Out Date *" value={checkOut} onChange={setCheckOut} type="date" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={parking} onChange={(e) => setParking(e.target.checked)} className="size-4 rounded" id="modal-parking" />
            <label htmlFor="modal-parking" className="text-sm font-semibold text-foreground">Parking Required</label>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Special Requirements</label>
            <textarea
              value={specialReq}
              onChange={(e) => setSpecialReq(e.target.value)}
              rows={2}
              placeholder="Allergies, accessibility, late check-in..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none text-foreground"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-12 rounded-xl font-bold text-base">
              <CalendarPlus className="size-4" /> Save & Create Booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── BOOK & DISPATCH MAINTENANCE MODAL ────────────────────────────── */
function BookMaintenanceModal() {
  const { rooms, setTasks, setRoomStatus, pushActivity } = useApp();
  const [open, setOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [issueType, setIssueType] = useState("Air Conditioning / HVAC");
  const [priority, setPriority] = useState<Priority>("High");
  const [assignedTechnician, setAssignedTechnician] = useState("Marcus Torres");
  const [description, setDescription] = useState("");
  const [blocksOccupancy, setBlocksOccupancy] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      toast.error("Please select or enter a room number.");
      return;
    }

    setSubmitting(true);
    const taskId = `T-MN-${roomNumber}-${Date.now().toString().slice(-4)}`;
    const fullDesc = description.trim() || `${issueType} reported by Receptionist`;

    const newMaintTask: Task = {
      id: taskId,
      room: roomNumber,
      type: issueType,
      role: "maintenance",
      priority: priority,
      assignedTo: assignedTechnician,
      assignedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      eta: "30 min",
      description: fullDesc,
      status: "Pending",
    };

    setTasks((prev) => [newMaintTask, ...prev]);
    if (blocksOccupancy) {
      setRoomStatus(roomNumber, "Maintenance");
    }

    try {
      const { reportRoomMaintenance } = await import("@/lib/api");
      await reportRoomMaintenance(roomNumber, {
        issue: `${issueType}: ${fullDesc}`,
        priority: priority.toLowerCase(),
        blocks_occupancy: blocksOccupancy,
      });
      toast.success(`Maintenance booked for Room ${roomNumber}! Dispatched to ${assignedTechnician}.`);
    } catch {
      toast.success(`Maintenance task created locally for Room ${roomNumber}.`);
    }

    pushActivity(`Reception booked maintenance for Room ${roomNumber}: ${issueType} (${assignedTechnician})`);
    setSubmitting(false);
    setOpen(false);
    setRoomNumber("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          variant="outline"
          onClick={() => setOpen(true)}
          className="h-13 px-6 rounded-2xl font-bold text-base border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 shadow-sm flex items-center gap-2"
        >
          <Wrench className="size-5 text-amber-500" /> Book Maintenance
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold flex items-center gap-2 text-foreground">
            <Wrench className="size-6 text-amber-500" />
            Book & Dispatch Maintenance
          </DialogTitle>
          <DialogDescription className="text-xs">
            Log a maintenance defect or room issue. Immediately dispatches to the maintenance staff dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Room Number *</label>
            <select
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              required
              className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a room</option>
              {rooms.map((r) => (
                <option key={r.number} value={r.number}>
                  Room {r.number} (Floor {r.floor} · {r.status})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Issue Type</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Air Conditioning / HVAC">Air Conditioning / HVAC</option>
                <option value="Plumbing / Water Leak">Plumbing / Water Leak</option>
                <option value="Electrical / Lighting">Electrical / Lighting</option>
                <option value="Door Lock / Keycard Fault">Door Lock / Keycard Fault</option>
                <option value="TV / Audio / Controls">TV / Audio / Controls</option>
                <option value="Furniture / Fixtures">Furniture / Fixtures</option>
                <option value="Urgent General Defect">Urgent General Defect</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Urgent">Urgent (Immediate)</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Technician</label>
            <select
              value={assignedTechnician}
              onChange={(e) => setAssignedTechnician(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Marcus Torres">Marcus Torres (On Duty · Lead Engineer)</option>
              <option value="David Miller">David Miller (Electrical Tech)</option>
              <option value="Vijay Singh">Vijay Singh (Plumbing Specialist)</option>
              <option value="Ravi Kumar">Ravi Kumar (HVAC)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              checked={blocksOccupancy}
              onChange={(e) => setBlocksOccupancy(e.target.checked)}
              className="size-4 rounded"
              id="maint-blocks-occ"
            />
            <label htmlFor="maint-blocks-occ" className="text-xs font-semibold text-foreground">
              Block room occupancy (sets status to Maintenance)
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Defect Description / Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide defect details (e.g., AC blowing warm air, faucet dripping in bathroom)..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none text-foreground"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 h-12 rounded-xl font-bold text-base bg-amber-600 hover:bg-amber-700 text-white gap-2">
              <Wrench className="size-4" /> {submitting ? "Dispatching..." : "Dispatch Maintenance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


/* ─── PRE-REGISTRATION APPROVALS ───────────────────────────────────── */
function PreRegistrationPanel() {
  const { preRegistrations, approvePreRegistration, rejectPreRegistration } = useApp();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const pending = preRegistrations.filter((p) => p.status === "Pending");
  const handled = preRegistrations.filter((p) => p.status !== "Pending");

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    rejectPreRegistration(id, rejectReason);
    setRejectId(null);
    setRejectReason("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1">
        <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-accent-foreground">
          <ClipboardCheck className="size-4" />
        </span>
        <h3 className="text-lg font-bold">Pre-Registration Approvals</h3>
        {pending.length > 0 && (
          <Pill tone="danger">{pending.length} pending</Pill>
        )}
      </div>

      {pending.length === 0 && (
        <div className="surface p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success/50 mb-3" />
          <p className="text-muted-foreground text-sm">No pending pre-registrations.</p>
        </div>
      )}

      {pending.map((pr) => (
        <div key={pr.id} className="surface p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-base">{pr.guestName}</p>
              <p className="text-xs text-muted-foreground">{pr.id} · Arrival: {pr.arrivalDate} · {pr.roomType}</p>
            </div>
            <Pill tone="danger">Pending</Pill>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <MiniDetail icon={Phone} label="Phone" value={pr.phone} />
            <MiniDetail icon={Mail} label="Email" value={pr.email} />
            <MiniDetail icon={User} label="Guests" value={String(pr.guestCount)} />
            <MiniDetail icon={Car} label="Parking" value={pr.parking ? "Yes" : "No"} />
          </div>
          {pr.specialRequests && (
            <div className="text-xs p-2 bg-muted/50 rounded-lg">
              <span className="font-bold text-muted-foreground">Special: </span>{pr.specialRequests}
            </div>
          )}
          {rejectId === pr.id ? (
            <div className="space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-destructive resize-none"
              />
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 h-10 rounded-xl" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
                <Button className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleReject(pr.id)}>Confirm Reject</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button className="flex-1 h-10 rounded-xl bg-success text-success-foreground hover:bg-success/90 font-bold" onClick={() => approvePreRegistration(pr.id)}>
                <CheckCircle2 className="size-4" /> Approve
              </Button>
              <Button variant="outline" className="flex-1 h-10 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 font-bold" onClick={() => setRejectId(pr.id)}>
                <XCircle className="size-4" /> Reject
              </Button>
            </div>
          )}
        </div>
      ))}

      {handled.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Previously Handled</p>
          {handled.map((pr) => (
            <div key={pr.id} className="surface p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{pr.guestName}</p>
                <p className="text-xs text-muted-foreground">{pr.id} · {pr.arrivalDate}</p>
              </div>
              <Pill tone={pr.status === "Approved" ? "success" : "danger"}>{pr.status}</Pill>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── RESERVATIONS CHECK-IN LIST ───────────────────────────────────── */
function ReservationsPanel() {
  const { session, reservations, checkInGuest } = useApp();
  const canCheckIn = session?.role === "reception" || session?.role === "manager";

  if (reservations.length === 0) {
    return (
      <div className="surface p-8 text-center">
        <PlaneLanding className="mx-auto size-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground text-sm">No reservations. All guests checked in.</p>
      </div>
    );
  }

  return (
    <div className="surface divide-y divide-border overflow-hidden">
      {reservations.map((r) => (
        <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 transition-colors hover:bg-muted/50">
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.guest}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Arrival {r.arrival} · Room {r.room} · {r.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill
              tone={
                r.status === "VIP" ? "gold"
                  : r.status === "Checked In" ? "success"
                    : r.status === "Pending" ? "danger"
                      : "primary"
              }
            >
              {r.status}
            </Pill>
            {r.status !== "Checked In" && (
              <Button
                size="sm"
                className={`h-9 rounded-xl font-bold ${
                  canCheckIn
                    ? "bg-success text-success-foreground hover:bg-success/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                }`}
                title={canCheckIn ? "Check in guest" : "Check-in requires Receptionist or Manager role"}
                onClick={() => {
                  if (!canCheckIn) {
                    toast.error("Operation not permitted: Check-in requires Receptionist or Manager role.");
                    return;
                  }
                  checkInGuest(r.id);
                }}
              >
                <LogIn className="size-3.5" /> Check In
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── TASK CARD WITH COUNTDOWN ─────────────────────────────────────── */
function ReceptionTaskCard({ task }: { task: any }) {
  const { acceptTask, startTask, completeTask, requestHelp } = useApp();
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const hasAlerted = useRef(false);

  // Parse ETA minutes
  const etaMin = parseInt(task.eta) || 20;
  const totalSec = etaMin * 60;
  const remainingSec = Math.max(0, totalSec - elapsedSec);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // Alert sound 10 seconds before deadline
  useEffect(() => {
    if (remainingSec <= 10 && remainingSec > 0 && isRunning && !hasAlerted.current) {
      hasAlerted.current = true;
      try {
        const ctx = new AudioContext();
        audioRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "square";
        gain.gain.value = 0.15;
        osc.start();
        setTimeout(() => osc.stop(), 500);
      } catch { /* audio blocked */ }
      toast.warning(`⚠️ Task ${task.id}: Less than 10 seconds remaining!`);
    }
  }, [remainingSec, isRunning, task.id]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const progressPct = totalSec > 0 ? Math.min(100, (elapsedSec / totalSec) * 100) : 0;

  const handleAccept = () => {
    acceptTask(task.id);
    toast.success(`Task ${task.id} accepted.`);
  };

  const handleStart = () => {
    startTask(task.id);
    setIsRunning(true);
    hasAlerted.current = false;
    toast.info(`Task ${task.id} started. Timer running.`);
  };

  const handleComplete = () => {
    completeTask(task.id);
    setIsRunning(false);
  };

  const handleHelp = () => {
    requestHelp(task.id);
  };

  const status = task.status as string;
  const isPending = status === "Pending";
  const isAccepted = status === "Accepted";
  const isInProgress = status === "In Progress";

  return (
    <div className="surface p-4 space-y-3 transition-all hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{task.type}</p>
          <p className="text-xs text-muted-foreground">
            {task.id} · Room {task.room} · ETA {task.eta}
          </p>
        </div>
        <Pill tone={isPending ? "muted" : isAccepted ? "primary" : isInProgress ? "gold" : "success"}>
          {status}
        </Pill>
      </div>
      <p className="text-sm text-muted-foreground">{task.description}</p>

      {isInProgress && (
        <div className="space-y-2 p-3 rounded-xl bg-muted/40">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1 text-muted-foreground"><Timer className="size-3" /> Elapsed: {formatTime(elapsedSec)}</span>
            <span className={`flex items-center gap-1 ${remainingSec <= 10 ? "text-destructive animate-pulse" : "text-muted-foreground"}`}>
              Remaining: {formatTime(remainingSec)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${progressPct >= 90 ? "bg-destructive" : progressPct >= 70 ? "bg-warning" : "bg-primary"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {isPending && (
          <Button className="flex-1 h-10 rounded-xl font-bold" onClick={handleAccept}>
            <CheckCircle2 className="size-4" /> Accept
          </Button>
        )}
        {isAccepted && (
          <Button className="flex-1 h-10 rounded-xl font-bold bg-gold text-gold-foreground hover:bg-gold/90" onClick={handleStart}>
            <Play className="size-4" /> Start
          </Button>
        )}
        {isInProgress && (
          <>
            <Button className="flex-1 h-10 rounded-xl font-bold bg-success text-success-foreground hover:bg-success/90" onClick={handleComplete}>
              <CheckCircle2 className="size-4" /> Complete
            </Button>
            <Button variant="outline" className="h-10 rounded-xl font-bold border-warning/40 text-warning-foreground hover:bg-warning/10" onClick={handleHelp}>
              <HelpCircle className="size-4" /> Need Help
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function TasksPanel() {
  const { tasks, session } = useApp();
  const receptionTasks = tasks.filter((t) => t.role === session?.role || t.role === "reception");

  if (receptionTasks.length === 0) {
    return (
      <div className="surface p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success/50 mb-3" />
        <p className="text-muted-foreground text-sm">All tasks completed. Great work!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {receptionTasks.map((t) => (
        <ReceptionTaskCard key={t.id} task={t} />
      ))}
    </div>
  );
}

/* ─── COMMUNICATION PANEL ──────────────────────────────────────────── */
function CommunicationPanel() {
  const { messages, sendMessage, sendLeaveRequest } = useApp();
  const [activeChat, setActiveChat] = useState<"manager" | "receptionists" | "customer">("manager");
  const [msgText, setMsgText] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [showLeave, setShowLeave] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const topicMap = {
    manager: "Message Manager",
    receptionists: "Receptionist Chat",
    customer: "Customer Chat",
  };

  const filteredMessages = messages.filter((m) => m.topic === topicMap[activeChat] || (activeChat === "manager" && m.topic === "Announcement"));

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    sendMessage(topicMap[activeChat], msgText.trim());
    setMsgText("");
  };

  const handleLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) return;
    sendLeaveRequest(leaveReason.trim());
    toast.success("Leave request submitted to Manager.");
    setLeaveReason("");
    setShowLeave(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-accent-foreground">
            <MessageSquare className="size-4" />
          </span>
          <h3 className="text-lg font-bold">Communication</h3>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => setShowLeave(!showLeave)}>
          <CalendarOff className="size-3.5" /> {showLeave ? "Back to Chat" : "Request Leave"}
        </Button>
      </div>

      {showLeave ? (
        <form onSubmit={handleLeave} className="surface p-5 space-y-4">
          <h4 className="font-bold">Request Leave</h4>
          <p className="text-xs text-muted-foreground">Leave requests go directly to the Manager for approval.</p>
          <textarea
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            rows={3}
            placeholder="Reason for leave (e.g., Medical appointment, Personal emergency)..."
            className="w-full px-3 py-2 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            required
          />
          <Button type="submit" className="h-11 w-full rounded-xl font-bold">
            <Send className="size-4" /> Submit Leave Request
          </Button>
        </form>
      ) : (
        <div className="surface overflow-hidden">
          {/* Chat tabs */}
          <div className="flex border-b border-border">
            {(["manager", "receptionists", "customer"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setActiveChat(ch)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeChat === ch
                    ? "border-b-2 border-primary text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {ch === "manager" ? "Manager" : ch === "receptionists" ? "Receptionists" : "Customers"}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="h-64 overflow-y-auto p-4 space-y-3">
            {filteredMessages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start a conversation.</p>
            )}
            {filteredMessages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.from === "me"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}>
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.from === "me" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {m.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
            <input
              type="text"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder={`Message ${activeChat === "manager" ? "Manager" : activeChat === "receptionists" ? "team" : "customer"}...`}
              className="flex-1 h-10 px-3 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button type="submit" size="sm" className="h-10 w-10 rounded-xl shrink-0 p-0">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ─── ROOM AVAILABILITY PANEL ──────────────────────────────────────── */
function RoomAvailabilityPanel() {
  return <FloorWiseRoomGrid />;
}

/* ─── INPUT HELPER ─────────────────────────────────────────────────── */
function InputField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function MiniDetail({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN RECEPTIONIST DASHBOARD
   ═══════════════════════════════════════════════════════════════════ */
export function ReceptionDashboard() {
  const {
    onDuty,
    dutyStart,
    toggleDuty,
    session,
    rooms,
    reservations,
    tasks,
    preRegistrations,
  } = useApp();

  const receptionTasks = tasks.filter((t) => t.role === "reception");
  const pendingPR = preRegistrations.filter((p) => p.status === "Pending").length;
  const available = rooms.filter((r) => r.status === "Available").length;
  const occupied = rooms.filter((r) => r.status === "Occupied").length;
  const pendingCheckIns = reservations.filter((r) => r.status === "Pending").length;
  const vips = reservations.filter((r) => r.status === "VIP").length;

  const handleStartDuty = () => {
    toggleDuty();
  };

  return (
    <div className="relative space-y-6">
      {/* Duty overlay - blocks everything when off duty */}
      {!onDuty && <DutyOverlay onStartDuty={handleStartDuty} />}

      {/* Duty Status Hero */}
      <section className="surface hero-gradient overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  onDuty ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="size-2 rounded-full bg-current" />
                {onDuty ? "On Duty" : "Off Duty"}
              </span>
              {onDuty && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Clock className="size-3" />
                  <ShiftTimer dutyStart={dutyStart} />
                </span>
              )}
            </div>
            <h2 className="mt-3 text-2xl font-bold">
              {onDuty ? `Welcome, ${session?.name ?? "Receptionist"}` : "Ready to start your shift?"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {onDuty
                ? `Shift: ${session?.shift ?? "07:00 - 15:00"} · Employee ID: ${session?.employeeId ?? "EMP-1001"}`
                : "Start duty to mark attendance and unlock today's operations."}
            </p>
          </div>
        </div>

        {onDuty && (
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
            <MiniStat icon={PlaneLanding} label="Arrivals" value={String(reservations.length)} />
            <MiniStat icon={PlaneTakeoff} label="Pending Check-ins" value={String(pendingCheckIns)} />
            <MiniStat icon={Crown} label="VIP Guests" value={String(vips)} />
            <MiniStat icon={DoorOpen} label="Available Rooms" value={String(available)} />
            <MiniStat icon={DoorClosed} label="Occupied" value={String(occupied)} />
            <MiniStat icon={ClipboardCheck} label="Tasks" value={String(receptionTasks.length)} />
          </div>
        )}
      </section>

      {/* Tab-based command center */}
      {onDuty && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto w-full flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Overview & Booking
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-lg text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Room Availability
            </TabsTrigger>
            <TabsTrigger value="reservations" className="rounded-lg text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Reservations
              {reservations.length > 0 && <Pill tone="danger" className="ml-1.5 text-[10px] py-0 px-1.5">{reservations.length}</Pill>}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-lg text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Tasks
              {receptionTasks.length > 0 && <Pill tone="gold" className="ml-1.5 text-[10px] py-0 px-1.5">{receptionTasks.length}</Pill>}
            </TabsTrigger>
            <TabsTrigger value="realtime" className="rounded-lg text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Live Requests
              <Pill tone="danger" className="ml-1.5 text-[10px] py-0 px-1.5">WebSocket</Pill>
            </TabsTrigger>
            <TabsTrigger value="operations" className="rounded-lg text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Operations Monitoring
              <Pill tone="gold" className="ml-1.5 text-[10px] py-0 px-1.5">Live</Pill>
            </TabsTrigger>
            <TabsTrigger value="communication" className="rounded-lg text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Communication
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW & BOOKING */}
          <TabsContent value="overview" className="space-y-6">
            <div className="surface p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hero-gradient">
              <div>
                <h3 className="text-xl font-bold text-foreground">Offline Bookings & Maintenance Dispatch</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create offline bookings for walk-ins or log maintenance defects with real-time dispatch to technicians.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <BookMaintenanceModal />
                <NewBookingModal />
              </div>
            </div>

            <PreRegistrationPanel />
            <RealtimeNotificationCenter />
          </TabsContent>

          {/* REALTIME REQUEST QUEUE */}
          <TabsContent value="realtime">
            <RealtimeNotificationCenter />
          </TabsContent>

          {/* OPERATIONS MONITORING */}
          <TabsContent value="operations">
            <OperationsMonitoringPanel />
          </TabsContent>

          {/* ROOM AVAILABILITY */}
          <TabsContent value="rooms">
            <RoomAvailabilityPanel />
          </TabsContent>

          {/* RESERVATIONS */}
          <TabsContent value="reservations" className="space-y-4">
            <SectionHeader title="Reservations" subtitle="Today's scheduled arrivals. Check in guests directly." />
            <ReservationsPanel />
          </TabsContent>

          {/* TASKS */}
          <TabsContent value="tasks" className="space-y-4">
            <SectionHeader title="Reception Tasks" subtitle="Accept, start, and complete your assigned tasks." />
            <TasksPanel />
          </TabsContent>

          {/* COMMUNICATION */}
          <TabsContent value="communication">
            <CommunicationPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ─── MINI STAT HELPER ─────────────────────────────────────────────── */
function MiniStat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 truncate font-display text-lg font-bold">{value}</p>
    </div>
  );
}
