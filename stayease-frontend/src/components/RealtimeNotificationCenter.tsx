import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BellRing,
  Volume2,
  CheckCircle2,
  XCircle,
  Eye,
  Share2,
  Clock,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Search,
  Filter,
  Plus,
  Send,
  Building,
  User,
  Zap,
} from "lucide-react";
import { useApp } from "@/lib/store";
import type { RealtimeRequest, RequestPriority, RequestSourceDept, RequestStatus } from "@/lib/store";
import { startRepeatingAlarm, stopRepeatingAlarm } from "@/components/TaskCard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function RealtimeNotificationCenter() {
  const {
    realtimeRequests,
    acceptRealtimeRequest,
    rejectRealtimeRequest,
    forwardRealtimeRequest,
    markPendingRealtimeRequest,
    completeRealtimeRequest,
    createRealtimeRequest,
    session,
  } = useApp();

  // Active Popup Modal for highest-priority unaccepted request
  const [activePopupRequest, setActivePopupRequest] = useState<RealtimeRequest | null>(null);

  // Rejection / Forward Modal states
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [forwardId, setForwardId] = useState<string | null>(null);
  const [forwardDept, setForwardDept] = useState("Housekeeping");

  // Filter States for Notification Panel
  const [filterTab, setFilterTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState<string>("All");
  const [filterPriority, setFilterPriority] = useState<string>("All");

  // Priority Sorting Helper: Emergency > High > Medium > Low
  const sortedRequests = useMemo(() => {
    const pWeight: Record<RequestPriority, number> = {
      Emergency: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    };

    return [...realtimeRequests].sort((a, b) => {
      // Unaccepted (New) requests come first
      if (a.status === "New" && b.status !== "New") return -1;
      if (a.status !== "New" && b.status === "New") return 1;

      // Priority sort
      const weightDiff = pWeight[b.priority] - pWeight[a.priority];
      if (weightDiff !== 0) return weightDiff;

      // Newest timestamp first
      return b.timestamp - a.timestamp;
    });
  }, [realtimeRequests]);

  // Determine top unaccepted popup request & run continuous alarm
  useEffect(() => {
    const unaccepted = sortedRequests.find((r) => r.status === "New");
    if (unaccepted) {
      setActivePopupRequest(unaccepted);
      // Start continuous repeating alarm sound until receptionist accepts or acknowledges!
      startRepeatingAlarm();
    } else {
      setActivePopupRequest(null);
      stopRepeatingAlarm();
    }

    return () => {
      stopRepeatingAlarm();
    };
  }, [sortedRequests]);

  // Escalation Timer ticker (30s Yellow, 60s Orange, 90s Red, 120s Emergency)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Filtered List for Notification Panel
  const filteredRequests = useMemo(() => {
    return sortedRequests.filter((r) => {
      if (filterTab !== "All" && r.status !== filterTab) return false;
      if (filterDept !== "All" && r.department !== filterDept) return false;
      if (filterPriority !== "All" && r.priority !== filterPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mType = r.type.toLowerCase().includes(q);
        const mRoom = r.roomNumber.toLowerCase().includes(q);
        const mDesc = r.description.toLowerCase().includes(q);
        const mId = r.id.toLowerCase().includes(q);
        if (!mType && !mRoom && !mDesc && !mId) return false;
      }
      return true;
    });
  }, [sortedRequests, filterTab, filterDept, filterPriority, searchQuery]);

  const pendingCount = realtimeRequests.filter((r) => r.status === "New" || r.status === "Pending").length;

  const handleAcceptPopup = (id: string) => {
    stopRepeatingAlarm();
    acceptRealtimeRequest(id);
    setActivePopupRequest(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR & LIVE STREAM STATUS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 surface p-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <BellRing className="size-5 text-amber-500 animate-pulse" /> Live Real-Time Request Queue
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Production WebSocket / SSE stream · Automatic push notifications from Customer Portal, Mobile App & Departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold text-xs border border-amber-500/30">
            {pendingCount} Pending Requests
          </span>
          <span className="px-3 py-1.5 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs border border-emerald-600/30 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-600 animate-ping" />
            Live DB Event Stream Active
          </span>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="surface p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search request type, room, description..."
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterTab}
              onChange={(e) => setFilterTab(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="New">New / Active ⚡</option>
              <option value="Accepted">Accepted 🟢</option>
              <option value="Pending">Pending ⏰</option>
              <option value="Completed">Completed ✅</option>
              <option value="Rejected">Rejected ❌</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Emergency">Emergency 🔥</option>
              <option value="High">High ⚡</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold focus:outline-none"
            >
              <option value="All">All Source Depts</option>
              <option value="Guest / Customer">Guest / Customer 🛎️</option>
              <option value="Housekeeping">Housekeeping 🧹</option>
              <option value="Maintenance">Maintenance 🛠️</option>
              <option value="Food & Beverage">Food & Beverage 🍽️</option>
              <option value="Security">Security 🛡️</option>
              <option value="Hotel Manager">Hotel Manager 👔</option>
            </select>
          </div>
        </div>
      </div>

      {/* NOTIFICATION CENTER DATA MATRIX */}
      <div className="surface overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Zap className="size-4 text-primary" /> Live Request Queue Matrix ({filteredRequests.length})
          </h4>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No real-time requests match the current filters.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredRequests.map((req) => {
              const elapsedSec = Math.floor((now - req.timestamp) / 1000);
              let escalationClass = "border-border bg-card";
              let escalationBadge = null;

              if (req.status === "New" || req.status === "Pending") {
                if (elapsedSec >= 120) {
                  escalationClass = "border-destructive bg-destructive/10 ring-2 ring-destructive/40 animate-pulse";
                  escalationBadge = <span className="text-[10px] font-extrabold text-destructive px-2 py-0.5 rounded-full bg-destructive/20">🔥 120s Auto-Escalated Emergency</span>;
                } else if (elapsedSec >= 90) {
                  escalationClass = "border-rose-600 bg-rose-600/10";
                  escalationBadge = <span className="text-[10px] font-extrabold text-rose-600 px-2 py-0.5 rounded-full bg-rose-600/20">🚨 90s Manager Alert</span>;
                } else if (elapsedSec >= 60) {
                  escalationClass = "border-orange-500 bg-orange-500/10";
                  escalationBadge = <span className="text-[10px] font-extrabold text-orange-600 px-2 py-0.5 rounded-full bg-orange-500/20">🟠 60s Escalation</span>;
                } else if (elapsedSec >= 30) {
                  escalationClass = "border-amber-400 bg-amber-400/10";
                  escalationBadge = <span className="text-[10px] font-extrabold text-amber-700 px-2 py-0.5 rounded-full bg-amber-400/20">🟡 30s Warning</span>;
                }
              }

              return (
                <div key={req.id} className={cn("p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4", escalationClass)}>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-foreground">{req.id}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-primary-soft text-accent-foreground font-extrabold text-xs">
                        Room {req.roomNumber}
                      </span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-bold",
                        req.priority === "Emergency" ? "bg-destructive text-white" :
                        req.priority === "High" ? "bg-orange-500 text-white" : "bg-muted text-foreground"
                      )}>
                        {req.priority}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground border px-2 py-0.5 rounded-md">
                        {req.department}
                      </span>
                      {escalationBadge}
                    </div>

                    <p className="font-bold text-sm text-foreground">{req.type}</p>
                    <p className="text-xs text-muted-foreground font-medium">"{req.description}"</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                      <span>Received: <strong className="text-foreground">{req.timeReceived}</strong> ({elapsedSec}s ago)</span>
                      {req.acceptedBy && <span>Accepted By: <strong className="text-emerald-600">{req.acceptedBy} ({req.acceptedAt})</strong></span>}
                      {req.forwardedTo && <span>Forwarded To: <strong className="text-sky-600">{req.forwardedTo}</strong></span>}
                      {req.rejectedReason && <span>Rejected Reason: <strong className="text-destructive">{req.rejectedReason}</strong></span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {req.status === "New" && (
                      <Button
                        size="sm"
                        className="h-9 px-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md gap-1.5"
                        onClick={() => handleAcceptPopup(req.id)}
                      >
                        <CheckCircle2 className="size-4" /> Accept
                      </Button>
                    )}

                    {req.status !== "Completed" && req.status !== "Rejected" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-2.5 rounded-xl text-xs font-bold"
                          onClick={() => setForwardId(req.id)}
                        >
                          <Share2 className="size-3.5" /> Forward
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-2.5 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10"
                          onClick={() => setRejectId(req.id)}
                        >
                          <XCircle className="size-3.5" /> Reject
                        </Button>
                      </>
                    )}

                    {req.status === "Accepted" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-9 px-3 rounded-xl font-bold text-xs gap-1"
                        onClick={() => completeRealtimeRequest(req.id)}
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-600" /> Complete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INSTANT CENTER-SCREEN POPUP FOR UNACCEPTED REQUESTS */}
      <Dialog open={!!activePopupRequest} onOpenChange={(o) => !o && stopRepeatingAlarm()}>
        {activePopupRequest && (
          <DialogContent className={cn(
            "max-w-lg rounded-2xl p-6 bg-card border-4 shadow-2xl animate-in zoom-in-95",
            activePopupRequest.priority === "Emergency" ? "border-destructive ring-4 ring-destructive/30" : "border-amber-500"
          )}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "grid size-12 place-items-center rounded-2xl ring-4",
                  activePopupRequest.priority === "Emergency" ? "bg-destructive/20 text-destructive ring-destructive/20 animate-bounce" : "bg-amber-500/20 text-amber-600 ring-amber-500/20"
                )}>
                  {activePopupRequest.priority === "Emergency" ? <Flame className="size-7 text-destructive" /> : <BellRing className="size-6 text-amber-500 animate-pulse" />}
                </span>
                <div>
                  <DialogTitle className="font-display text-xl font-bold text-foreground">
                    {activePopupRequest.priority === "Emergency" ? "🚨 EMERGENCY REQUEST RECEIVED!" : "⚡ HIGH PRIORITY INCOMING REQUEST!"}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Continuous Alarm Active · Requires Receptionist Acceptance to Stop Sound
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-base text-foreground">{activePopupRequest.id}</span>
                  <span className="px-3 py-1 rounded-full bg-primary-soft font-extrabold text-xs text-primary">
                    Room {activePopupRequest.roomNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <p className="font-bold text-muted-foreground">Department: <span className="text-foreground">{activePopupRequest.department}</span></p>
                  <p className="font-bold text-muted-foreground">Priority: <span className="text-destructive font-bold">{activePopupRequest.priority} 🔥</span></p>
                  <p className="font-bold text-muted-foreground">Type: <span className="text-foreground">{activePopupRequest.type}</span></p>
                  <p className="font-bold text-muted-foreground">Guest: <span className="text-foreground">{activePopupRequest.guestName || "N/A"}</span></p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border text-foreground font-medium text-xs mt-2">
                  "{activePopupRequest.description}"
                </div>
              </div>

              {/* Sound Ringing Status Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs font-extrabold text-destructive">
                <span className="flex items-center gap-2">
                  <Volume2 className="size-4 animate-ping" /> Continuous Alarm Sound Ringing
                </span>
                <span>Click ACCEPT to Silence</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  className="h-11 px-4 rounded-xl font-bold text-xs"
                  onClick={() => markPendingRealtimeRequest(activePopupRequest.id)}
                >
                  <Clock className="size-4" /> Mark Pending
                </Button>
                <Button
                  variant="outline"
                  className="h-11 px-4 rounded-xl font-bold text-xs"
                  onClick={() => setForwardId(activePopupRequest.id)}
                >
                  <Share2 className="size-4" /> Forward
                </Button>
                <Button
                  className="flex-1 h-11 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md gap-2"
                  onClick={() => handleAcceptPopup(activePopupRequest.id)}
                >
                  <CheckCircle2 className="size-5" /> ACCEPT & SILENCE
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* REJECT MODAL */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-6 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:outline-none resize-none"
            />
            <Button
              variant="destructive"
              className="w-full h-10 rounded-xl font-bold"
              onClick={() => {
                if (rejectId) {
                  rejectRealtimeRequest(rejectId, rejectReason || "Request rejected by Receptionist.");
                  setRejectId(null);
                  setRejectReason("");
                }
              }}
            >
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FORWARD MODAL */}
      <Dialog open={!!forwardId} onOpenChange={(o) => !o && setForwardId(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-6 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">Forward Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <select
              value={forwardDept}
              onChange={(e) => setForwardDept(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-card text-xs font-bold"
            >
              <option value="Housekeeping">Housekeeping 🧹</option>
              <option value="Maintenance">Maintenance 🛠️</option>
              <option value="Food & Beverage">Food & Beverage 🍽️</option>
              <option value="Security">Security 🛡️</option>
              <option value="Manager">Hotel Manager 👔</option>
            </select>
            <Button
              className="w-full h-11 rounded-xl font-bold"
              onClick={() => {
                if (forwardId) {
                  forwardRealtimeRequest(forwardId, forwardDept);
                  setForwardId(null);
                }
              }}
            >
              Forward Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
