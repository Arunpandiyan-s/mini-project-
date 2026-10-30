/**
 * RequestsSection — Phase 8 Integration
 * Displays UiGuestRequest objects (adapted from backend ApiGuestRequest).
 * Status styling uses backend status values. Cancel only shown for pending requests.
 */
import { useState } from "react";
import { ChevronRight, History, X, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { UiGuestRequest, BackendRequestStatus } from "@/lib/types";

// Single status → style mapping for the UI (no scattered conversions)
const statusStyle: Record<BackendRequestStatus, { dot: string; chip: string }> = {
  pending: {
    dot: "bg-amber-400",
    chip: "bg-muted text-muted-foreground",
  },
  in_progress: {
    dot: "bg-blue-500",
    chip: "bg-primary/10 text-primary",
  },
  completed: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/12 text-emerald-600",
  },
  attention_needed: {
    dot: "bg-orange-500",
    chip: "bg-orange-500/10 text-orange-600",
  },
  cancelled: {
    dot: "bg-muted-foreground/40",
    chip: "bg-muted text-muted-foreground line-through",
  },
};

function RequestCard({
  request,
  onCancel,
}: {
  request: UiGuestRequest;
  onCancel?: (id: string) => Promise<void>;
}) {
  const style = statusStyle[request.status] ?? statusStyle.pending;
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!onCancel) return;
    setCancelling(true);
    try {
      await onCancel(request.id);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <article className="card-surface flex items-center gap-3 p-4">
      <span className={`h-9 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{request.type}</p>
        {request.description && request.description !== request.type && (
          <p className="truncate text-xs text-muted-foreground mt-0.5">{request.description}</p>
        )}
        <p className="text-xs text-muted-foreground">{request.submitted}</p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}>
        {request.statusLabel}
      </span>
      {request.canCancel && onCancel && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          aria-label="Cancel request"
          className="shrink-0 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
        >
          {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </button>
      )}
    </article>
  );
}

export function RequestsSection({
  requests,
  onCancel,
}: {
  requests: UiGuestRequest[];
  onCancel: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (requests.length === 0) {
    return (
      <section aria-labelledby="requests-title">
        <h2 id="requests-title" className="mb-3 text-base font-semibold">
          My requests
        </h2>
        <div className="card-surface p-6 text-center text-sm text-muted-foreground">
          No requests yet. Use Quick Actions above to submit your first request.
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="requests-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="requests-title" className="text-base font-semibold">
          My requests
        </h2>
        <Button variant="ghost" size="sm" className="text-primary" onClick={() => setOpen(true)}>
          View all <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {requests.slice(0, 3).map((request) => (
          <RequestCard key={request.id} request={request} onCancel={onCancel} />
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[88%] overflow-y-auto sm:max-w-md">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Request history
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} onCancel={onCancel} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}