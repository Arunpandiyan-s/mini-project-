import { Hotel, CheckCircle2, Clock, ArrowRight, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { ApiGuestStay } from "@/lib/types";

interface RoomSelectorCardProps {
  stays: ApiGuestStay[];
  selectedRoomNumber: string | null;
  onSelectRoom: (roomNumber: string) => void;
}

export function RoomSelectorCard({ stays, selectedRoomNumber, onSelectRoom }: RoomSelectorCardProps) {
  if (stays.length === 0) return null;

  const handleRoomClick = (stay: ApiGuestStay) => {
    if (stay.status !== "checked_in") {
      toast.error(
        `Check-in Required: Receptionist approval/check-in is needed for Room ${stay.room.room_number} before entering room services.`,
        {
          duration: 5000,
          icon: <AlertCircle className="h-5 w-5 text-amber-400" />,
        }
      );
      return;
    }

    onSelectRoom(stay.room.room_number);
  };

  return (
    <div className="card-surface p-6 space-y-5 border-primary/30 shadow-xl bg-gradient-to-br from-slate-900/90 via-slate-900 to-indigo-950/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/30 shadow-sm">
            <Hotel className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight text-foreground">Your Booked Rooms</h3>
            <p className="text-xs text-muted-foreground">
              Receptionist approval/check-in unlocks room detail & service portal
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
          {stays.length} {stays.length === 1 ? "Booked Room" : "Booked Rooms"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stays.map((stay) => {
          const isSelected = stay.room.room_number === selectedRoomNumber;
          const isCheckedIn = stay.status === "checked_in";

          return (
            <button
              key={stay.reservation_id}
              type="button"
              onClick={() => handleRoomClick(stay)}
              className={`p-5 rounded-2xl text-left border transition-all flex flex-col justify-between gap-4 group cursor-pointer ${
                isCheckedIn
                  ? isSelected
                    ? "bg-primary/15 border-primary ring-2 ring-primary/40 shadow-lg scale-[1.01]"
                    : "bg-slate-950/60 border-slate-800 hover:border-primary/50 hover:bg-slate-900/80 shadow-md"
                  : "bg-slate-950/40 border-amber-500/20 hover:border-amber-500/40 opacity-90"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="space-y-1">
                  <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                    {stay.room.room_type} · Floor {stay.room.floor}
                  </span>
                  <p className="text-2xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors">
                    Room {stay.room.room_number}
                  </p>
                </div>
                
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm ${
                    isCheckedIn
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {isCheckedIn ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Checked In
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" /> Awaiting Approval
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-muted-foreground font-mono text-[11px]">{stay.reservation_id}</span>
                
                {isCheckedIn ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-primary group-hover:translate-x-1 transition-transform">
                    Open Room Services <ArrowRight className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-amber-400 text-[11px]">
                    <Lock className="h-3.5 w-3.5" /> Check-in Required
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
