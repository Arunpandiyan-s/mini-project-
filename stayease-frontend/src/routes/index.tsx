import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ConciergeBell,
  BedDouble,
  Wrench,
  UtensilsCrossed,
  ShieldCheck,
  ArrowRight,
  User,
  KeyRound,
  FileCheck2,
  Sparkles,
  Hotel,
  CheckCircle2,
  Lock,
  Compass,
  Building2,
  Activity,
  Layers,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import type { RoleId } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StayEase: Smart Hotel Operations and Guest Experience Platform" },
      {
        name: "description",
        content:
          "Enterprise hotel operations platform integrating digital guest services, staff execution queues, and executive administration.",
      },
    ],
  }),
  component: UnifiedPortalGateway,
});

export function UnifiedPortalGateway() {
  const { setSelectedRole } = useApp();
  const navigate = useNavigate();

  const handleStaffRole = (id: RoleId) => {
    setSelectedRole(id);
    if (id === "manager") {
      void navigate({ to: "/admin/login" });
    } else {
      void navigate({ to: "/staff/login" });
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      {/* Top Navigation Bar */}
      <nav className="border-b border-border/70 bg-card/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground mr-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Aiven PostgreSQL Live</span>
              <span className="text-border">·</span>
              <span className="font-mono tabular-nums text-foreground">60 Rooms</span>
            </div>
            <Link to="/login">
              <Button
                size="sm"
                className="h-8 rounded-lg px-3.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 py-10 lg:py-14 flex-1 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span className="tracking-tight text-muted-foreground">StayEase Hospitality Platform</span>
            <span className="text-border">/</span>
            <span className="font-semibold text-foreground">Unified Single Frontend</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08]">
            Precision operations for luxury hospitality.
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            A cohesive real-time cockpit connecting guests, departmental turnover teams, and general management with zero disconnect.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void navigate({ to: "/login" })}
              className="rounded-lg h-10 px-5 text-xs font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
            >
              <Lock className="size-3.5" /> Open Universal Gateway
              <ArrowRight className="size-3.5" />
            </Button>
            <Link
              to="/guest/login"
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border bg-card hover:bg-accent/60 text-xs font-semibold text-foreground transition-colors"
            >
              Guest Hub Demo
            </Link>
          </div>
        </div>

        {/* 3 Core Access Pillars */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pillar 1: Guest Services */}
          <div className="group rounded-2xl border border-border/80 bg-card p-6 flex flex-col justify-between hover:border-sky-500/50 hover:shadow-lift transition-all duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="size-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 grid place-items-center">
                  <User className="size-5" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                  Guest
                </span>
              </div>

              <h2 className="mt-4 text-lg font-bold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                Guest Experience Hub
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Contactless digital registration, room controls, on-demand dining, and 24/7 AI concierge guidance.
              </p>

              <div className="mt-4 space-y-1.5 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground/90 font-medium">
                  <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" />
                  <span>Digital Key and In-Room Telemetry</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/90 font-medium">
                  <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" />
                  <span>Room 512 Demo Stay Pre-Loaded</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/90 font-medium">
                  <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" />
                  <span>Instant Amenities and Kitchen Orders</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 space-y-2">
              <Link
                to="/guest/login"
                className="w-full h-9 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <KeyRound className="size-3.5" /> Sign In to Guest Portal
              </Link>
              <Link
                to="/pre-register"
                className="w-full h-8 rounded-lg border border-sky-500/30 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileCheck2 className="size-3.5" /> Fast-Track Pre-Registration
              </Link>
            </div>
          </div>

          {/* Pillar 2: Departmental Staff Operations */}
          <div className="group rounded-2xl border border-border/80 bg-card p-6 flex flex-col justify-between hover:border-primary/50 hover:shadow-lift transition-all duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 grid place-items-center">
                  <ConciergeBell className="size-5" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  Operations
                </span>
              </div>

              <h2 className="mt-4 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                Staff Operations Hub
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Integrated workflow queues for Reception, Housekeeping room turnover, Maintenance repairs, and Dining dispatch.
              </p>

              {/* Department Shortcut Chips */}
              <div className="mt-4 grid grid-cols-2 gap-1.5 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => handleStaffRole("reception")}
                  className="p-2 rounded-lg border border-border bg-background hover:bg-accent/60 text-left transition-all"
                >
                  <span className="text-xs font-bold block text-foreground flex items-center gap-1">
                    <ConciergeBell className="size-3 text-primary" /> Front Desk
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">Check-ins & Keys</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStaffRole("housekeeping")}
                  className="p-2 rounded-lg border border-border bg-background hover:bg-accent/60 text-left transition-all"
                >
                  <span className="text-xs font-bold block text-foreground flex items-center gap-1">
                    <BedDouble className="size-3 text-primary" /> Housekeeping
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">Room Turnover</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStaffRole("maintenance")}
                  className="p-2 rounded-lg border border-border bg-background hover:bg-accent/60 text-left transition-all"
                >
                  <span className="text-xs font-bold block text-foreground flex items-center gap-1">
                    <Wrench className="size-3 text-primary" /> Maintenance
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">Tickets & Fixes</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStaffRole("fnb")}
                  className="p-2 rounded-lg border border-border bg-background hover:bg-accent/60 text-left transition-all"
                >
                  <span className="text-xs font-bold block text-foreground flex items-center gap-1">
                    <UtensilsCrossed className="size-3 text-primary" /> F&B Dining
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">Room Service</span>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60">
              <Link
                to="/staff/login"
                className="w-full h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <ConciergeBell className="size-3.5" /> Staff Shift Login
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          {/* Pillar 3: Executive Administration */}
          <div className="group rounded-2xl border border-border/80 bg-card p-6 flex flex-col justify-between hover:border-amber-500/50 hover:shadow-lift transition-all duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 grid place-items-center">
                  <ShieldCheck className="size-5" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  Leadership
                </span>
              </div>

              <h2 className="mt-4 text-lg font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Executive Administration
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Global operational cockpit for General Managers. Inventory readiness, VIP certifications, and cryptographic audit logs.
              </p>

              <div className="mt-4 space-y-1.5 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground/90 font-medium">
                  <CheckCircle2 className="size-3.5 text-amber-500 shrink-0" />
                  <span>Authoritative 60-Room Floor Grid</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/90 font-medium">
                  <CheckCircle2 className="size-3.5 text-amber-500 shrink-0" />
                  <span>VIP Room Quality Certifications</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/90 font-medium">
                  <CheckCircle2 className="size-3.5 text-amber-500 shrink-0" />
                  <span>Live Department Duty Rosters</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60">
              <Link
                to="/admin/login"
                className="w-full h-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <ShieldCheck className="size-3.5" /> Executive Console Login
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Testing Telemetry Strip */}
        <div className="mt-8 rounded-xl border border-border/80 bg-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Sparkles className="size-4 text-amber-500 shrink-0" />
            <span>
              <strong className="text-foreground font-semibold">Demo Credentials:</strong> Aisha Rahman (Guest: aisha.r@stayease.com) · Sarah Miller (Staff: sarah.m@stayease.com) · Daniel Okoye (Admin: daniel.o@stayease.com)
            </span>
          </div>
          <Link
            to="/login"
            className="shrink-0 px-3 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-colors"
          >
            Open Category Gateway
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/60 py-4 px-4 sm:px-8 text-center text-xs text-muted-foreground">
        StayEase Smart Hotel Management Platform · Central Metropolitan Branch
      </footer>
    </main>
  );
}
