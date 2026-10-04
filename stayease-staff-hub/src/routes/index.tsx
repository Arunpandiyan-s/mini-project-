import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ConciergeBell,
  BedDouble,
  Wrench,
  UtensilsCrossed,
  Bike,
  ShieldCheck,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ROLES, type RoleId } from "@/lib/data";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StayEase Staff Portal — Select Your Department" },
      {
        name: "description",
        content:
          "Sign in to the StayEase Staff Portal. Choose your department to access daily tasks, rooms and hotel operations.",
      },
      { property: "og:title", content: "StayEase Staff Portal — Select Your Department" },
      {
        property: "og:description",
        content: "Smart hotel operations for reception, housekeeping, maintenance, F&B and managers.",
      },
    ],
  }),
  component: RoleSelection,
});

const icons: Record<string, LucideIcon> = {
  reception: ConciergeBell,
  housekeeping: BedDouble,
  maintenance: Wrench,
  fnb: UtensilsCrossed,
  manager: ShieldCheck,
};

function RoleSelection() {
  const { setSelectedRole } = useApp();
  const navigate = useNavigate();

  const pick = (id: RoleId) => {
    setSelectedRole(id);
    void navigate({ to: "/login" });
  };

  return (
    <main className="hero-gradient min-h-screen px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col items-center text-center">
          <Logo />
          <div className="mt-8 h-px w-24 gold-line" />
          <h1 className="mt-6 text-3xl font-bold sm:text-4xl lg:text-5xl">StayEase Staff Portal</h1>
          <p className="mt-3 max-w-md text-base text-muted-foreground">
            Select your department to continue.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((role) => {
            const Icon = icons[role.id] || ConciergeBell;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => pick(role.id)}
                className="surface group flex min-h-[140px] w-full flex-col justify-between p-6 text-left transition-all duration-200 active:scale-[0.98] hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-6" />
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <div className="mt-5 min-w-0">
                  <h2 className="truncate text-lg font-semibold">{role.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{role.blurb}</p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Authorised hotel personnel only · StayEase Smart Hotel Operations Platform
        </p>
      </div>
    </main>
  );
}
