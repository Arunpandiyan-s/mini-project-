import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Hotel, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { listAvailableRooms, createGuestBooking, listGuestBookings } from "@/lib/api";
import type { ApiDiscoveryRoom, ApiGuestBooking } from "@/lib/types";

interface RoomBookingSectionProps {
  onBookingCreated?: () => void;
  hasActiveStay?: boolean;
}

export function RoomBookingSection({ onBookingCreated, hasActiveStay = false }: RoomBookingSectionProps) {
  const [rooms, setRooms] = useState<ApiDiscoveryRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ApiDiscoveryRoom | null>(null);
  
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const roomData = await listAvailableRooms().catch(() => []);
      setRooms(roomData);
    } catch {
      // silently handle load error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleOpenBooking = (room: ApiDiscoveryRoom) => {
    setSelectedRoom(room);
    // Set default check-in tomorrow, check-out 3 days later
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);

    setCheckIn(tomorrow.toISOString().slice(0, 10));
    setCheckOut(dayAfter.toISOString().slice(0, 10));
    setBookingModalOpen(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !checkIn || !checkOut) return;

    const ciIso = new Date(checkIn + "T14:00:00Z").toISOString();
    const coIso = new Date(checkOut + "T11:00:00Z").toISOString();

    if (new Date(coIso) <= new Date(ciIso)) {
      toast.error("Check-out date must be after check-in date.");
      return;
    }

    try {
      setSubmitting(true);
      const newBooking = await createGuestBooking(selectedRoom.room_number, ciIso, coIso);
      toast.success(`Booking ${newBooking.reservation_id} created for Room ${newBooking.room_number}! Front desk notified.`);
      setBookingModalOpen(false);
      await loadData();
      if (onBookingCreated) {
        onBookingCreated();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create booking.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card-surface p-6 flex justify-center items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading room booking options...</span>
      </div>
    );
  }

  const vacantRooms = rooms.filter((r) => r.occupancy_status === "vacant");

  return (
    <div className="space-y-6">
      {/* Informational Banner */}
      {hasActiveStay ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Hotel className="size-4 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Reserve Additional Suites</p>
              <p className="text-muted-foreground text-[11px]">Select any vacant room below to add more rooms to your hotel stay.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-foreground">
          <Lock className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <p className="font-bold text-amber-900 dark:text-amber-200">Active Checked-In Stay Required</p>
            <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              You are signed in as a registered guest. Book a room stay below or complete check-in at the reception desk to unlock in-room hotel service requests.
            </p>
          </div>
        </div>
      )}

      {/* Available Rooms Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Hotel className="h-5 w-5 text-primary" /> Browse Available Rooms
          </h2>
          <span className="text-xs text-muted-foreground">{vacantRooms.length} rooms available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vacantRooms.slice(0, 8).map((room) => (
            <div
              key={room.room_number}
              className="card-surface p-4 flex items-center justify-between gap-3 hover:border-primary/40 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground">Room {room.room_number}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Floor {room.floor}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{room.room_type}</p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenBooking(room)}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground shadow-sm transition cursor-pointer"
              >
                Book Room
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      {bookingModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm surface p-6 space-y-4 border border-border/80 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Book Room {selectedRoom.room_number}</h3>
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">{selectedRoom.room_type} · Floor {selectedRoom.floor}</p>

            <form onSubmit={handleCreateBooking} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-medium">Check-In Date</label>
                <input
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase font-medium">Check-Out Date</label>
                <input
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
