import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SectionHeader } from "@/components/Primitives";
import { roleName } from "@/lib/data";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { session, logout } = useApp();
  const navigate = useNavigate();
  const initials = (session?.name ?? "ST").split(" ").map((p) => p[0]).join("").slice(0, 2);

  const rows = [
    { label: "Employee ID", value: session?.employeeId ?? "Not assigned" },
    { label: "Phone", value: session?.phone ?? "Not specified" },
    { label: "Email", value: session?.email ?? "Not specified" },
    { label: "Department", value: roleName(session?.role) },
    { label: "Shift", value: session?.shift ?? "Standard Shift" },
  ];

  return (
    <div>
      <SectionHeader title="Profile" subtitle="Your account details" />
      <div className="surface p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 border border-border">
            <AvatarFallback className="bg-primary-soft text-lg font-semibold text-accent-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{session?.name ?? "Staff Member"}</h2>
            <p className="truncate text-sm text-muted-foreground">{roleName(session?.role)}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="rounded-xl bg-muted/60 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.label}</dt>
              <dd className="mt-0.5 truncate font-semibold">{r.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            className="h-12 rounded-xl"
            onClick={() => toast.success("Password reset link sent")}
          >
            <KeyRound className="size-4" /> Change password
          </Button>
          <Button
            variant="destructive"
            className="h-12 rounded-xl"
            onClick={() => {
              logout();
              void navigate({ to: "/" });
            }}
          >
            <LogOut className="size-4" /> Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
