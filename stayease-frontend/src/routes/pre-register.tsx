import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarCheck,
  Clock,
  FileText,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Hotel,
  Sparkles,
  BedDouble,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { preRegisterStay } from "@/lib/api";
import type { GuestPreRegisterResponse } from "@/lib/types";

export const Route = createFileRoute("/pre-register")({
  head: () => ({
    meta: [
      { title: "Digital Pre-Registration: StayEase" },
      {
        name: "description",
        content: "Complete digital pre-registration for your upcoming hotel stay at StayEase.",
      },
    ],
  }),
  component: PreRegisterPage,
});

function PreRegisterPage() {
  const navigate = useNavigate();
  const [reservationId, setReservationId] = useState("RES-GST-9000");
  const [estimatedArrival, setEstimatedArrival] = useState("14:00");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<GuestPreRegisterResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationId.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await preRegisterStay({
        reservation_id: reservationId.trim().toUpperCase(),
        estimated_arrival: estimatedArrival.trim() || undefined,
        id_document_number: idDocumentNumber.trim() || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
        special_requests: specialRequests.trim() || undefined,
      });
      setConfirmation(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to pre-register. Please verify your reservation ID.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-md sticky top-0 z-10 px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <Link
            to="/guest/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Sign In
          </Link>
          <div className="flex items-center gap-2">
            <Hotel className="size-4 text-amber-500" />
            <span className="text-sm font-extrabold tracking-tight">StayEase Pre-Check-in</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto w-full max-w-xl px-4 py-8 flex-1">
        {confirmation ? (
          /* Confirmation Success Card */
          <div className="card-surface p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 shadow-lg space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Pre-Registration Confirmed!</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your arrival details have been notified to reception.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">Guest:</span>
                <span className="font-bold text-foreground">{confirmation.guest_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">Reservation Code:</span>
                <span className="font-mono font-bold text-primary">{confirmation.reservation_id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">Assigned Room:</span>
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <BedDouble className="size-4 text-amber-500" />
                  Room {confirmation.room_number} ({confirmation.room_type})
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground font-semibold">Stay Dates:</span>
                <span className="font-medium text-foreground flex items-center gap-1.5 text-xs">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {new Date(confirmation.check_in).toLocaleDateString()} to {new Date(confirmation.check_out).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 text-xs text-foreground/90 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-primary">
                <Sparkles className="size-3.5" /> Fast-Track Arrival Ready
              </p>
              <p className="text-muted-foreground">
                Upon arrival, front desk will verify your ID and hand you your keycard or activate digital room access immediately.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                className="h-11 rounded-xl text-xs font-bold"
                onClick={() => setConfirmation(null)}
              >
                Register Another
              </Button>
              <Button
                className="h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
                onClick={() => navigate({ to: "/guest/login" })}
              >
                Sign In to Portal
              </Button>
            </div>
          </div>
        ) : (
          /* Pre-Registration Form */
          <div className="card-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">
                <CalendarCheck className="size-3.5" /> Digital Pre-Check-in
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Express Pre-Registration
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Save time at arrival by registering your check-in preferences and details now.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="res-id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Reservation ID / Confirmation Code *
                  </Label>
                  <button
                    type="button"
                    onClick={() => setReservationId("RES-GST-9000")}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Use Sample (RES-GST-9000)
                  </button>
                </div>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="res-id"
                    placeholder="e.g. RES-GST-9000"
                    className="h-12 rounded-xl pl-10 font-mono text-sm uppercase"
                    value={reservationId}
                    onChange={(e) => setReservationId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="arrival-time" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Estimated Arrival Time
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="arrival-time"
                      placeholder="e.g. 14:00 or 2:00 PM"
                      className="h-12 rounded-xl pl-10 text-sm"
                      value={estimatedArrival}
                      onChange={(e) => setEstimatedArrival(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="id-doc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    ID / Passport Number
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="id-doc"
                      placeholder="e.g. PASS-892147"
                      className="h-12 rounded-xl pl-10 text-sm font-mono"
                      value={idDocumentNumber}
                      onChange={(e) => setIdDocumentNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emergency-phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Emergency Contact Phone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="emergency-phone"
                    placeholder="e.g. +1 555-0199"
                    className="h-12 rounded-xl pl-10 text-sm"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="special-requests" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Special Requests & Room Preferences
                </Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
                  <textarea
                    id="special-requests"
                    rows={3}
                    placeholder="e.g. Quiet room requested, high floor preference, baby crib needed"
                    className="w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !reservationId.trim()}
                className="w-full h-12 rounded-xl text-sm font-bold shadow-md bg-primary text-primary-foreground"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Submitting Pre-Registration...
                  </>
                ) : (
                  "Confirm Pre-Registration"
                )}
              </Button>
            </form>
          </div>
        )}
      </div>

      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        StayEase Smart Hotel Platform · Guest Services
      </footer>
    </main>
  );
}