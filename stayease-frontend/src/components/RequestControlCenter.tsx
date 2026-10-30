import { useState } from "react";
import { Check, X, UserCheck, Forward, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pill } from "@/components/Badges";
import { useApp } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoleId } from "@/lib/data";

export function RequestControlCenter() {
  const {
    guestRequests,
    staffRequests,
    setGuestRequestStatus,
    setStaffRequestStatus,
    pushActivity,
    session,
    notifications,
    setReservations,
    tasks,
    // Add custom helper calls from store
    triggerN8nWebhook
  } = useApp();

  const isReception = session?.role === "reception";

  // Filter guest requests: Receptionist only receives Reception-specific requests, ignores Housekeeping, Maintenance, Food, Cleaning
  const filteredGuest = isReception
    ? guestRequests.filter(
        (r) =>
          !r.detail.toLowerCase().includes("ac ") &&
          !r.detail.toLowerCase().includes("cooling") &&
          !r.detail.toLowerCase().includes("plumbing") &&
          !r.detail.toLowerCase().includes("leak") &&
          !r.detail.toLowerCase().includes("faucet") &&
          !r.detail.toLowerCase().includes("keycard") &&
          !r.detail.toLowerCase().includes("towels") &&
          !r.detail.toLowerCase().includes("linen") &&
          !r.detail.toLowerCase().includes("breakfast") &&
          !r.detail.toLowerCase().includes("sandwich") &&
          !r.detail.toLowerCase().includes("clean")
      )
    : guestRequests;

  // Filter staff requests: Receptionist receives Leave Requests, Permission Requests, Internal Requests
  const filteredStaff = isReception
    ? staffRequests.filter((r) => r.type === "Leave" || r.type === "Permission" || r.type === "Escalation")
    : staffRequests;

  // Department assignment dialog state
  const [assigningRequest, setAssigningRequest] = useState<any | null>(null);
  const [selectedDept, setSelectedDept] = useState<RoleId>("housekeeping");

  const handleGuestAction = (req: any, status: "Approved" | "Rejected") => {
    if (isReception && status === "Approved") {
      // If approved by receptionist, trigger department assignment
      setAssigningRequest(req);
    } else {
      setGuestRequestStatus(req.id, status);
      pushActivity(`Guest request ${req.id} ${status.toLowerCase()}`);
      toast.success(`Request ${status.toLowerCase()}`);

      // Notify Customer
      const notif = {
        id: `N-GR-${req.id}-${Date.now()}`,
        title: `Request ${status}`,
        body: `Your request for Room ${req.room} has been ${status.toLowerCase()}.`,
        time: "Just now",
        kind: "guest" as const,
        read: false
      };
      // We can push notification here
      void triggerN8nWebhook("guest_request_status_update", { Request: req, Status: status, Notification: notif });
    }
  };

  const handleAssignSubmit = () => {
    if (!assigningRequest) return;
    
    // Set status to Assigned
    setGuestRequestStatus(assigningRequest.id, "Assigned");
    pushActivity(`Guest request ${assigningRequest.id} assigned to ${selectedDept}`);
    toast.success(`Request assigned to ${selectedDept === "fnb" ? "Food & Beverage" : selectedDept}`);

    // Notify selected department
    const deptNotif = {
      id: `N-DEPT-${assigningRequest.id}-${Date.now()}`,
      title: "New Task Assigned",
      body: `Request from Room ${assigningRequest.room}: "${assigningRequest.detail}"`,
      time: "Just now",
      kind: "task" as const,
      read: false
    };

    // Notify customer
    const custNotif = {
      id: `N-CUST-${assigningRequest.id}-${Date.now()}`,
      title: "Request Approved & Assigned",
      body: `Your request has been approved and forwarded to our ${selectedDept === "fnb" ? "Food & Beverage" : selectedDept} team.`,
      time: "Just now",
      kind: "guest" as const,
      read: false
    };

    // Create a background task for that department
    const newTask = {
      id: `T-${Math.floor(1000 + Math.random() * 9000)}`,
      room: assigningRequest.room,
      type: assigningRequest.type === "Urgent" ? "Urgent Request" : "Guest Request",
      priority: "Medium" as const,
      assignedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      description: assigningRequest.detail,
      eta: "30 min",
      status: "Pending" as const,
      role: selectedDept
    };
    tasks.push(newTask); // Push to local tasks list

    void triggerN8nWebhook("guest_request_assigned", {
      Request: assigningRequest,
      AssignedTo: selectedDept,
      NewTask: newTask,
      Notifications: [deptNotif, custNotif]
    });

    setAssigningRequest(null);
  };

  const handleStaffAction = (req: any, status: "Approved" | "Rejected") => {
    setStaffRequestStatus(req.id, status);
    pushActivity(`Staff request ${req.id} ${status.toLowerCase()}`);
    toast.success(`Request ${status.toLowerCase()}`);

    if (isReception) {
      // Notify staff
      const staffNotif = {
        id: `N-STAFF-${req.id}-${Date.now()}`,
        title: `Leave/Permission Request ${status}`,
        body: `Your request "${req.detail}" has been ${status.toLowerCase()} by Reception.`,
        time: "Just now",
        kind: "shift" as const,
        read: false
      };

      // Manager receives copy
      const managerNotif = {
        id: `N-MGR-${req.id}-${Date.now()}`,
        title: `Staff Request ${status} (Copy)`,
        body: `Staff request from ${req.staff} was ${status.toLowerCase()} by Reception. Detail: "${req.detail}"`,
        time: "Just now",
        kind: "announcement" as const,
        read: false
      };

      void triggerN8nWebhook("staff_request_processed", {
        Request: req,
        Status: status,
        Notifications: [staffNotif, managerNotif]
      });
    }
  };

  return (
    <section className="surface p-5">
      <h2 className="text-lg font-semibold">Request Control Center</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {isReception
          ? "Approve, reject or assign incoming Reception department requests."
          : "Approve, reject or assign incoming requests."}
      </p>

      <Tabs defaultValue="guest" className="mt-4">
        <TabsList className="grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="guest" className="rounded-lg">
            Guest Requests ({filteredGuest.length})
          </TabsTrigger>
          <TabsTrigger value="staff" className="rounded-lg">
            Staff Requests ({filteredStaff.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guest" className="mt-4 space-y-3">
          {filteredGuest.map((r) => (
            <RequestRow
              key={r.id}
              title={`Room ${r.room} · ${r.guest}`}
              detail={r.detail}
              meta={`${r.type} · ${r.time}`}
              status={r.status}
              onAction={(status) => handleGuestAction(r, status)}
            />
          ))}
          {filteredGuest.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-2xl">
              No receptionist guest requests available.
            </p>
          )}
        </TabsContent>

        <TabsContent value="staff" className="mt-4 space-y-3">
          {filteredStaff.map((r) => (
            <RequestRow
              key={r.id}
              title={r.staff}
              detail={r.detail}
              meta={`${r.type} request · ${r.time}`}
              status={r.status}
              onAction={(status) => handleStaffAction(r, status)}
            />
          ))}
          {filteredStaff.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-2xl">
              No receptionist staff requests available.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Department Dialog */}
      <Dialog open={!!assigningRequest} onOpenChange={(o) => !o && setAssigningRequest(null)}>
        <DialogContent className="w-[92vw] max-w-md rounded-2xl border-border p-5 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold font-display text-lg">
              <Forward className="size-5 text-primary shrink-0" /> Assign Request Department
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select which department will handle the guest request for Room {assigningRequest?.room}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground">Request Details:</p>
              <p className="text-sm text-muted-foreground font-medium">"{assigningRequest?.detail}"</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Department
              </label>
              <Select value={selectedDept} onValueChange={(v) => setSelectedDept(v as RoleId)}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="fnb">Food & Beverage (F&B)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="secondary" className="h-11 rounded-xl" onClick={() => setAssigningRequest(null)}>
              Cancel
            </Button>
            <Button className="h-11 rounded-xl bg-success text-success-foreground hover:bg-success/90" onClick={handleAssignSubmit}>
              Assign & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function RequestRow({
  title,
  detail,
  meta,
  status,
  onAction,
}: {
  title: string;
  detail: string;
  meta: string;
  status: "Open" | "Approved" | "Rejected" | "Assigned";
  onAction: (status: "Approved" | "Rejected") => void;
}) {
  return (
    <article className="rounded-2xl border border-border p-4 bg-card">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
          <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
        </div>
        <Pill
          tone={
            status === "Approved"
              ? "success"
              : status === "Rejected"
                ? "danger"
                : status === "Assigned"
                  ? "gold"
                  : "muted"
          }
        >
          {status}
        </Pill>
      </div>
      
      {status === "Open" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl border-success/40 text-success hover:bg-success/10 hover:text-success"
            onClick={() => onAction("Approved")}
          >
            <Check className="size-4" /> Approve
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onAction("Rejected")}
          >
            <X className="size-4" /> Reject
          </Button>
        </div>
      )}
    </article>
  );
}
