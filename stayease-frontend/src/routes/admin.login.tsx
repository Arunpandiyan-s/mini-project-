import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  KeyRound,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useApp } from "@/lib/store";
import { loginStaff, setToken } from "@/lib/api";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Portal Sign In: StayEase Executive Console" },
      {
        name: "description",
        content:
          "Elevated administrative and executive access for StayEase Hotel General Managers and Directors.",
      },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillAdminDemo = () => {
    setIdentifier("daniel.o@stayease.com");
    setPassword("password123");
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = identifier.trim();
    if (!idClean || !password || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Backend validates credentials
      const res = await loginStaff(idClean, password, "admin");

      // Strictly verify administrative privilege
      if (res.user.role !== "admin") {
        setError(
          `Access Denied: User '${res.user.name}' holds role '${res.user.role}' and lacks administrative authority. Please use the general staff portal at /staff/login.`
        );
        return;
      }

      setToken(res.access_token);
      login("manager", idClean, res.user);

      // Navigate to dedicated Executive Console
      void navigate({ to: "/admin/dashboard" });
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      let msg = "Administrative authentication failed. Please verify your credentials.";
      if (apiErr?.status === 401) {
        msg = "Invalid administrative identifier or password.";
      } else if (apiErr?.status === 403) {
        msg = apiErr.message || "Access denied: Account lacks required administrative role.";
      } else if (apiErr?.message) {
        msg = apiErr.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="dark min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Subtle gold grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      <header className="mx-auto w-full max-w-5xl flex items-center justify-between z-10">
        <Logo className="[&_p]:text-white [&_p.text-muted-foreground]:text-slate-400" />
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Guest Portal
          </Link>
          <Link
            to="/staff/login"
            className="text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5"
          >
            Staff Portal <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md my-auto py-8 z-10">
        <div className="p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-2xl shadow-amber-500/5 backdrop-blur-xl space-y-6">
          {/* Executive Shield Header */}
          <div className="text-center space-y-2">
            <div className="inline-grid size-14 place-items-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-inner mb-1">
              <ShieldCheck className="size-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-300 border border-amber-500/30">
              <KeyRound className="size-3" /> Elevated Privilege Console
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              StayEase Executive Admin
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Hotel General Managers, Directors of Operations & System Administrators
            </p>
          </div>

          {/* Demo Button */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-xs">
            <div className="text-slate-300">
              <span className="font-semibold block text-slate-100">Executive Account:</span>
              <span className="text-xs font-mono text-amber-300 font-medium">daniel.o@stayease.com</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={fillAdminDemo}
              className="h-8 rounded-xl border border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 text-xs font-bold transition-all shadow-sm"
            >
              <Sparkles className="size-3 mr-1" /> Auto-Fill
            </Button>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-950/70 border border-rose-500/40 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-id" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Admin Identifier / Employee Code
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  id="admin-id"
                  placeholder="e.g. daniel.o@stayease.com or EMP-1001"
                  className="h-12 rounded-xl pl-10 bg-slate-950/90 border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:border-amber-500 text-sm"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-pass" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Administrative Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  id="admin-pass"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 rounded-xl pl-10 pr-10 bg-slate-950/90 border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:border-amber-500 text-sm font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-md"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !identifier.trim() || !password}
              className="w-full h-12 rounded-xl text-sm font-bold shadow-lg transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/20 disabled:bg-none disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700/60 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Verifying Elevated Privileges...
                </>
              ) : (
                <>
                  Authenticate Administrative Console
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-[11px] text-slate-400 leading-relaxed flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-amber-400 shrink-0" />
            <span>
              All administrative sessions are cryptographically logged and audited for compliance.
            </span>
          </div>
        </div>
      </div>

      <footer className="mx-auto w-full max-w-5xl text-center text-xs text-slate-500 z-10">
        StayEase Smart Hotel Platform · Executive Administration System
      </footer>
    </main>
  );
}
