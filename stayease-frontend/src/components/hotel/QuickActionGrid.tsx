/**
 * QuickActionGrid — Phase 8 Integration
 *
 * Only uses RequestType values actually supported by the backend (from enums.py):
 *   extra_towel | room_cleaning | toiletries | luggage_assistance
 *   maintenance | room_service | food_order | other
 *
 * Actions that have NO backend RequestType mapping (e.g. "Wake-Up Call", "Laundry")
 * are either mapped to the closest valid type OR shown as disabled with a tooltip.
 *
 * The "room" field is NOT sent in the payload — backend derives it from the guest JWT.
 */

import { useState } from "react";
import {
  BedDouble,
  ConciergeBell,
  Loader2,
  ShowerHead,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  BriefcaseMedical,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { BackendRequestType } from "@/lib/types";

type Action = {
  label: string;
  icon: LucideIcon;
  hint: string;
  requestType: BackendRequestType;
  disabled?: boolean;
  disabledReason?: string;
};

// Mapped strictly to backend RequestType enum values
const actions: Action[] = [
  {
    label: "Extra Towels",
    icon: ShowerHead,
    hint: "Fresh towels and linens delivered to your room.",
    requestType: "extra_towel",
  },
  {
    label: "Room Cleaning",
    icon: Sparkles,
    hint: "Housekeeping service to refresh your room.",
    requestType: "room_cleaning",
  },
  {
    label: "Toiletries",
    icon: BriefcaseMedical,
    hint: "Shampoo, soap, toothbrush or other toiletry items.",
    requestType: "toiletries",
  },
  {
    label: "Luggage Assistance",
    icon: BedDouble,
    hint: "Help with luggage delivery, storage or transport.",
    requestType: "luggage_assistance",
  },
  {
    label: "Maintenance",
    icon: Wrench,
    hint: "Report a fault or technical issue in your room.",
    requestType: "maintenance",
  },
  {
    label: "Room Service",
    icon: ConciergeBell,
    hint: "General in-room service request.",
    requestType: "room_service",
  },
  {
    label: "Food Order",
    icon: UtensilsCrossed,
    hint: "Order in-room dining from our kitchen.",
    requestType: "food_order",
  },
  {
    label: "Other Request",
    icon: ConciergeBell,
    hint: "Any other request not listed above: describe your specific need.",
    requestType: "other",
  },
];

interface QuickActionGridProps {
  /** Called after a request is successfully submitted. Returns the request_id. */
  onRequestCreated: (requestId: string, label: string, requestType: BackendRequestType) => void;
  selectedRoomNumber?: string;
}

export function QuickActionGrid({ onRequestCreated, selectedRoomNumber }: QuickActionGridProps) {
  const [active, setActive] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Import lazily to avoid circular imports — api.ts is already loaded
  const submit = async () => {
    if (!active || loading) return;
    setLoading(true);

    const description = note.trim() || active.hint;

    try {
      // Dynamic import keeps the api module tree-shakeable
      const { createGuestRequest } = await import("@/lib/api");
      const result = await createGuestRequest({
        request_type: active.requestType,
        description,
        room_number: selectedRoomNumber || undefined,
      });

      onRequestCreated(result.request_id, active.label, active.requestType);
      toast.success(`${active.label} request submitted successfully.`);
      setActive(null);
      setNote("");
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr?.status === 403) {
        toast.error("You don't have an active stay. Please contact reception.");
      } else if (apiErr?.status === 422) {
        toast.error(apiErr.message ?? "Invalid request. Please check your input.");
      } else {
        toast.error(apiErr?.message ?? "Failed to submit request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="mb-3 text-base font-semibold">
        Quick actions
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {actions.map((action) => (
          <button
            key={action.requestType}
            type="button"
            disabled={action.disabled}
            title={action.disabled ? action.disabledReason : undefined}
            onClick={() => {
              if (!action.disabled) setActive(action);
            }}
            className={`rounded-xl border border-border bg-card flex min-h-[104px] flex-col items-start gap-2 p-3.5 text-left transition hover:border-primary/40 hover:shadow-soft active:scale-[0.98] ${
              action.disabled ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
              <action.icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold leading-tight">{action.label}</span>
            {action.disabled && (
              <span className="text-[10px] text-muted-foreground">{action.disabledReason}</span>
            )}
          </button>
        ))}
      </div>

      <Sheet open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent side="bottom" className="rounded-t-[1.75rem] pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>{active?.label}</SheetTitle>
            <SheetDescription>{active?.hint}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-note">Add a note (optional)</Label>
              <Textarea
                id="request-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. after 3 PM please, non-smoking towels preferred"
                className="min-h-24 rounded-xl"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your room and stay details are automatically included with this request.
            </p>
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              onClick={submit}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Sending…" : "Send request"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}