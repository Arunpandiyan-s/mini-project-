import { useState, useMemo } from "react";
import { Search, Clock, User, CheckCircle2, AlertTriangle, Coffee, Sparkles, Wrench, Bell, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";

export type RequestLogItem = {
  id: string;
  room: string;
  category: "Housekeeping" | "Maintenance" | "Food & Beverage" | "Reception";
  requestText: string;
  assignedStaff: string;
  time: string;
  status: "Completed" | "In Progress" | "Pending" | "Attention Needed";
};

// Rich sample activity logs demonstrating guest requests & staff assignments
const INITIAL_LOGS: RequestLogItem[] = [
  {
    id: "LOG-201",
    room: "201",
    category: "Housekeeping",
    requestText: "Guest asked Housekeeping to clean spilled tea on carpet",
    assignedStaff: "Grace Okafor",
    time: "10:15 AM",
    status: "In Progress",
  },
  {
    id: "LOG-305",
    room: "305",
    category: "Maintenance",
    requestText: "Guest reported AC blowing warm air (Compressor check)",
    assignedStaff: "Ravi Kumar",
    time: "09:30 AM",
    status: "In Progress",
  },
  {
    id: "LOG-508",
    room: "508",
    category: "Food & Beverage",
    requestText: "Breakfast set for 2, allergy note: no nuts",
    assignedStaff: "Mei Tanaka",
    time: "10:20 AM",
    status: "In Progress",
  },
  {
    id: "LOG-210",
    room: "210",
    category: "Reception",
    requestText: "Guest requested extra towels and late checkout confirmation",
    assignedStaff: "Anita Sharma",
    time: "10:12 AM",
    status: "Pending",
  },
  {
    id: "LOG-108",
    room: "108",
    category: "Housekeeping",
    requestText: "VIP guest requested fresh linen immediately",
    assignedStaff: "Grace Okafor",
    time: "08:55 AM",
    status: "Completed",
  },
  {
    id: "LOG-217",
    room: "217",
    category: "Maintenance",
    requestText: "Bathroom sink faucet dripping continuously",
    assignedStaff: "Ravi Kumar",
    time: "09:15 AM",
    status: "Pending",
  },
  {
    id: "LOG-406",
    room: "406",
    category: "Housekeeping",
    requestText: "Post-maintenance cleanup required after plumbing repair",
    assignedStaff: "Grace Okafor",
    time: "10:05 AM",
    status: "Attention Needed",
  },
  {
    id: "LOG-119",
    room: "119",
    category: "Maintenance",
    requestText: "TV Signal issue on channels 20-40 reported by guest",
    assignedStaff: "David Miller",
    time: "09:50 AM",
    status: "Pending",
  },
  {
    id: "LOG-126",
    room: "126",
    category: "Food & Beverage",
    requestText: "Mini bar restock: beverages and snacks requested",
    assignedStaff: "Mei Tanaka",
    time: "09:05 AM",
    status: "Pending",
  },
];

export function RequestLogsPanel() {
  const { guestRequests, tasks, activity } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Combine initial logs with live guestRequests, tasks, and system activity
  const allLogs: RequestLogItem[] = useMemo(() => {
    const combined: RequestLogItem[] = [...INITIAL_LOGS];

    // Map live guest requests into log items
    guestRequests.forEach((gr) => {
      if (!combined.some((c) => c.room === gr.room && c.requestText.includes(gr.detail))) {
        combined.unshift({
          id: `LOG-GR-${gr.id}`,
          room: gr.room,
          category: gr.detail.toLowerCase().includes("ac") || gr.detail.toLowerCase().includes("repair")
            ? "Maintenance"
            : gr.detail.toLowerCase().includes("food") || gr.detail.toLowerCase().includes("breakfast")
            ? "Food & Beverage"
            : gr.detail.toLowerCase().includes("towel") || gr.detail.toLowerCase().includes("clean")
            ? "Housekeeping"
            : "Reception",
          requestText: `Guest request: "${gr.detail}"`,
          assignedStaff: gr.status === "Approved" ? "Anita Sharma" : "Staff Member",
          time: gr.time || "Just now",
          status: gr.status === "Approved" ? "In Progress" : gr.status === "Rejected" ? "Completed" : "Pending",
        });
      }
    });

    return combined;
  }, [guestRequests]);

  // Filter logs by category and search query
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (selectedCategory !== "All" && log.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const roomMatch = log.room.toLowerCase().includes(q);
        const textMatch = log.requestText.toLowerCase().includes(q);
        const staffMatch = log.assignedStaff.toLowerCase().includes(q);
        const catMatch = log.category.toLowerCase().includes(q);
        if (!roomMatch && !textMatch && !staffMatch && !catMatch) return false;
      }
      return true;
    });
  }, [allLogs, selectedCategory, searchQuery]);

  const getCategoryIcon = (cat: RequestLogItem["category"]) => {
    switch (cat) {
      case "Housekeeping":
        return <Sparkles className="size-4 text-sky-500 shrink-0" />;
      case "Maintenance":
        return <Wrench className="size-4 text-amber-500 shrink-0" />;
      case "Food & Beverage":
        return <Coffee className="size-4 text-emerald-500 shrink-0" />;
      case "Reception":
        return <Bell className="size-4 text-purple-500 shrink-0" />;
    }
  };

  const getStatusBadge = (status: RequestLogItem["status"]) => {
    switch (status) {
      case "In Progress":
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/25 inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-sky-500" /> In Progress
          </span>
        );
      case "Completed":
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Completed
          </span>
        );
      case "Pending":
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-amber-500" /> Pending
          </span>
        );
      case "Attention Needed":
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-rose-500" /> Attention Needed
          </span>
        );
    }
  };

  return (
    <div className="surface p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="size-5 text-primary shrink-0" /> Service & Request Activity Logs
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log history of guest requests and assigned staff actions
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 p-1 rounded-xl">
          {["All", "Housekeeping", "Maintenance", "Food & Beverage", "Reception"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                selectedCategory === cat
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter logs by room (e.g. 201), staff name (e.g. Grace Okafor), or request (e.g. tea)..."
          className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-card text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Activity Logs List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <p className="p-8 text-center text-xs sm:text-sm text-muted-foreground italic bg-muted/20 rounded-xl">
            No service logs match the filter.
          </p>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-xs space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Room # & Category */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/10 border border-primary/20 text-primary font-mono font-bold text-xs shrink-0 tracking-tight">
                    {log.room}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground text-sm tracking-tight">ROOM {log.room}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                        {getCategoryIcon(log.category)} {log.category}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground/90 mt-0.5 leading-snug">
                      {log.requestText}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 self-start sm:self-center">
                  {getStatusBadge(log.status)}
                </div>
              </div>

              {/* Bottom Meta Bar: Assigned Staff Member & Timestamp */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <User className="size-3.5 text-primary shrink-0" />
                  Assigned Staff: <span className="font-semibold text-primary">{log.assignedStaff}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground font-mono text-xs tabular-nums">
                  <Clock className="size-3.5 shrink-0" /> {log.time}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
