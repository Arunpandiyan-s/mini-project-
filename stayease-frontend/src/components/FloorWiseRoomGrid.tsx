import { useState, useMemo } from "react";
import {
  BedDouble,
  Search,
  Filter,
  ArrowUpDown,
  DoorOpen,
  DoorClosed,
  Clock,
  Sparkles,
  Wrench,
  User,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Eye,
  CalendarPlus,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  LayoutGrid,
  ShieldAlert,
} from "lucide-react";
import { ForceCheckoutModal } from "@/components/ForceCheckoutModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import type { Room, RoomStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ─── STATUS COLOR CONFIGURATION ────────────────────────────────────── */
const STATUS_CONFIG: Record<
  RoomStatus,
  { bg: string; badgeBg: string; text: string; dot: string; label: string }
> = {
  Available: {
    bg: "bg-emerald-500/5 border-emerald-500/25",
    badgeBg: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-semibold",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Available",
  },
  Occupied: {
    bg: "bg-rose-500/5 border-rose-500/25",
    badgeBg: "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30 font-semibold",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    label: "Occupied",
  },
  Reserved: {
    bg: "bg-amber-500/5 border-amber-500/25",
    badgeBg: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 font-semibold",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    label: "Reserved",
  },
  Cleaning: {
    bg: "bg-sky-500/5 border-sky-500/25",
    badgeBg: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30 font-semibold",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500 animate-pulse",
    label: "Cleaning",
  },
  Maintenance: {
    bg: "bg-orange-500/5 border-orange-500/25",
    badgeBg: "bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/30 font-semibold",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    label: "Maintenance",
  },
  "Cleaning Required": {
    bg: "bg-slate-500/5 border-slate-500/25",
    badgeBg: "bg-slate-500/10 text-slate-800 dark:text-slate-300 border-slate-500/30 font-semibold",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
    label: "Clean Req.",
  },
  "Cleaning In Progress": {
    bg: "bg-sky-500/5 border-sky-500/25",
    badgeBg: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30 font-semibold",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500 animate-pulse",
    label: "Cleaning In Progress",
  },
  "Waiting Cleaning Verification": {
    bg: "bg-indigo-500/5 border-indigo-500/25",
    badgeBg: "bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-500/30 font-semibold",
    text: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500 animate-pulse",
    label: "Wait Clean Verif.",
  },
  "Maintenance Required": {
    bg: "bg-orange-500/5 border-orange-500/25",
    badgeBg: "bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/30 font-semibold",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    label: "Maint Required",
  },
  "Under Maintenance": {
    bg: "bg-amber-600/5 border-amber-600/25",
    badgeBg: "bg-amber-600/10 text-amber-800 dark:text-amber-300 border-amber-600/30 font-semibold",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-600 animate-pulse",
    label: "Under Maint.",
  },
  "Waiting Maintenance Verification": {
    bg: "bg-rose-500/5 border-rose-500/25",
    badgeBg: "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30 font-semibold",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500 animate-pulse",
    label: "Wait Maint Verif.",
  },
  "Out of Service": {
    bg: "bg-slate-700/5 border-slate-700/25",
    badgeBg: "bg-slate-700/10 text-slate-800 dark:text-slate-300 border-slate-700/30 font-semibold",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-600",
    label: "Out of Service",
  },
  Blocked: {
    bg: "bg-red-900/5 border-red-900/25",
    badgeBg: "bg-red-900/10 text-red-800 dark:text-red-300 border-red-900/30 font-semibold",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-700",
    label: "Blocked",
  },
};

import { listRooms } from "@/lib/api";
import type { ApiRoom } from "@/lib/types";
import { useEffect } from "react";

function mapApiRoomToUi(r: ApiRoom): Room {
  let status: RoomStatus = "Available";
  if (r.occupancy_status === "occupied") {
    status = "Occupied";
  } else if (r.cleaning_status === "dirty") {
    status = "Cleaning Required";
  } else if (r.cleaning_status === "cleaning") {
    status = "Cleaning In Progress";
  } else if (r.cleaning_status === "inspecting") {
    status = "Waiting Cleaning Verification";
  } else if (r.maintenance_status === "maintenance_required") {
    status = "Maintenance Required";
  } else if (r.maintenance_status === "under_maintenance") {
    status = "Under Maintenance";
  } else if (r.maintenance_status === "out_of_service") {
    status = "Out of Service";
  } else {
    status = "Available";
  }

  return {
    number: r.room_number,
    floor: r.floor,
    type: r.room_type,
    status,
    guest: r.occupancy_status === "occupied" ? "Occupied Guest" : undefined,
    pricePerNight: 250,
    capacity: 2,
  };
}

export function FloorWiseRoomGrid() {
  const {
    rooms,
    setRooms,
    setRoomStatus,
    createBooking,
    checkInGuest,
    pushActivity,
    triggerN8nWebhook,
    reservations,
  } = useApp();

  useEffect(() => {
    listRooms().then((apiRooms) => {
      if (Array.isArray(apiRooms) && apiRooms.length > 0) {
        setRooms(apiRooms.map(mapApiRoomToUi));
      }
    }).catch(() => { /* use current state */ });
  }, [setRooms]);

  // Filters & Search & Sort State
  const [selectedFloor, setSelectedFloor] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCapacity, setSelectedCapacity] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"number" | "availability" | "price" | "type">("number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"collapsible" | "tabs">("collapsible");
  const [activeTabFloor, setActiveTabFloor] = useState<number>(1);

  // Active room for modal dialogs
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [bookRoomNumber, setBookRoomNumber] = useState<string | null>(null);
  const [evictRoom, setEvictRoom] = useState<Room | null>(null);

  // Collapsible floor state
  const [collapsedFloors, setCollapsedFloors] = useState<Record<number, boolean>>({});

  const toggleFloorCollapse = (floor: number) => {
    setCollapsedFloors((prev) => ({ ...prev, [floor]: !prev[floor] }));
  };

  // Dynamic list of floors
  const floors = useMemo(() => {
    const uniqueFloors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);
    return uniqueFloors;
  }, [rooms]);

  // Summary Metrics
  const summary = useMemo(() => {
    return {
      total: rooms.length,
      available: rooms.filter((r) => r.status === "Available").length,
      occupied: rooms.filter((r) => r.status === "Occupied").length,
      reserved: rooms.filter((r) => r.status === "Reserved").length,
      maintenance: rooms.filter((r) => r.status === "Maintenance Required" || r.status === "Under Maintenance" || r.status === "Waiting Maintenance Verification").length,
      cleaning: rooms.filter((r) => r.status === "Cleaning Required" || r.status === "Cleaning In Progress" || r.status === "Waiting Cleaning Verification").length,
    };
  }, [rooms]);

  // Room Types List
  const roomTypes = useMemo(() => {
    return ["All", ...Array.from(new Set(rooms.map((r) => r.type)))];
  }, [rooms]);

  // Filtered & Sorted Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (selectedFloor > 0 && room.floor !== selectedFloor) return false;
      if (selectedType !== "All" && room.type !== selectedType) return false;
      if (selectedStatus !== "All" && room.status !== selectedStatus) return false;
      if (selectedCapacity > 0 && (room.capacity || 2) < selectedCapacity) return false;
      if (searchQuery.trim() && !room.number.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
        return false;
      }
      return true;
    });
  }, [rooms, selectedFloor, selectedType, selectedStatus, selectedCapacity, searchQuery]);

  const sortedRooms = useMemo(() => {
    const list = [...filteredRooms];
    list.sort((a, b) => {
      if (sortBy === "number") {
        const numA = parseInt(a.number) || 0;
        const numB = parseInt(b.number) || 0;
        return sortOrder === "asc" ? numA - numB : numB - numA;
      }
      if (sortBy === "price") {
        const priceA = a.pricePerNight || 0;
        const priceB = b.pricePerNight || 0;
        return sortOrder === "asc" ? priceA - priceB : priceB - priceA;
      }
      if (sortBy === "availability") {
        const order: Record<RoomStatus, number> = {
          Available: 1,
          Reserved: 2,
          Cleaning: 3,
          "Cleaning Required": 3,
          "Cleaning In Progress": 3,
          "Waiting Cleaning Verification": 3,
          Maintenance: 4,
          "Maintenance Required": 4,
          "Under Maintenance": 4,
          "Waiting Maintenance Verification": 4,
          Occupied: 5,
          "Out of Service": 6,
          Blocked: 7,
        };
        const scoreA = order[a.status] || 9;
        const scoreB = order[b.status] || 9;
        return sortOrder === "asc" ? scoreA - scoreB : scoreB - scoreA;
      }
      if (sortBy === "type") {
        return sortOrder === "asc" ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
      }
      return 0;
    });
    return list;
  }, [filteredRooms, sortBy, sortOrder]);

  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const map: Record<number, Room[]> = {};
    floors.forEach((f) => {
      map[f] = sortedRooms.filter((r) => r.floor === f);
    });
    return map;
  }, [floors, sortedRooms]);

  // Handler Quick Actions
  const handleMarkCleaning = (roomNum: string) => {
    setRoomStatus(roomNum, "Cleaning");
    toast.info(`Room ${roomNum} marked for cleaning.`);
    pushActivity(`Room ${roomNum} marked for cleaning.`);
    void triggerN8nWebhook("room_status_changed", { roomNumber: roomNum, status: "Cleaning" });
  };

  const handleReportMaintenance = (roomNum: string) => {
    setRoomStatus(roomNum, "Maintenance");
    toast.warning(`Room ${roomNum} reported for maintenance.`);
    pushActivity(`Room ${roomNum} placed under maintenance.`);
    import("@/lib/api").then(({ reportRoomMaintenance }) => {
      void reportRoomMaintenance(roomNum, {
        issue_description: "Reported defect requiring maintenance attention",
        priority: "high",
        block_occupancy: true,
      }).catch(() => {});
    });
    void triggerN8nWebhook("room_status_changed", { roomNumber: roomNum, status: "Maintenance" });
  };

  const handleCheckIn = (roomNum: string) => {
    const res = reservations.find((r) => r.room === roomNum);
    const guestName = res?.guest || "Walk-in Guest";

    setRooms((prev) =>
      prev.map((r) => (r.number === roomNum ? { ...r, status: "Occupied", guest: guestName } : r))
    );
    toast.success(`Checked in ${guestName} to Room ${roomNum}!`);
    pushActivity(`Checked in ${guestName} to Room ${roomNum}`);
    void triggerN8nWebhook("room_status_changed", { roomNumber: roomNum, status: "Occupied", guest: guestName });
  };

  return (
    <div className="space-y-6">
      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label="Total Rooms"
          value={summary.total}
          icon={BedDouble}
          color="text-foreground"
          bg="bg-card border-border"
          active={selectedStatus === "All"}
          onClick={() => setSelectedStatus("All")}
        />
        <SummaryCard
          label="Available"
          value={summary.available}
          icon={DoorOpen}
          color="text-emerald-700 dark:text-emerald-300"
          bg="bg-card border-border"
          dotColor="bg-emerald-500"
          active={selectedStatus === "Available"}
          onClick={() => setSelectedStatus("Available")}
        />
        <SummaryCard
          label="Occupied"
          value={summary.occupied}
          icon={DoorClosed}
          color="text-rose-700 dark:text-rose-300"
          bg="bg-card border-border"
          dotColor="bg-rose-500"
          active={selectedStatus === "Occupied"}
          onClick={() => setSelectedStatus("Occupied")}
        />
        <SummaryCard
          label="Reserved"
          value={summary.reserved}
          icon={Clock}
          color="text-amber-700 dark:text-amber-300"
          bg="bg-card border-border"
          dotColor="bg-amber-500"
          active={selectedStatus === "Reserved"}
          onClick={() => setSelectedStatus("Reserved")}
        />
        <SummaryCard
          label="Maintenance"
          value={summary.maintenance}
          icon={Wrench}
          color="text-orange-700 dark:text-orange-300"
          bg="bg-card border-border"
          dotColor="bg-orange-500"
          active={selectedStatus === "Maintenance"}
          onClick={() => setSelectedStatus("Maintenance")}
        />
      </section>

      {/* STATUS LEGEND & DISPLAY MODE */}
      <div className="surface p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Info className="size-3.5" /> Room Status Legend (Click to filter)
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_CONFIG) as RoomStatus[]).map((st) => {
              const cfg = STATUS_CONFIG[st];
              const isSelected = selectedStatus === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(isSelected ? "All" : st)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-2xs transition-all cursor-pointer hover:border-foreground/30",
                    cfg.badgeBg,
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <span className={cn("size-1.5 rounded-full inline-block shrink-0", cfg.dot)} />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
            {selectedStatus !== "All" && (
              <button
                type="button"
                onClick={() => setSelectedStatus("All")}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                Reset Filter ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <span className="text-xs font-bold text-muted-foreground uppercase">Layout:</span>
          <Button
            size="sm"
            variant={viewMode === "collapsible" ? "default" : "outline"}
            className="h-9 rounded-xl text-xs font-bold"
            onClick={() => setViewMode("collapsible")}
          >
            <Layers className="size-3.5" /> Collapsible
          </Button>
          <Button
            size="sm"
            variant={viewMode === "tabs" ? "default" : "outline"}
            className="h-9 rounded-xl text-xs font-bold"
            onClick={() => setViewMode("tabs")}
          >
            <LayoutGrid className="size-3.5" /> Floor Tabs
          </Button>
        </div>
      </div>

      {/* FILTERS & SEARCH & SORT BAR */}
      <section className="surface p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Room Number (e.g. 101, 305)..."
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Select Floor */}
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(Number(e.target.value))}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value={0}>All Floors</option>
              {floors.map((f) => (
                <option key={f} value={f}>Floor {f}</option>
              ))}
            </select>

            {/* Room Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              {roomTypes.map((t) => (
                <option key={t} value={t}>{t === "All" ? "All Room Types" : t}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Reserved">Reserved</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Cleaning">Cleaning</option>
            </select>

            {/* Capacity Filter */}
            <select
              value={selectedCapacity}
              onChange={(e) => setSelectedCapacity(Number(e.target.value))}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value={0}>Any Capacity</option>
              <option value={2}>2+ Guests</option>
              <option value={3}>3+ Guests</option>
              <option value={4}>4+ Guests</option>
            </select>

            {/* Sort Field & Order */}
            <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-start gap-1 bg-muted/60 p-1 rounded-xl w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 px-2 bg-transparent text-xs font-bold focus:outline-none text-foreground flex-1 sm:flex-initial"
              >
                <option value="number">Sort: Room #</option>
                <option value="availability">Sort: Availability</option>
                <option value="price">Sort: Price</option>
                <option value="type">Sort: Type</option>
              </select>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 px-2.5 rounded-lg shrink-0"
                onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                title="Toggle Sort Order"
              >
                <ArrowUpDown className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FLOOR TABS HEADER MODE */}
      {viewMode === "tabs" && (
        <div className="flex border-b border-border overflow-x-auto gap-2 pb-1">
          {floors.map((f) => {
            const count = (roomsByFloor[f] || []).length;
            const isSel = activeTabFloor === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setActiveTabFloor(f)}
                className={cn(
                  "px-5 py-3 rounded-t-xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2",
                  isSel
                    ? "bg-card text-primary border-t-2 border-primary shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span>Floor {f}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-bold text-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* FLOOR-WISE ROOM CARDS GRID */}
      {viewMode === "collapsible" ? (
        <div className="space-y-6">
          {floors.map((floorNum) => {
            const floorRooms = roomsByFloor[floorNum] || [];
            const isCollapsed = collapsedFloors[floorNum];

            if (selectedFloor > 0 && selectedFloor !== floorNum) return null;

            return (
              <div key={floorNum} className="surface overflow-hidden transition-all">
                {/* Floor Header */}
                <div
                  onClick={() => toggleFloorCollapse(floorNum)}
                  className="flex items-center justify-between p-4 bg-muted/30 border-b border-border cursor-pointer hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-accent-foreground font-bold text-sm">
                      F{floorNum}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        Floor {floorNum}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {floorRooms.length} rooms listed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="size-8 p-0 rounded-full">
                      {isCollapsed ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
                    </Button>
                  </div>
                </div>

                {/* Rooms Grid */}
                {!isCollapsed && (
                  <div className="p-4">
                    {floorRooms.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-4 text-center">
                        No rooms match the selected filters on Floor {floorNum}.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                        {floorRooms.map((room) => (
                          <RichRoomCard
                            key={room.number}
                            room={room}
                            onViewDetails={() => setDetailRoom(room)}
                            onBookRoom={() => setBookRoomNumber(room.number)}
                            onCheckIn={() => handleCheckIn(room.number)}
                            onMarkCleaning={() => handleMarkCleaning(room.number)}
                            onReportMaintenance={() => handleReportMaintenance(room.number)}
                            onForceCheckout={() => setEvictRoom(room)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* TABBED VIEW MODE */
        <div className="surface p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {(roomsByFloor[activeTabFloor] || []).map((room) => (
              <RichRoomCard
                key={room.number}
                room={room}
                onViewDetails={() => setDetailRoom(room)}
                onBookRoom={() => setBookRoomNumber(room.number)}
                onCheckIn={() => handleCheckIn(room.number)}
                onMarkCleaning={() => handleMarkCleaning(room.number)}
                onReportMaintenance={() => handleReportMaintenance(room.number)}
                onForceCheckout={() => setEvictRoom(room)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ROOM DETAIL MODAL */}
      <Dialog open={!!detailRoom} onOpenChange={(o) => !o && setDetailRoom(null)}>
        <DialogContent className="rounded-2xl max-w-lg p-6 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold flex items-center justify-between text-foreground">
              <span>Room {detailRoom?.number}</span>
              {detailRoom && (
                <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-md border inline-flex items-center gap-1.5", STATUS_CONFIG[detailRoom.status].badgeBg)}>
                  <span className={cn("size-2 rounded-full inline-block shrink-0", STATUS_CONFIG[detailRoom.status].dot)} />
                  {detailRoom.status}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Floor {detailRoom?.floor} · {detailRoom?.type} · Bed: {detailRoom?.bedType || "King"}
            </DialogDescription>
          </DialogHeader>

          {detailRoom && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <DetailBox label="Price per Night" value={`$${detailRoom.pricePerNight || 200}`} icon={DollarSign} />
                <DetailBox label="Max Capacity" value={`${detailRoom.capacity || 2} Guests`} icon={Users} />
                <DetailBox label="Current Guests" value={String(detailRoom.currentGuests || 0)} icon={User} />
                <DetailBox label="Bed Type" value={detailRoom.bedType || "King Bed"} icon={BedDouble} />
                <DetailBox label="Cleaning Status" value={detailRoom.cleaningType || "Standard"} icon={Sparkles} />
                <DetailBox label="Last Cleaned" value={detailRoom.lastCleaned || "Today 08:00"} icon={Clock} />
              </div>

              {detailRoom.guest && (
                <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Checked-In Guest</p>
                  <p className="font-bold text-foreground text-base mt-0.5">{detailRoom.guest}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {detailRoom.status === "Available" && (
                  <Button className="flex-1 h-11 rounded-xl font-bold" onClick={() => { setBookRoomNumber(detailRoom.number); setDetailRoom(null); }}>
                    <CalendarPlus className="size-4" /> Book Room
                  </Button>
                )}
                {detailRoom.status === "Reserved" && (
                  <Button className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-bold" onClick={() => { handleCheckIn(detailRoom.number); setDetailRoom(null); }}>
                    <LogIn className="size-4" /> Check In
                  </Button>
                )}
                {detailRoom.status === "Occupied" && (
                  <Button variant="destructive" className="flex-1 h-11 rounded-xl font-bold bg-destructive text-destructive-foreground" onClick={() => { setEvictRoom(detailRoom); setDetailRoom(null); }}>
                    <ShieldAlert className="size-4" /> Evict Guest
                  </Button>
                )}
                <Button variant="secondary" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setDetailRoom(null)}>
                  Close
                </Button>
              </div>
            </div>
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

/* ─── RICH ROOM CARD COMPONENT ─────────────────────────────────────── */
function RichRoomCard({
  room,
  onViewDetails,
  onBookRoom,
  onCheckIn,
  onMarkCleaning,
  onReportMaintenance,
  onForceCheckout,
}: {
  room: Room;
  onViewDetails: () => void;
  onBookRoom: () => void;
  onCheckIn: () => void;
  onMarkCleaning: () => void;
  onReportMaintenance: () => void;
  onForceCheckout: () => void;
}) {
  const cfg = STATUS_CONFIG[room.status];

  return (
    <div className={cn(
      "group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-card overflow-hidden min-w-0",
      cfg.bg
    )}>
      {/* Header: Room # & Status Badge */}
      <div className="flex items-start justify-between gap-2 pb-2 min-w-0">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-lg sm:text-xl font-extrabold text-foreground block truncate">Room {room.number}</span>
          <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate">{room.type}</p>
        </div>
        <span
          title={room.status}
          className={cn(
            "px-2 py-0.5 rounded-md text-[11px] font-semibold border shadow-2xs shrink-0 inline-flex items-center gap-1.5 leading-tight max-w-[60%] truncate",
            cfg.badgeBg
          )}
        >
          <span className={cn("size-1.5 rounded-full inline-block shrink-0", cfg.dot)} />
          <span className="truncate">{cfg.label}</span>
        </span>
      </div>

      {/* Room Attributes */}
      <div className="space-y-1.5 py-2 text-xs border-t border-border/60">
        <div className="flex items-center justify-between text-muted-foreground font-semibold">
          <span className="flex items-center gap-1"><Users className="size-3 text-primary" /> Capacity:</span>
          <span className="font-bold text-foreground">{room.capacity || 2} Guests</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground font-semibold">
          <span className="flex items-center gap-1"><User className="size-3 text-primary" /> Current Guests:</span>
          <span className="font-bold text-foreground">{room.currentGuests || 0}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground font-semibold">
          <span className="flex items-center gap-1"><DollarSign className="size-3 text-emerald-600" /> Price/Night:</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">${room.pricePerNight || 200}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground font-semibold">
          <span className="flex items-center gap-1"><BedDouble className="size-3 text-primary" /> Bed Type:</span>
          <span className="font-bold text-foreground">{room.bedType || "King Bed"}</span>
        </div>
        {room.lastCleaned && (
          <div className="flex items-center justify-between text-muted-foreground font-semibold">
            <span className="flex items-center gap-1"><Sparkles className="size-3 text-sky-500" /> Last Cleaned:</span>
            <span className="font-bold text-foreground">{room.lastCleaned}</span>
          </div>
        )}
      </div>

      {/* Guest Name if Occupied */}
      {room.guest && (
        <div className="my-2 p-2 rounded-xl bg-destructive/10 border border-destructive/20 text-xs">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Guest: </span>
          <span className="font-bold text-foreground">{room.guest}</span>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-1.5 pt-2.5 border-t border-border/60">
        <Button size="sm" variant="outline" className="h-9 sm:h-8 text-[11px] font-bold rounded-lg px-2" onClick={onViewDetails}>
          <Eye className="size-3.5 shrink-0" /> Details
        </Button>

        {room.status === "Available" && (
          <Button size="sm" className="h-9 sm:h-8 text-[11px] font-bold rounded-lg px-2 bg-primary text-primary-foreground" onClick={onBookRoom}>
            <CalendarPlus className="size-3.5 shrink-0" /> Book
          </Button>
        )}

        {room.status === "Occupied" && (
          <Button size="sm" variant="destructive" className="h-9 sm:h-8 text-[11px] font-bold rounded-lg px-2 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onForceCheckout}>
            <ShieldAlert className="size-3.5 shrink-0" /> Evict
          </Button>
        )}

        {room.status !== "Cleaning" && (
          <Button size="sm" variant="ghost" className="h-9 sm:h-8 text-[11px] font-bold rounded-lg px-2 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400" onClick={onMarkCleaning}>
            <Sparkles className="size-3.5 shrink-0" /> Clean
          </Button>
        )}

        {room.status !== "Maintenance" && (
          <Button size="sm" variant="ghost" className="h-9 sm:h-8 text-[11px] font-bold rounded-lg px-2 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400" onClick={onReportMaintenance}>
            <Wrench className="size-3.5 shrink-0" /> Maint.
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── SUMMARY CARD HELPER ───────────────────────────────────────────── */
function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  dotColor,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof BedDouble;
  color: string;
  bg: string;
  dotColor?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={cn(
        "rounded-xl border p-3 sm:p-4 flex items-center justify-between shadow-2xs transition-all cursor-pointer hover:border-foreground/30 hover:shadow-soft select-none min-w-0",
        bg,
        active && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 truncate">
          {dotColor && <span className={cn("size-2 rounded-full inline-block shrink-0", dotColor)} />}
          <span className="truncate">{label}</span>
        </p>
        <p className={cn("font-mono text-xl sm:text-2xl lg:text-3xl font-extrabold mt-0.5 sm:mt-1 tabular-nums", color)}>{value}</p>
      </div>
      <span className="grid size-8 sm:size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground ml-2">
        <Icon className="size-4 sm:size-4.5" />
      </span>
    </div>
  );
}

function DetailBox({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BedDouble }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3 flex items-center gap-2.5">
      <Icon className="size-4 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-bold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
