import { useState } from "react";
import {
  Clock,
  Bike,
  ChefHat,
  Check,
  PackageCheck,
  UserCheck,
  MessageSquare,
  Utensils,
  CheckCircle2,
  Play,
  Timer,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pill } from "@/components/Badges";
import { SectionHeader, StatCard } from "@/components/Primitives";
import { useApp } from "@/lib/store";
import type { FoodOrder } from "@/lib/data";

type Chef = {
  id: string;
  name: string;
  specialty: string;
  onDuty: boolean;
};

const INITIAL_CHEFS: Chef[] = [
  { id: "c1", name: "Carlos Mendez", specialty: "Executive Chef & F&B Lead", onDuty: true },
];

const GUEST_COMMENTS: Record<string, string> = {};

const VIP_ORDERS: Record<string, boolean> = {};

const ETA_PRESETS = ["10 min", "15 min", "20 min", "25 min", "30 min"];

export function FnbDashboard() {
  const { orders, setOrderStatus, pushActivity, staff } = useApp();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [chefs, setChefs] = useState<Chef[]>(INITIAL_CHEFS);
  const [orderEtas, setOrderEtas] = useState<Record<string, string>>({});

  useEffect(() => {
    const fnbStaff = staff.filter((s) => s.role === "fnb");
    if (fnbStaff.length > 0) {
      setChefs(
        fnbStaff.map((s) => ({
          id: s.id,
          name: s.name,
          specialty: s.shift || "F&B Operations",
          onDuty: s.duty === "On Duty",
        }))
      );
    }
  }, [staff]);

  const toggleChefDuty = (chefId: string) => {
    setChefs((prev) =>
      prev.map((c) => {
        if (c.id === chefId) {
          const nextState = !c.onDuty;
          toast.info(
            `${c.name} is now ${nextState ? "ON DUTY (Active for Orders)" : "OFF DUTY"}`
          );
          pushActivity(`${c.name} duty status set to ${nextState ? "On Duty" : "Off Duty"}`);
          return { ...c, onDuty: nextState };
        }
        return c;
      })
    );
  };

  const onDutyChefs = chefs.filter((c) => c.onDuty);

  const getFormattedEta = (rawVal?: string, fallback = "15 min"): string => {
    if (!rawVal) return fallback;
    const trimmed = rawVal.trim();
    if (!trimmed) return fallback;
    if (/^\d+$/.test(trimmed)) {
      return `${trimmed} min`;
    }
    return trimmed;
  };

  const handleSetEta = (orderId: string, etaValue: string) => {
    setOrderEtas((prev) => ({ ...prev, [orderId]: etaValue }));
  };

  const handleEtaBlur = (orderId: string, rawVal: string) => {
    const formatted = getFormattedEta(rawVal, "");
    if (formatted && formatted !== rawVal) {
      setOrderEtas((prev) => ({ ...prev, [orderId]: formatted }));
      toast.success(`Preparation ETA set to "${formatted}" for Order ${orderId}`);
    }
  };

  const updateStatus = (o: FoodOrder, nextStatus: FoodOrder["status"]) => {
    const eta = orderEtas[o.id] || o.eta;

    setOrderStatus(o.id, nextStatus);
    pushActivity(`Food Order ${o.id} (Room ${o.room}) → ${nextStatus} (ETA: ${eta})`);

    if (nextStatus === "Ready" || nextStatus === "Delivered") {
      toast.success(
        `Order ${o.id} marked as ${nextStatus}! Ready for room service delivery.`
      );
    } else {
      toast.info(`Order ${o.id} status updated to ${nextStatus}`);
    }
  };

  const pending = orders.filter((o) => o.status !== "Delivered").length;
  const preparingCount = orders.filter((o) => o.status === "Preparing").length;
  const activeOrders = orders.filter((o) => o.status !== "Delivered");
  const completedOrders = orders.filter((o) => o.status !== "Delivered");
  const currentOrders = activeTab === "active" ? activeOrders : completedOrders;

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending Orders" value={pending} icon={Clock} tone="danger" />
        <StatCard label="In Preparation" value={preparingCount} icon={ChefHat} tone="gold" />
        <StatCard label="On-Duty Chefs" value={onDutyChefs.length} icon={UserCheck} tone="success" />
        <StatCard label="Delivered Today" value={completedOrders.length + 32} icon={PackageCheck} tone="primary" />
      </div>

      {/* Chef Roster Controller Card */}
      <section className="surface p-4 sm:p-5 rounded-2xl border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-display flex items-center gap-2">
              <ChefHat className="size-5 text-primary shrink-0" /> Kitchen Staff & Chef Roster Controller
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Toggle chef duty status for kitchen operations
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary w-fit">
            <Utensils className="size-3.5" /> {onDutyChefs.length} / {chefs.length} Chefs Active
          </span>
        </div>

        {/* Roster Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          {chefs.map((c) => (
            <div
              key={c.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                c.onDuty
                  ? "border-success/40 bg-success/10 text-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground opacity-75"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-xs sm:text-sm truncate">{c.name}</p>
                  {c.onDuty ? (
                    <span className="size-2 rounded-full bg-success shrink-0" />
                  ) : (
                    <span className="size-2 rounded-full bg-muted-foreground shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{c.specialty}</p>
              </div>

              {/* Start Duty Toggle */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {c.onDuty ? "On Duty" : "Off Duty"}
                </span>
                <Switch
                  checked={c.onDuty}
                  onCheckedChange={() => toggleChefDuty(c.id)}
                  aria-label={`Toggle duty for ${c.name}`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs Bar: Active Orders vs Completed */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`h-12 w-full rounded-2xl border px-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "active"
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <span>Active Orders</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "active"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {activeOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`h-12 w-full rounded-2xl border px-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "completed"
              ? "border-primary bg-primary text-primary-foreground shadow-md"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <span>Completed Orders</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "completed"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {completedOrders.length}
          </span>
        </button>
      </div>

      <SectionHeader
        title={activeTab === "active" ? "Active Food Preparation Queue" : "Completed Food Orders"}
        subtitle={
          activeTab === "active"
            ? "Review guest comments, set ETA time, and mark orders complete"
            : "Finished room service orders"
        }
      />

      {/* Orders List */}
      <div className="grid gap-4 xl:grid-cols-2">
        {currentOrders.length === 0 && (
          <div className="surface p-8 text-center text-sm text-muted-foreground rounded-2xl col-span-2">
            {activeTab === "active"
              ? "No active food orders right now."
              : "No completed orders yet today."}
          </div>
        )}

        {currentOrders.map((o) => {
          const guestComment = GUEST_COMMENTS[o.id] || "No special dietary notes.";
          const currentEta = getFormattedEta(orderEtas[o.id], o.eta);
          const isVip = VIP_ORDERS[o.id] || false;

          return (
            <article
              key={o.id}
              className={`surface p-4 sm:p-5 flex flex-col gap-4 rounded-2xl transition-all ${
                isVip ? "border-2 border-amber-500/50 bg-amber-500/5 shadow-md" : ""
              }`}
            >
              {/* Header: Room, VIP Badge & Status */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Target Room
                    </p>
                    {isVip && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-700 border border-amber-500/40 animate-pulse">
                        <Crown className="size-3 text-amber-600" /> VIP Guest
                      </span>
                    )}
                  </div>
                  <p className="font-display text-3xl font-extrabold leading-none mt-0.5">Room {o.room}</p>
                  <p className="mt-1 truncate text-xs sm:text-sm font-semibold text-foreground/80">
                    Guest: {o.guest}
                  </p>
                </div>
                <Pill tone={o.status === "Delivered" ? "success" : o.status === "Ready" ? "gold" : "primary"}>
                  {o.status}
                </Pill>
              </div>

              {/* Items List */}
              <div className="rounded-xl bg-muted/40 p-3 space-y-1.5 border border-border/50">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Ordered Food Items
                </p>
                {o.items.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                    <Check className="size-4 shrink-0 text-primary" /> <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Guest Special Comments */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs">
                <div className="flex items-center gap-1.5 text-amber-700 font-bold mb-1">
                  <MessageSquare className="size-3.5 shrink-0" /> Guest Special Comments / Instructions:
                </div>
                <p className="text-foreground/90 font-medium leading-relaxed">"{guestComment}"</p>
              </div>

              {/* Dynamic ETA Time Picker fixed by Chef (10, 15, 20, 25, 30 min + Manual Entry) */}
              <div className="space-y-2 pt-1 border-t border-border/50">
                <label className="text-xs font-bold text-muted-foreground flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <Timer className="size-3.5 text-primary" /> Fix Preparation ETA Time:
                  </span>
                  <span className="text-[11px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-md">
                    Active ETA: {currentEta}
                  </span>
                </label>

                {/* Preset ETA Buttons: 10, 15, 20, 25, 30 min */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {ETA_PRESETS.map((preset) => {
                    const isSelected = currentEta === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSetEta(o.id, preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                {/* Manual Entry Input (e.g. typing "50" automatically outputs "50 min") */}
                <input
                  type="text"
                  value={orderEtas[o.id] ?? ""}
                  onChange={(e) => handleSetEta(o.id, e.target.value)}
                  onBlur={(e) => handleEtaBlur(o.id, e.target.value)}
                  placeholder="Type ETA (e.g. enter 50 for 50 min)..."
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Preparation Timeline */}
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
                <span>Ordered: {o.orderedAt}</span>
                <span className="font-bold text-foreground">ETA: {currentEta}</span>
              </div>

              {/* Action Buttons: Start Preparing -> Out for Delivery (lastly) */}
              <div className="pt-1">
                {o.status === "New" || o.status === "Accepted" ? (
                  <Button
                    className="h-11 w-full rounded-xl text-xs font-bold bg-primary text-primary-foreground"
                    onClick={() => updateStatus(o, "Preparing")}
                  >
                    <Play className="size-4 shrink-0" /> Start Preparing
                  </Button>
                ) : o.status === "Preparing" || o.status === "Ready" ? (
                  <Button
                    className="h-11 w-full rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                    onClick={() => updateStatus(o, "Out for Delivery")}
                  >
                    <Bike className="size-4 shrink-0" /> Out for Delivery
                  </Button>
                ) : o.status === "Out for Delivery" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 h-11 w-full rounded-xl bg-amber-500/15 text-amber-700 font-bold text-xs border border-amber-500/30">
                      <Clock className="size-4 shrink-0 text-amber-600 animate-spin" />
                      <span>Waiting for confirmation from the guest...</span>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 w-full rounded-xl text-xs font-bold bg-success/15 text-success hover:bg-success/25 border-success/40"
                      onClick={() => updateStatus(o, "Delivered")}
                    >
                      <CheckCircle2 className="size-3.5 shrink-0" /> Guest Press: "I Received Order"
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 h-11 w-full rounded-xl bg-success/15 text-success font-bold text-xs border border-success/30">
                    <CheckCircle2 className="size-4 shrink-0 text-success" /> Guest Confirmed & Completed
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
