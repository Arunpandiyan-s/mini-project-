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
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import type { RoleId } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StayEase — Smart Hotel Operations & Guest Platform" },
      {
        name: "description",
        content:
          "All-in-one hotel management platform connecting guests, departmental staff, and executive administration.",
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
    <main className="hero-gradient min-h-screen px-4 py-8 sm:px-6 lg:px-12 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-6xl">
        {/* Top Header */}
        <header className="flex flex-col items-center text-center pt-4">
          <Logo />
          <div className="mt-4 h-px w-24 gold-line" />
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-foreground">
            Smart Hotel Operations & Guest Platform
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground">
            Unified access portal for hotel guests, departmental service operations, and executive leadership.
          </p>

          {/* Direct Unified Login Button */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => void navigate({ to: "/login" })}
              className="rounded-xl h-11 px-6 font-bold shadow-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
            >
              <Lock className="size-4" /> Open Unified Login by Category
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </header>

        {/* 3 Core Access Categories */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CATEGORY 1: GUEST PORTAL */}
          <div className="rounded-3xl border border-border/80 bg-card/70 backdrop-blur-md p-6 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="size-12 rounded-2xl bg-sky-500/10 text-sky-500 grid place-items-center">
                  <User className="size-6" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  Guest Services
                </span>
              </div>
              <h2 className="mt-5 text-xl font-bold text-foreground">Hotel Guest Hub</h2>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Fast-track digital pre-registration, active room key, in-room amenities, restaurant ordering, and 24/7 AI concierge.
              </p>

              <div className="mt-4 space-y-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground/80 font-medium">
                  <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" /> Fast-Track Digital Check-In
                </div>
                <div className="flex items-center gap-2 text-foreground/80 font-medium">
                  <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" /> Live In-Room Telemetry (Room 512)
                </div>
                <div className="flex items-center gap-2 text-foreground/80 font-medium">
                  <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" /> Instant Service Requests & AI Chat
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 space-y-2.5">
              <Link
                to="/guest/login"
                className="w-full h-10 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <KeyRound className="size-3.5" /> Sign In to Guest Portal
              </Link>
              <Link
                to="/pre-register"
                className="w-full h-9 rounded-xl border border-sky-500/30 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileCheck2 className="size-3.5" /> Pre-Register Reservation (RES-GST-9000)
              </Link>
            </div>
          </div>

          {/* CATEGORY 2: STAFF OPERATIONS */}
          <div className="rounded-3xl border border-border/80 bg-card/70 backdrop-blur-md p-6 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="size-12 rounded-2xl bg-amber-500/10 text-amber-500 grid place-items-center">
                  <ConciergeBell className="size-6" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  Daily Operations
                </span>
              </div>
              <h2 className="mt-5 text-xl font-bold text-foreground">Staff Operations Hub</h2>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Multi-department workflow for Front Desk, Housekeeping turnover, Maintenance dispatch, and Food & Beverage queues.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => handleStaffRole("reception")}
                  className="p-2.5 rounded-xl border border-border/80 bg-background/50 hover:bg-primary-soft hover:border-primary/40 text-left transition-all"
                >
                  <ConciergeBell className="size-4 text-primary" />
                  <span className="text-xs font-bold block mt-1 text-foreground">Front Desk</span>
                  <span className="text-[10px] text-muted-foreground">Check-in & keys</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStaffRole("housekeeping")}
                  className="p-2.5 rounded-xl border border-border/80 bg-background/50 hover:bg-primary-soft hover:border-primary/40 text-left transition-all"
                >
                  <BedDouble className="size-4 text-primary" />
                  <span className="text-xs font-bold block mt-1 text-foreground">Housekeeping</span>
                  <span className="text-[10px] text-muted-foreground">Turnover & clean</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStaffRole("maintenance")}
                  className="p-2.5 rounded-xl border border-border/80 bg-background/50 hover:bg-primary-soft hover:border-primary/40 text-left transition-all"
                >
                  <Wrench className="size-4 text-primary" />
                  <span className="text-xs font-bold block mt-1 text-foreground">Maintenance</span>
                  <span className="text-[10px] text-muted-foreground">Repairs & tickets</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStaffRole("fnb")}
                  className="p-2.5 rounded-xl border border-border/80 bg-background/50 hover:bg-primary-soft hover:border-primary/40 text-left transition-all"
                >
                  <UtensilsCrossed className="size-4 text-primary" />
                  <span className="text-xs font-bold block mt-1 text-foreground">F & B Dining</span>
                  <span className="text-[10px] text-muted-foreground">Kitchen orders</span>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60">
              <Link
                to="/staff/login"
                className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <ConciergeBell className="size-3.5" /> Staff Shift Login
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          {/* CATEGORY 3: EXECUTIVE ADMINISTRATION */}
          <div className="rounded-3xl border border-border/80 bg-card/70 backdrop-blur-md p-6 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-500 grid place-items-center">
                  <ShieldCheck className="size-6" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Elevated Authority
                </span>
              </div>
              <h2 className="mt-5 text-xl font-bold text-foreground">Executive Administration</h2>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Authoritative overview for General Managers and Operations Directors. Full room inventory matrix, VIP certifications & audits.
              </p>

              <div className="mt-4 space-y-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground/80 font-medium">
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> Authoritative 60-Room Matrix
                </div>
                <div className="flex items-center gap-2 text-foreground/80 font-medium">
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> VIP Room Quality Certifications
                </div>
                <div className="flex items-center gap-2 text-foreground/80 font-medium">
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" /> Real-time Cryptographic Audit Trail
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60">
              <Link
                to="/admin/login"
                className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <ShieldCheck className="size-3.5" /> Executive Console Login
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Demo Fast-Track Bar */}
        <div className="mt-10 p-5 rounded-2xl bg-card/50 border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="size-4 text-amber-500" />
            <span>
              <strong className="text-foreground">Quick Testing Demo Accounts:</strong> Aisha Rahman (Guest) · Sarah Miller (Staff) · Daniel Okoye (Admin)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
            >
              Open Unified Login
            </Link>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-muted-foreground py-4">
        StayEase Smart Hotel Operations & Management Platform · Unified Single Frontend
      </footer>
    </main>
  );
}
