import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ConciergeBell,
  BedDouble,
  Wrench,
  UtensilsCrossed,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useApp } from "@/lib/store";
import { loginStaff, setToken } from "@/lib/api";
import type { RoleId } from "@/lib/data";

export const Route = createFileRoute("/staff/login")({
  head: () => ({
    meta: [
      { title: "Staff Login: StayEase Staff Portal" },
      {
        name: "description",
        content: "Secure staff sign-in for StayEase hotel operations across all departments.",
      },
    ],
  }),
  component: StaffLoginPage,
});

const DEPARTMENTS: { id: RoleId; label: string; icon: typeof ConciergeBell; blurb: string }[] = [
  { id: "reception", label: "Reception", icon: ConciergeBell, blurb: "Front desk & check-ins" },
  { id: "housekeeping", label: "Housekeeping", icon: BedDouble, blurb: "Cleaning & inspections" },
  { id: "maintenance", label: "Maintenance", icon: Wrench, blurb: "Repairs & technical" },
  { id: "fnb", label: "F&B / Dining", icon: UtensilsCrossed, blurb: "Room service & dining" },
  { id: "manager", label: "Floor Manager", icon: ShieldCheck, blurb: "Shift supervisor" },
];

function StaffLoginPage() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [selectedDept, setSelectedDept] = useState<RoleId>("reception");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillQuickDemo = (dept: RoleId) => {
    setSelectedDept(dept);
    setPassword("password123");
    if (dept === "reception") setIdentifier("sarah.m@stayease.com");
    else if (dept === "housekeeping") setIdentifier("elena.r@stayease.com");
    else if (dept === "maintenance") setIdentifier("marcus.t@stayease.com");
    else if (dept === "fnb") setIdentifier("fnb.staff@stayease.com");
    else if (dept === "manager") setIdentifier("daniel.o@stayease.com");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = identifier.trim();
    if (!idClean || !password || loading) return;

    setLoading(true);
    setError(null);

    try {
      const backendRole = selectedDept === "manager" ? "admin" : selectedDept;
      const res = await loginStaff(idClean, password, backendRole);

      setToken(res.access_token);
      login(selectedDept, idClean, res.user);

      // Route to dashboard
      void navigate({ to: "/dashboard" });

    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      let msg = "Authentication failed. Please verify your staff credentials.";
      if (apiErr?.status === 401) {
        msg = "Invalid employee ID, email, or password.";
      } else if (apiErr?.status === 403) {
        msg = apiErr.message || "Account suspended or department mismatch.";
      } else if (apiErr?.message) {
        msg = apiErr.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="hero-gradient min-h-screen px-4 py-8 sm:px-6 lg:px-10 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-3">
            <Logo />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Staff Operations Portal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Select your department and enter your StayEase staff credentials to access your daily tasks.
          </p>
        </div>

        {/* Department Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-8">
          {DEPARTMENTS.map((dept) => {
            const Icon = dept.icon;
            const isSelected = selectedDept === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setSelectedDept(dept.id)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-card border-primary shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "bg-card/60 border-border/70 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`grid size-9 place-items-center rounded-xl ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  {isSelected && <span className="size-2 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{dept.label}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{dept.blurb}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Login Form Card */}
        <div className="surface p-6 sm:p-8 max-w-md mx-auto w-full rounded-3xl border border-border shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">
                {DEPARTMENTS.find((d) => d.id === selectedDept)?.label} Sign In
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                StayEase authorized operational terminal
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillQuickDemo(selectedDept)}
              className="text-xs h-8 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
              title="Click to fill test credentials for this department"
            >
              <Sparkles className="size-3 mr-1" /> Demo Account
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="staff-id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email or Employee ID
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="staff-id"
                  placeholder="e.g. sarah.m@stayease.com or EMP-1002"
                  className="h-12 rounded-xl pl-10 text-sm"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Staff Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="staff-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 rounded-xl pl-10 pr-10 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !identifier.trim() || !password}
              className="w-full h-12 rounded-xl text-sm font-bold shadow-md bg-primary text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Authenticating Staff...
                </>
              ) : (
                <>
                  Enter Operations Console
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Executive Staff?</span>
            <Link to="/admin/login" className="text-primary font-bold hover:underline flex items-center gap-1">
              Admin & Management Login →
            </Link>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        StayEase Smart Hotel Operations Platform · Multi-Department Staff Access
      </footer>
    </main>
  );
}
