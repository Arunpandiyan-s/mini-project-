import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  User,
  ConciergeBell,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Sparkles,
  Lock,
  Mail,
  KeyRound,
  FileCheck2,
  AlertTriangle,
  Hotel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { useApp } from "@/lib/store";
import { loginStaff, setToken, guestLogin, setGuestToken } from "@/lib/api";
import hotelImage from "@/assets/hotel-hero.jpg";
import { toast } from "sonner";
import type { RoleId } from "@/lib/data";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Universal Login by Category — StayEase" },
      {
        name: "description",
        content: "Sign in to StayEase by category: Hotel Guest, Staff Operations, or Executive Administration.",
      },
    ],
  }),
  component: UnifiedCategorizedLoginPage,
});

type Category = "guest" | "staff" | "admin";

export function UnifiedCategorizedLoginPage() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [activeCategory, setActiveCategory] = useState<Category>("guest");

  // Guest State
  const [guestId, setGuestId] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  // Staff State
  const [staffRole, setStaffRole] = useState<RoleId>("reception");
  const [staffId, setStaffId] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Admin State
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  // 1. GUEST LOGIN HANDLER
  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = guestId.trim();
    if (!idClean || !guestPassword || guestLoading) return;

    setGuestLoading(true);
    setGuestError(null);

    try {
      const res = await guestLogin(idClean, guestPassword);
      setGuestToken(res.access_token);
      toast.success(`Welcome back, ${res.user.name || "Guest"}!`);
      void navigate({ to: "/guest/dashboard" });
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      setGuestError(apiErr.message || "Invalid guest identifier or reservation code.");
    } finally {
      setGuestLoading(false);
    }
  };

  const autoFillGuest = () => {
    setGuestId("aisha.r@stayease.com");
    setGuestPassword("stayease");
    setGuestError(null);
  };

  // 2. STAFF LOGIN HANDLER
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = staffId.trim();
    if (!idClean || !staffPassword || staffLoading) return;

    setStaffLoading(true);
    setStaffError(null);

    try {
      const res = await loginStaff(idClean, staffPassword, staffRole);
      setToken(res.access_token);
      login(staffRole, idClean, res.user);
      toast.success(`Welcome on duty, ${res.user.name}!`);
      void navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      setStaffError(apiErr.message || "Staff authentication failed. Check credentials or department.");
    } finally {
      setStaffLoading(false);
    }
  };

  const autoFillStaff = () => {
    setStaffRole("reception");
    setStaffId("sarah.m@stayease.com");
    setStaffPassword("password123");
    setStaffError(null);
  };

  // 3. ADMIN LOGIN HANDLER
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = adminId.trim();
    if (!idClean || !adminPassword || adminLoading) return;

    setAdminLoading(true);
    setAdminError(null);

    try {
      const res = await loginStaff(idClean, adminPassword, "admin");
      if (res.user.role !== "admin") {
        setAdminError(`Access Denied: Account lacks administrative privileges.`);
        return;
      }
      setToken(res.access_token);
      login("manager", idClean, res.user);
      toast.success(`Executive Console Unlocked: Welcome ${res.user.name}`);
      void navigate({ to: "/admin/dashboard" });
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      setAdminError(apiErr.message || "Administrative access denied.");
    } finally {
      setAdminLoading(false);
    }
  };

  const autoFillAdmin = () => {
    setAdminId("daniel.o@stayease.com");
    setAdminPassword("password123");
    setAdminError(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Header */}
      <header className="mx-auto w-full max-w-5xl flex items-center justify-between z-10">
        <Logo />
        <Link
          to="/"
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
        >
          All Portals <ArrowRight className="size-3" />
        </Link>
      </header>

      {/* Main Login Card */}
      <div className="mx-auto w-full max-w-lg z-10 my-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              Universal Hotel Gateway
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">Sign In by Category</h1>
            <p className="text-xs text-slate-400">
              Choose your role to access your dedicated StayEase environment.
            </p>
          </div>

          {/* Category Tabs */}
          <Tabs
            value={activeCategory}
            onValueChange={(val) => setActiveCategory(val as Category)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 bg-slate-950 p-1 rounded-2xl border border-slate-800 h-12">
              <TabsTrigger
                value="guest"
                className="rounded-xl text-xs font-bold data-[state=active]:bg-sky-500 data-[state=active]:text-white flex items-center gap-1.5"
              >
                <User className="size-3.5" /> Guest
              </TabsTrigger>
              <TabsTrigger
                value="staff"
                className="rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-1.5"
              >
                <ConciergeBell className="size-3.5" /> Staff
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 flex items-center gap-1.5"
              >
                <ShieldCheck className="size-3.5" /> Admin
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: GUEST LOGIN */}
            <TabsContent value="guest" className="space-y-4 mt-5">
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold block text-sky-200">Demo Guest (Room 512):</span>
                  <span className="text-[11px] text-sky-400">aisha.r@stayease.com</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={autoFillGuest}
                  className="h-8 rounded-xl border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 text-xs font-semibold"
                >
                  <Sparkles className="size-3 mr-1" /> Auto-Fill
                </Button>
              </div>

              {guestError && (
                <div className="rounded-2xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{guestError}</span>
                </div>
              )}

              <form onSubmit={handleGuestLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Email or Reservation Code
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      placeholder="e.g. aisha.r@stayease.com or RES-GST-9000"
                      className="h-11 rounded-xl pl-10 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm"
                      value={guestId}
                      onChange={(e) => setGuestId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 rounded-xl pl-10 pr-10 bg-slate-950 border-slate-800 text-slate-100 text-sm"
                      value={guestPassword}
                      onChange={(e) => setGuestPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={guestLoading || !guestId.trim() || !guestPassword}
                  className="w-full h-11 rounded-xl font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-md"
                >
                  {guestLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" /> Connecting to Room...
                    </>
                  ) : (
                    <>
                      Enter Guest Hub <ArrowRight className="size-4 ml-1.5" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center text-xs text-slate-400">
                  New reservation?{" "}
                  <Link to="/pre-register" className="text-sky-400 font-semibold hover:underline">
                    Digital Pre-Check-in here
                  </Link>
                </div>
              </form>
            </TabsContent>

            {/* TAB 2: STAFF LOGIN */}
            <TabsContent value="staff" className="space-y-4 mt-5">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold block text-slate-200">Demo Staff (Front Desk):</span>
                  <span className="text-[11px] text-slate-400">sarah.m@stayease.com (EMP-1002)</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={autoFillStaff}
                  className="h-8 rounded-xl border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold"
                >
                  <Sparkles className="size-3 mr-1" /> Auto-Fill
                </Button>
              </div>

              {staffError && (
                <div className="rounded-2xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{staffError}</span>
                </div>
              )}

              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Department</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["reception", "housekeeping", "maintenance", "fnb"] as RoleId[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setStaffRole(r)}
                        className={`h-9 rounded-xl text-xs font-bold capitalize transition-all border ${
                          staffRole === r
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {r === "fnb" ? "F&B" : r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Employee ID or Work Email
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      placeholder="e.g. sarah.m@stayease.com or EMP-1002"
                      className="h-11 rounded-xl pl-10 bg-slate-950 border-slate-800 text-slate-100 text-sm"
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 rounded-xl pl-10 pr-10 bg-slate-950 border-slate-800 text-slate-100 text-sm"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={staffLoading || !staffId.trim() || !staffPassword}
                  className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white transition-all shadow-md"
                >
                  {staffLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" /> Starting Shift...
                    </>
                  ) : (
                    <>
                      Begin Department Duty <ArrowRight className="size-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* TAB 3: ADMIN LOGIN */}
            <TabsContent value="admin" className="space-y-4 mt-5">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold block text-amber-200">Executive Account:</span>
                  <span className="text-[11px] text-amber-400">daniel.o@stayease.com (EMP-1001)</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={autoFillAdmin}
                  className="h-8 rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold"
                >
                  <Sparkles className="size-3 mr-1" /> Auto-Fill
                </Button>
              </div>

              {adminError && (
                <div className="rounded-2xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{adminError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Administrator ID or Email
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      placeholder="e.g. daniel.o@stayease.com"
                      className="h-11 rounded-xl pl-10 bg-slate-950 border-slate-800 text-slate-100 text-sm"
                      value={adminId}
                      onChange={(e) => setAdminId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 rounded-xl pl-10 pr-10 bg-slate-950 border-slate-800 text-slate-100 text-sm"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={adminLoading || !adminId.trim() || !adminPassword}
                  className="w-full h-11 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md"
                >
                  {adminLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" /> Verifying Clearance...
                    </>
                  ) : (
                    <>
                      Authenticate Executive Console <ArrowRight className="size-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-2 z-10">
        StayEase Smart Hotel Platform · Single Unified Frontend Architecture
      </footer>
    </main>
  );
}
