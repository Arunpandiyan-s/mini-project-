import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import type { Room, RoomStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Edit, Phone, Calendar, Clipboard, User, ShieldAlert, Award } from "lucide-react";
import { ForceCheckoutModal } from "@/components/ForceCheckoutModal";

const statusColor: Record<RoomStatus, string> = {
  Available: "bg-emerald-600 text-white border-emerald-700 font-extrabold shadow-sm",
  Occupied: "bg-slate-950 text-white border-slate-800 font-extrabold shadow-sm",
  Reserved: "bg-amber-400 text-slate-950 border-amber-500 font-extrabold shadow-sm",
  Cleaning: "bg-white text-slate-900 border-slate-300 font-extrabold shadow-sm",
  Maintenance: "bg-white text-slate-900 border-slate-300 font-extrabold shadow-sm",
  "Cleaning Required": "bg-slate-200 text-slate-900 border-slate-300 font-extrabold shadow-sm",
  "Cleaning In Progress": "bg-sky-500 text-white border-sky-600 font-extrabold shadow-sm",
  "Waiting Cleaning Verification": "bg-indigo-600 text-white border-indigo-700 font-extrabold shadow-sm",
  "Maintenance Required": "bg-orange-500 text-white border-orange-600 font-extrabold shadow-sm",
  "Under Maintenance": "bg-amber-600 text-white border-amber-700 font-extrabold shadow-sm",
  "Waiting Maintenance Verification": "bg-rose-600 text-white border-rose-700 font-extrabold shadow-sm",
  "Out of Service": "bg-slate-700 text-white border-slate-800 font-extrabold shadow-sm",
  Blocked: "bg-red-800 text-white border-red-900 font-extrabold shadow-sm",
};

const LEGEND: RoomStatus[] = [
  "Available",
  "Occupied",
  "Reserved",
  "Cleaning Required",
  "Cleaning In Progress",
  "Waiting Cleaning Verification",
  "Maintenance Required",
  "Under Maintenance",
  "Waiting Maintenance Verification",
];

export function RoomGrid({ floorFilter }: { floorFilter?: number }) {
  const {
    rooms,
    session,
    setRooms,
    reservations,
    setReservations,
    triggerN8nWebhook,
    pushActivity,
    checkOutGuest
  } = useApp();

  const [active, setActive] = useState<Room | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editGuestName, setEditGuestName] = useState("");
  const [editSpecialReq, setEditSpecialReq] = useState("");
  const [evictRoom, setEvictRoom] = useState<Room | null>(null);

  const isReception = session?.role === "reception";
  const list = floorFilter ? rooms.filter((r) => r.floor === floorFilter) : rooms;

  // Initialize edit fields when active room changes
  useEffect(() => {
    if (active) {
      setEditGuestName(active.guest || "");
      setEditSpecialReq("None");
    } else {
      setIsEditing(false);
    }
  }, [active]);

  // Mock guest details for Occupied room
  const getMockGuestDetails = (roomNumber: string, guestName: string) => {
    return {
      guestName: guestName || "Alex Johnson",
      bookingId: `BK-OCC-${roomNumber}`,
      checkInDate: "2026-08-01",
      checkOutDate: "2026-08-06",
      roomServiceRequests: ["Fresh towels (completed)", "Club sandwich & espresso (pending)"],
      vipStatus: parseInt(roomNumber) % 5 === 0,
      specialRequirements: "Allergy note: Gluten free food only. Quiet room preferred.",
      contactNumber: "+91 98888 77777"
    };
  };

  // Mock reservation details for Reserved room
  const getMockReservationDetails = (roomNumber: string) => {
    const res = reservations.find(r => r.room === roomNumber);
    return {
      guestName: res?.guest || "Samantha Miller",
      reservationId: res?.id || `R-95${roomNumber}`,
      checkInDate: "2026-08-03",
      checkOutDate: "2026-08-07",
      guestsCount: 2,
      parking: true,
      specialRequirements: "Late check-in requested (around 22:00)."
    };
  };

  const handleConfirmReservation = (roomNum: string) => {
    const res = reservations.find(r => r.room === roomNum) || { guest: "Samantha Miller", id: `R-95${roomNum}` };
    
    // Update room status to Occupied
    setRooms(prev => prev.map(r => r.number === roomNum ? { ...r, status: "Occupied", guest: res.guest } : r));
    // Remove from reservations list
    setReservations(prev => prev.filter(r => r.room !== roomNum));
    
    toast.success(`Reservation confirmed! Guest ${res.guest} checked into Room ${roomNum}`);
    pushActivity(`Guest ${res.guest} checked into Room ${roomNum}`);
    setActive(null);

    void triggerN8nWebhook("reservation_confirmed", { roomNumber: roomNum, guestName: res.guest, reservationId: res.id });
  };

  const handleCancelReservation = (roomNum: string) => {
    const res = reservations.find(r => r.room === roomNum) || { guest: "Samantha Miller" };
    
    // Update room status to Available
    setRooms(prev => prev.map(r => r.number === roomNum ? { ...r, status: "Available", guest: undefined } : r));
    // Remove from reservations list
    setReservations(prev => prev.filter(r => r.room !== roomNum));

    toast.warning(`Reservation for guest ${res.guest} cancelled. Room ${roomNum} is now Available.`);
    pushActivity(`Cancelled reservation for Room ${roomNum}`);
    setActive(null);

    void triggerN8nWebhook("reservation_cancelled", { roomNumber: roomNum, guestName: res.guest });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGuestName.trim()) return;

    // Persist edited reservation/guest details
    setRooms(prev => prev.map(r => r.number === active?.number ? { ...r, guest: editGuestName } : r));
    setReservations(prev => prev.map(res => res.room === active?.number ? { ...res, guest: editGuestName } : res));

    toast.success("Reservation details updated.");
    pushActivity(`Updated reservation details for Room ${active?.number}`);
    setActive(prev => prev ? { ...prev, guest: editGuestName } : null);
    setIsEditing(false);

    void triggerN8nWebhook("reservation_edited", { roomNumber: active?.number, newGuestName: editGuestName });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 pb-4">
        {LEGEND.map((s) => (
          <span
            key={s}
            className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", statusColor[s])}
          >
            {s}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-10">
        {list.map((room) => (
          <button
            key={room.number}
            type="button"
            onClick={() => setActive(room)}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center rounded-xl border p-2 text-center transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              statusColor[room.status],
            )}
          >
            <span className="font-display text-base font-extrabold tracking-wide">{room.number}</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider truncate max-w-full px-1">{room.status}</span>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="rounded-2xl max-w-lg p-6 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold flex items-center gap-2 text-foreground">
              Room {active?.number} 
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", active ? statusColor[active.status] : "")}>
                {active?.status}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Floor {active?.floor} · {active?.type}
            </DialogDescription>
          </DialogHeader>

          {active && isReception && active.status === "Occupied" && (
            <div className="space-y-4 pt-2">
              {(() => {
                const gd = getMockGuestDetails(active.number, active.guest || "");
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                      <User className="size-5 text-destructive shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Guest Name</p>
                        <p className="font-semibold text-foreground text-base truncate">{gd.guestName}</p>
                      </div>
                      {gd.vipStatus && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold">
                          <Award className="size-3.5" /> VIP
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Detail label="Booking ID" value={gd.bookingId} />
                      <Detail label="Contact Number" value={gd.contactNumber} />
                      <Detail label="Check-In Date" value={gd.checkInDate} />
                      <Detail label="Check-Out Date" value={gd.checkOutDate} />
                    </div>

                    <div className="rounded-xl bg-muted/60 p-3 text-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Special Requirements</p>
                      <p className="mt-1 font-semibold text-foreground">{gd.specialRequirements}</p>
                    </div>

                    <div className="rounded-xl bg-muted/60 p-3 text-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Room Service Requests</p>
                      <ul className="mt-1 space-y-1 font-medium list-disc pl-4 text-foreground/80">
                        {gd.roomServiceRequests.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button
                        className="flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-2 bg-primary text-primary-foreground shadow-md"
                        onClick={() => {
                          checkOutGuest(active.number);
                          setActive(null);
                        }}
                      >
                        Standard Check-Out
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md"
                        onClick={() => {
                          setEvictRoom(active);
                          setActive(null);
                        }}
                      >
                        <ShieldAlert className="size-4" /> Evict Guest
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {active && isReception && active.status === "Reserved" && (
            <div className="space-y-4 pt-2">
              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Guest Name</label>
                    <input
                      type="text"
                      value={editGuestName}
                      onChange={(e) => setEditGuestName(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Special Requirements</label>
                    <input
                      type="text"
                      value={editSpecialReq}
                      onChange={(e) => setEditSpecialReq(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="secondary" className="flex-1 h-11 rounded-xl" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 h-11 rounded-xl">
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                (() => {
                  const rd = getMockReservationDetails(active.number);
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <Detail label="Guest Name" value={rd.guestName} />
                        <Detail label="Reservation ID" value={rd.reservationId} />
                        <Detail label="Check-In" value={rd.checkInDate} />
                        <Detail label="Check-Out" value={rd.checkOutDate} />
                        <Detail label="Guests Count" value={String(rd.guestsCount)} />
                        <Detail label="Parking Required" value={rd.parking ? "Yes" : "No"} />
                      </div>

                      <div className="rounded-xl bg-muted/60 p-3 text-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Special Requirements</p>
                        <p className="mt-1 font-semibold text-foreground">{rd.specialRequirements}</p>
                      </div>

                      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                        <Button
                          className="flex-1 h-12 rounded-xl bg-success text-success-foreground hover:bg-success/90 font-bold"
                          onClick={() => handleConfirmReservation(active.number)}
                        >
                          <Check className="size-4" /> Confirm Check-In
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-12 rounded-xl font-bold px-4 text-foreground hover:bg-muted"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit className="size-4" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-bold px-4"
                          onClick={() => handleCancelReservation(active.number)}
                        >
                          <X className="size-4" /> Cancel Reservation
                        </Button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {(!active || !isReception || (active.status !== "Occupied" && active.status !== "Reserved")) && active && (
            <dl className="grid grid-cols-2 gap-3 text-sm pt-2">
              <Detail label="Status" value={active.status} />
              <Detail label="Guest" value={active.guest ?? "—"} />
              <Detail label="Cleaning" value={active.cleaningType ?? "Not scheduled"} />
              <Detail label="Priority" value={active.priority ?? "—"} />
              <Detail label="Assigned" value={active.assignedAt ?? "—"} />
              <Detail label="Room type" value={active.type} />
            </dl>
          )}
        </DialogContent>
      </Dialog>

      {evictRoom && (
        <ForceCheckoutModal
          roomNumber={evictRoom.number}
          guestName={evictRoom.guest || "Occupied Guest"}
          open={!!evictRoom}
          onOpenChange={(o) => !o && setEvictRoom(null)}
        />
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold text-foreground">{value}</dd>
    </div>
  );
}
