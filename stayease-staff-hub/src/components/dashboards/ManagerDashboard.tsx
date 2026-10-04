import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BedDouble, DoorOpen, DoorClosed, Sparkles, Wrench, Users, PlaneLanding, PlaneTakeoff, IndianRupee,
  Megaphone, UserPlus, FileText, Download, CalendarClock, Siren, ClipboardPlus, Search, ExternalLink, User, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LiveDot, SectionHeader, StatCard } from "@/components/Primitives";
import { StaffAvailabilityWheel } from "@/components/StaffAvailabilityWheel";
import { StaffTaskBoard } from "@/components/StaffTaskBoard";
import { useApp } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Room } from "@/lib/data";

import { BroadcastSendModal } from "@/components/BroadcastModal";

const QUICK = [
  { label: "Assign Task", icon: ClipboardPlus },
  { label: "Broadcast Message", icon: Megaphone },
  { label: "Add Staff", icon: UserPlus },
  { label: "Generate Daily Report", icon: FileText },
  { label: "Export Report", icon: Download },
  { label: "Schedule Maintenance", icon: CalendarClock },
  { label: "Mark Emergency", icon: Siren },
];

export function ManagerDashboard() {
  const { rooms, activity } = useApp();
  const navigate = useNavigate();
  const [modalFilter, setModalFilter] = useState<{ title: string; filterKey: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendBroadcastOpen, setSendBroadcastOpen] = useState(false);

  const count = (s: string) => rooms.filter((r) => r.status === s || r.status.includes(s)).length;

  // Filtered room list for modal popup
  const filteredModalRooms = useMemo(() => {
    if (!modalFilter) return [];
    const key = modalFilter.filterKey;
    return rooms.filter((r) => {
      let matchesCategory = true;
      if (key === "Occupied") matchesCategory = r.status === "Occupied";
      else if (key === "Available") matchesCategory = r.status === "Available";
      else if (key === "Cleaning") matchesCategory = r.status === "Cleaning" || r.status.includes("Cleaning");
      else if (key === "Maintenance") matchesCategory = r.status === "Maintenance" || r.status.includes("Maintenance");

      if (!matchesCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = r.number.toLowerCase().includes(q);
        const guestMatch = (r.guest || "").toLowerCase().includes(q);
        const typeMatch = r.type.toLowerCase().includes(q);
        if (!numMatch && !guestMatch && !typeMatch) return false;
      }

      return true;
    });
  }, [rooms, modalFilter, searchQuery]);

  const openRoomModal = (title: string, filterKey: string) => {
    setSearchQuery("");
    setModalFilter({ title, filterKey });
  };

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader title="Hotel overview" subtitle="Live key performance indicators (Click card to view room list)" action={<LiveDot />} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Total Rooms"
            value={rooms.length}
            icon={BedDouble}
            onClick={() => openRoomModal("All Rooms", "All")}
          />
          <StatCard
            label="Occupied Rooms"
            value={count("Occupied")}
            icon={DoorClosed}
            tone="danger"
            trend={{ value: "+4.2% vs yesterday", up: true }}
            onClick={() => openRoomModal("Occupied Rooms", "Occupied")}
          />
          <StatCard
            label="Available Rooms"
            value={count("Available")}
            icon={DoorOpen}
            tone="success"
            trend={{ value: "-2.1%", up: false }}
            onClick={() => openRoomModal("Available Rooms", "Available")}
          />
          <StatCard
            label="Rooms Cleaning"
            value={count("Cleaning")}
            icon={Sparkles}
            tone="gold"
            onClick={() => openRoomModal("Cleaning Rooms", "Cleaning")}
          />
          <StatCard
            label="Under Maintenance"
            value={count("Maintenance")}
            icon={Wrench}
            tone="muted"
            onClick={() => openRoomModal("Under Maintenance Rooms", "Maintenance")}
          />
          <StatCard label="Guests In-House" value={78} icon={Users} trend={{ value: "+6.0%", up: true }} />
          <StatCard label="Today Arrivals" value={24} icon={PlaneLanding} trend={{ value: "+8.0%", up: true }} />
          <StatCard label="Today Departures" value={18} icon={PlaneTakeoff} tone="muted" />
          <StatCard label="Revenue Today" value="₹4.82L" icon={IndianRupee} tone="gold" trend={{ value: "+11.4%", up: true }} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <StaffAvailabilityWheel />
        </section>

        <section>
          <SectionHeader title="Live activity timeline" action={<LiveDot />} />
          <div className="surface max-h-[380px] space-y-4 overflow-y-auto p-5">
            {activity.map((a) => (
              <div key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <span className="w-px flex-1 bg-border" />
                </div>
                <div className="min-w-0 pb-2">
                  <p className="text-sm font-medium">{a.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <StaffTaskBoard />

      <section>
        <SectionHeader title="Manager quick actions" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {QUICK.map((q) => (
            <Button
              key={q.label}
              variant={q.label === "Mark Emergency" ? "destructive" : "secondary"}
              className="h-16 justify-start gap-3 rounded-2xl text-sm"
              onClick={() => {
                if (q.label === "Broadcast Message") {
                  setSendBroadcastOpen(true);
                } else {
                  toast.success(`${q.label} completed`);
                }
              }}
            >
              <q.icon className="size-5 shrink-0" />
              <span className="truncate">{q.label}</span>
            </Button>
          ))}
        </div>
      </section>

      {/* BROADCAST ANNOUNCEMENT MODAL */}
      <BroadcastSendModal open={sendBroadcastOpen} onOpenChange={setSendBroadcastOpen} />

      {/* INTERACTIVE POPUP MODAL FOR ROOM LISTS */}
      <Dialog open={!!modalFilter} onOpenChange={(open) => !open && setModalFilter(null)}>
        <DialogContent className="w-[94vw] max-w-3xl rounded-3xl p-5 sm:p-6 bg-card border-border shadow-2xl max-h-[88vh] flex flex-col">
          <DialogHeader className="pb-2 border-b border-border">
            <DialogTitle className="flex items-center justify-between text-xl font-bold font-display">
              <span className="flex items-center gap-2">
                <BedDouble className="size-5 text-primary" /> {modalFilter?.title}
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-primary-soft text-accent-foreground font-bold">
                {filteredModalRooms.length} Rooms
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Filterable list of rooms matching selected status. Click any room to manage in the room control matrix.
            </DialogDescription>
          </DialogHeader>

          {/* Search Filter Input */}
          <div className="relative pt-3 pb-1">
            <Search className="absolute left-3 top-6 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Room Number (e.g. 101, 305) or Guest Name..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-muted/40 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Room Items Grid */}
          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-3 max-h-[50vh]">
            {filteredModalRooms.length === 0 ? (
              <p className="p-8 text-center text-xs sm:text-sm text-muted-foreground italic bg-muted/20 rounded-xl">
                No rooms match the search query.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredModalRooms.map((room) => {
                  const isOccupied = room.status === "Occupied";
                  const isAvailable = room.status === "Available";

                  return (
                    <div
                      key={room.number}
                      className="rounded-2xl border border-border bg-card p-3.5 space-y-2 hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <span className="font-display font-bold text-base text-foreground">Room {room.number}</span>
                          <p className="text-[11px] font-semibold text-muted-foreground">Floor {room.floor} · {room.type}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isAvailable
                              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                              : isOccupied
                              ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
                              : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 pt-1.5 border-t border-border/50">
                        {room.guest && (
                          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 truncate flex items-center gap-1">
                            <User className="size-3 shrink-0" /> Guest: {room.guest}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                          <span>Bed: {room.bedType || "King Bed"}</span>
                          <span className="font-bold text-emerald-600">${room.pricePerNight || 200}/night</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Action to Jump to Full Matrix */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <Button variant="secondary" className="h-10 rounded-xl text-xs font-bold" onClick={() => setModalFilter(null)}>
              Close
            </Button>
            <Button
              className="h-10 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
              onClick={() => {
                setModalFilter(null);
                void navigate({ to: "/dashboard/rooms" });
              }}
            >
              Go to Full Room Matrix <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

