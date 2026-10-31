import { Hotel, CheckCircle2, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import type { ApiGuestStay } from "@/lib/types";

interface RoomSelectorCardProps {
  stays: ApiGuestStay[];
  selectedRoomNumber: string | null;
  onSelectRoom: (roomNumber: string) => void;
}

export function RoomSelectorCard({ stays, selectedRoomNumber, onSelectRoom }: RoomSelectorCardProps) {
  if (stays.length === 0) return null;

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-soft text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-2xs shrink-0">
            <Hotel className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base tracking-tight text-foreground">Your Booked Rooms</h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                {stays.length} {stays.length === 1 ? "Room" : "Rooms"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a room to access in-room services or review check-in arrival status
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stays.map((stay) => {
          const isSelected = stay.room.room_number === selectedRoomNumber;
          const isCheckedIn = stay.status === "checked_in";

          return (
            <button
              key={stay.reservation_id}
              type="button"
              onClick={() => onSelectRoom(stay.room.room_number)}
              className={`p-5 rounded-2xl text-left border transition-all flex flex-col justify-between gap-4 group cursor-pointer ${
                isCheckedIn
                  ? isSelected
                    ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/40 shadow-md scale-[1.01]"
                    : "bg-emerald-500/[0.04] border-emerald-500/30 hover:border-emerald-500/70 hover:bg-emerald-500/10 shadow-2xs"
                  : isSelected
                    ? "bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/40 shadow-md scale-[1.01]"
                    : "bg-sky-500/[0.04] border-sky-500/30 hover:border-sky-500/70 hover:bg-sky-500/10 shadow-2xs"
              }`}
            >
              <div className="flex items-start justify-between w-full gap-2">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider block truncate">
                    {stay.room.room_type} · Floor {stay.room.floor}
                  </span>
                  <p className="text-2xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors">
                    Room {stay.room.room_number}
                  </p>
                </div>

                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shrink-0 shadow-2xs ${
                    isCheckedIn
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                  }`}
                >
                  {isCheckedIn ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Checked In</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Awaiting Check-In</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/80 text-xs gap-2">
                <span className="text-muted-foreground font-mono text-[11px] font-semibold truncate">
                  {stay.reservation_id}
                </span>

                {isCheckedIn ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-xs text-primary group-hover:translate-x-1 transition-transform shrink-0">
                    Open Room Services <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-bold text-xs text-sky-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform shrink-0">
                    View Check-in Status <ArrowRight className="h-3.5 w-3.5" />
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

