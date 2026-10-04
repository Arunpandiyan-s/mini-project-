/**
 * Guest Hub Dashboard — Phase 8 Integration
 *
 * All data comes from FastAPI. No mock data used.
 * Session is validated via getGuestMe() on mount — no token presence check alone.
 *
 * WebSocket: connects AFTER auth validation. Listens for:
 *   guest_request.created → refetch requests
 *   task.completed         → refetch requests + notifications
 *   task.assigned          → refetch notifications
 *
 * AI Concierge: isolated from core StayEase state (chat-only, no operational effects).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AiConciergeChat } from "@/components/hotel/AiConciergeChat";
import { BottomNav, type NavKey } from "@/components/hotel/BottomNav";
import { ContactsCard } from "@/components/hotel/ContactsCard";
import { DashboardHeader } from "@/components/hotel/DashboardHeader";
import { FeedbackCard } from "@/components/hotel/FeedbackCard";
import { FoodSection } from "@/components/hotel/FoodSection";
import { NotificationsPanel } from "@/components/hotel/NotificationsPanel";
import { QuickActionGrid } from "@/components/hotel/QuickActionGrid";
import { RequestsSection } from "@/components/hotel/RequestsSection";
import { RoomInfoCard } from "@/components/hotel/RoomInfoCard";
import { RoomBookingSection } from "@/components/hotel/RoomBookingSection";
import { RoomSelectorCard } from "@/components/hotel/RoomSelectorCard";
import { SettingsPanel } from "@/components/hotel/SettingsPanel";
import {
  getGuestMe,
  getGuestToken,
  removeGuestToken,
  registerGuestUnauthorizedHandler,
  getGuestStay,
  getGuestStays,
  getGuestRequests,
  getGuestNotifications,
  getGuestUnreadCount,
  cancelGuestRequest,
  markAllGuestNotificationsRead,
} from "@/lib/api";
import { guestWS } from "@/lib/websocket";
import type {
  ApiGuestProfile,
  ApiGuestStay,
  ApiGuestRequest,
  ApiGuestNotification,
  UiGuestRequest,
  BackendRequestType,
} from "@/lib/types";
import { mapApiGuestRequestToUi } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Guest Dashboard — StayEase Guest Portal" },
      {
        name: "description",
        content:
          "Your StayEase dashboard: request housekeeping, order food, view room info and contact hotel staff in a few taps.",
      },
      { property: "og:title", content: "Guest Dashboard — StayEase Guest Portal" },
      {
        property: "og:description",
        content: "Requests, dining, room details and hotel contacts in one place.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();

  // Auth / profile state
  const [guest, setGuest] = useState<ApiGuestProfile | null>(null);
  const [stay, setStay] = useState<ApiGuestStay | null>(null);
  const [stays, setStays] = useState<ApiGuestStay[]>([]);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string | null>(null);

  // Requests state — starts empty, populated from API
  const [apiRequests, setApiRequests] = useState<ApiGuestRequest[]>([]);
  const [uiRequests, setUiRequests] = useState<UiGuestRequest[]>([]);

  // Notifications state — starts empty, populated from API
  const [notifications, setNotifications] = useState<ApiGuestNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // UI state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [nav, setNav] = useState<NavKey>("home");
  const [loading, setLoading] = useState(true);

  const authInitialized = useRef(false);

  // ─── Load all data ──────────────────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    try {
      const reqs = await getGuestRequests();
      setApiRequests(reqs);
      setUiRequests(reqs.map(mapApiGuestRequestToUi));
    } catch {
      // silently ignore background refetch errors
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifs, countData] = await Promise.all([
        getGuestNotifications(),
        getGuestUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(countData.unread_count);
    } catch {
      // silently ignore
    }
  }, []);

  // ─── AUTH + INITIAL DATA LOAD ──────────────────────────────────────────

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const token = getGuestToken();
    if (!token) {
      toast.error("Please login to access your guest dashboard.");
      navigate({ to: "/", replace: true });
      return;
    }

    // Register global 401 handler
    registerGuestUnauthorizedHandler(() => {
      toast.error("Your session has expired. Please log in again.");
      navigate({ to: "/", replace: true });
    });

    // Validate token + load all initial data
    Promise.all([
      getGuestMe(),
      getGuestStay().catch(() => null),
      getGuestStays().catch(() => []),
      getGuestRequests().catch(() => []),
      getGuestNotifications().catch(() => []),
      getGuestUnreadCount().catch(() => ({ unread_count: 0 })),
    ])
      .then(([guestProfile, stayData, staysData, reqs, notifs, countData]) => {
        setGuest(guestProfile);
        setStay(stayData);
        setStays(staysData);
        // Start on the Booked Rooms Landing Page (selectedRoomNumber = null)
        setSelectedRoomNumber(null);

        setApiRequests(reqs);
        setUiRequests(reqs.map(mapApiGuestRequestToUi));
        setNotifications(notifs);
        setUnreadCount(countData.unread_count);

        // Connect WebSocket AFTER auth confirmed
        guestWS.setAuthExpiredCallback(() => {
          toast.error("Session expired. Please log in again.");
          navigate({ to: "/", replace: true });
        });
        guestWS.connect(token);
      })
      .catch(() => {
        removeGuestToken();
        toast.error("Session validation failed. Please log in again.");
        navigate({ to: "/", replace: true });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate, fetchRequests, fetchNotifications]);

  // ─── WEBSOCKET EVENTS → REFETCH (no local state reconstruction) ────────

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleRequestUpdate = () => {
      void fetchRequests();
    };

    const handleTaskUpdate = () => {
      void fetchRequests();
      void fetchNotifications();
    };

    const handleNotificationUpdate = () => {
      void fetchNotifications();
    };

    guestWS.on("guest_request.created", handleRequestUpdate);
    guestWS.on("guest_request.cancelled", handleRequestUpdate);
    guestWS.on("task.completed", handleTaskUpdate);
    guestWS.on("task.assigned", handleNotificationUpdate);
    guestWS.on("task.accepted", handleNotificationUpdate);

    return () => {
      guestWS.off("guest_request.created", handleRequestUpdate);
      guestWS.off("guest_request.cancelled", handleRequestUpdate);
      guestWS.off("task.completed", handleTaskUpdate);
      guestWS.off("task.assigned", handleNotificationUpdate);
      guestWS.off("task.accepted", handleNotificationUpdate);
    };
  }, [fetchRequests, fetchNotifications]);

  // ─── HANDLERS ──────────────────────────────────────────────────────────

  const handleRequestCreated = useCallback(
    (_requestId: string, _label: string, _type: BackendRequestType) => {
      // Refetch rather than locally reconstructing backend state
      void fetchRequests();
    },
    [fetchRequests]
  );

  const handleCancelRequest = useCallback(
    async (requestId: string) => {
      try {
        await cancelGuestRequest(requestId);
        toast.success("Request cancelled.");
        // Refetch both requests and notifications after cancellation
        await Promise.all([fetchRequests(), fetchNotifications()]);
      } catch (err: unknown) {
        const apiErr = err as { status?: number; message?: string };
        if (apiErr?.status === 409) {
          toast.error(apiErr.message ?? "This request cannot be cancelled at this stage.");
        } else {
          toast.error("Failed to cancel request. Please try again.");
        }
      }
    },
    [fetchRequests, fetchNotifications]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllGuestNotificationsRead();
      await fetchNotifications();
    } catch {
      // ignore
    }
  }, [fetchNotifications]);

  const scrollTo = (key: NavKey) => {
    setNav(key);
    if (key === "profile") {
      setSettingsOpen(true);
      return;
    }
    const id = key === "home" ? "top" : key === "requests" ? "requests" : "food";
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ─── LOADING STATE ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const activeRequestCount = uiRequests.filter(
    (r) => r.status === "pending" || r.status === "in_progress"
  ).length;

  const currentStay = stays.find((s) => s.room.room_number === selectedRoomNumber) || stay;

  return (
    <div className="mx-auto max-w-md md:max-w-3xl lg:max-w-6xl bg-background pb-28">
      <span id="top" />
      <DashboardHeader
        unreadCount={unreadCount}
        activeRequests={activeRequestCount}
        guest={guest}
        stay={currentStay}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="px-5 pt-6 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start space-y-7 lg:space-y-0">
        {/* Left Column (Main Feed) */}
        <div className="lg:col-span-7 space-y-7">
          {/* AI Concierge Agent Banner — isolated from core StayEase state */}
          <div className="card-surface flex items-center justify-between gap-3 p-4 gradient-gold/10 border-primary/20">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-gold text-gold-foreground shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">AI Concierge Assistant</p>
                <p className="text-xs text-muted-foreground truncate">
                  Instant assistance powered by Agent API
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAiChatOpen(true)}
              className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition"
            >
              Chat Now
            </button>
          </div>

          {/* Landing Page (selectedRoomNumber === null) vs Selected Room Services View */}
          {selectedRoomNumber === null ? (
            <>
              {stays.length > 0 && (
                <RoomSelectorCard
                  stays={stays}
                  selectedRoomNumber={selectedRoomNumber}
                  onSelectRoom={(roomNum) => setSelectedRoomNumber(roomNum)}
                />
              )}

              <RoomBookingSection />
            </>
          ) : (
            <>
              {/* Back to Rooms Navigation Bar */}
              <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
                <button
                  type="button"
                  onClick={() => setSelectedRoomNumber(null)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to My Booked Rooms
                </button>
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Room {selectedRoomNumber} Services
                </span>
              </div>

              {currentStay && currentStay.status === "checked_in" ? (
                <>
                  <QuickActionGrid
                    onRequestCreated={handleRequestCreated}
                    selectedRoomNumber={selectedRoomNumber}
                  />

                  <div id="requests" className="scroll-mt-4">
                    <RequestsSection
                      requests={uiRequests}
                      onCancel={handleCancelRequest}
                    />
                  </div>

                  <div id="food" className="scroll-mt-4">
                    <FoodSection
                      onRequestCreated={handleRequestCreated}
                      selectedRoomNumber={selectedRoomNumber}
                    />
                  </div>
                </>
              ) : (
                <div className="card-surface p-6 text-center space-y-3 border-amber-500/30 bg-amber-500/5">
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-extrabold text-amber-400">Receptionist Check-in Required</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Your booking for Room {selectedRoomNumber} is reserved. Once the receptionist approves and completes your check-in at the front desk, in-room services will open automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedRoomNumber(null)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Return to My Booked Rooms
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column (Sidebar for Desktop) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-7">
          <RoomInfoCard stay={currentStay} />
          <ContactsCard />
          <FeedbackCard />
        </div>
      </main>

      <button
        type="button"
        onClick={() => setAiChatOpen(true)}
        className="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 z-40 inline-flex items-center gap-2 rounded-full gradient-gold px-5 py-3 text-sm font-semibold text-gold-foreground shadow-[var(--shadow-card)] active:scale-95 transition"
      >
        <Sparkles className="h-5 w-5 animate-pulse" /> AI Concierge
      </button>

      <AiConciergeChat open={aiChatOpen} onOpenChange={setAiChatOpen} />

      <NotificationsPanel
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
      />

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        guest={guest}
        onLogout={() => {
          removeGuestToken();
          guestWS.disconnect();
          navigate({ to: "/", replace: true });
        }}
      />

      <BottomNav active={nav} onSelect={scrollTo} />
    </div>
  );
}