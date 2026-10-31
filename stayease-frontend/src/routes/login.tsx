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
import { toast } from "sonner";
import type { RoleId } from "@/lib/data";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Universal Login by Category: StayEase" },
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
    setGuestId("aisha.rahman@example.com");
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
        setAdminError("Access Denied: Account lacks administrative privileges.");
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
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative">
      {/* Header */}
      <header className="mx-auto w-full max-w-5xl flex items-center justify-between z-10">
        <Logo />
        <Link
          to="/"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          Portal Overview <ArrowRight className="size-3" />
        </Link>
      </header>

      {/* Main Login Card */}
      <div className="mx-auto w-full max-w-md z-10 my-8">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lift space-y-6">
          <div className="space-y-1 text-center">
            <span className="text-[10px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
              Universal Access Gateway
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-2">
              Sign In by Category
            </h1>
            <p className="text-xs text-muted-foreground">
              Select your role category to access your dedicated workspace.
            </p>
          </div>

          {/* Category Tabs */}
          <Tabs
            value={activeCategory}
            onValueChange={(val) => setActiveCategory(val as Category)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 bg-secondary/80 p-1 rounded-xl border border-border/60 h-10">
              <TabsTrigger
                value="guest"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs flex items-center gap-1.5"
              >
                <User className="size-3.5 text-sky-500" /> Guest
              </TabsTrigger>
              <TabsTrigger
                value="staff"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs flex items-center gap-1.5"
              >
                <ConciergeBell className="size-3.5 text-primary" /> Staff
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs flex items-center gap-1.5"
              >
                <ShieldCheck className="size-3.5 text-amber-500" /> Admin
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: GUEST LOGIN */}
            <TabsContent value="guest" className="space-y-4 mt-5">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold block text-sky-700 dark:text-sky-300">
                    Demo Guest (Room 512):
                  </span>
                  <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400">
                    aisha.r@stayease.com
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={autoFillGuest}
                  className="h-7 rounded-md border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 text-xs font-semibold"
                >
                  <Sparkles className="size-3 mr-1 text-sky-500" /> Auto-Fill
                </Button>
              </div>

              {guestError && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{guestError}</span>
                </div>
              )}

              <form onSubmit={handleGuestLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Email or Reservation Code
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. aisha.r@stayease.com"
                      value={guestId}
                      onChange={(e) => setGuestId(e.target.value)}
                      className="pl-9 h-10 rounded-lg text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">Password</Label>
                    <Link
                      to="/guest/forgot-password"
                      className="text-[11px] text-primary hover:underline"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={guestPassword}
                      onChange={(e) => setGuestPassword(e.target.value)}
                      className="pl-9 pr-9 h-10 rounded-lg text-xs font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={guestLoading}
                  className="w-full h-10 rounded-lg font-semibold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-xs flex items-center justify-center gap-2"
                >
                  {guestLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="size-3.5" /> Enter Guest Hub
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-2 text-center text-xs text-muted-foreground space-y-1">
                <p>
                  Checking in for the first time?{" "}
                  <Link to="/pre-register" className="text-primary font-semibold hover:underline">
                    Digital Pre-Registration
                  </Link>
                </p>
              </div>
            </TabsContent>

            {/* TAB 2: STAFF OPERATIONS LOGIN */}
            <TabsContent value="staff" className="space-y-4 mt-5">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold block text-primary">
                    Demo Reception Staff:
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    sarah.m@stayease.com
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={autoFillStaff}
                  className="h-7 rounded-md border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold"
                >
                  <Sparkles className="size-3 mr-1 text-primary" /> Auto-Fill
                </Button>
              </div>

              {staffError && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{staffError}</span>
                </div>
              )}

              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Department Duty Role
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "reception", label: "Front Desk" },
                      { id: "housekeeping", label: "Housekeeping" },
                      { id: "maintenance", label: "Maintenance" },
                      { id: "fnb", label: "Food & Beverage" },
                    ].map((dept) => (
                      <button
                        type="button"
                        key={dept.id}
                        onClick={() => setStaffRole(dept.id as RoleId)}
                        className={`p-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                          staffRole === dept.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:bg-accent/60"
                        }`}
                      >
                        {dept.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Staff ID or Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. sarah.m@stayease.com"
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      className="pl-9 h-10 rounded-lg text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      className="pl-9 pr-9 h-10 rounded-lg text-xs font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={staffLoading}
                  className="w-full h-10 rounded-lg font-semibold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs flex items-center justify-center gap-2"
                >
                  {staffLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <ConciergeBell className="size-3.5" /> Start Shift Duty
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* TAB 3: EXECUTIVE ADMIN LOGIN */}
            <TabsContent value="admin" className="space-y-4 mt-5">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold block text-amber-800 dark:text-amber-300">
                    Demo Administrator:
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    daniel.o@stayease.com
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={autoFillAdmin}
                  className="h-7 rounded-md border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold"
                >
                  <Sparkles className="size-3 mr-1 text-amber-500" /> Auto-Fill
                </Button>
              </div>

              {adminError && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{adminError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Administrator ID or Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. daniel.o@stayease.com"
                      value={adminId}
                      onChange={(e) => setAdminId(e.target.value)}
                      className="pl-9 h-10 rounded-lg text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Master Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="pl-9 pr-9 h-10 rounded-lg text-xs font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full h-10 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs flex items-center justify-center gap-2"
                >
                  {adminLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="size-3.5" /> Unlock Executive Console
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-5xl text-center text-xs text-muted-foreground py-2 z-10">
        StayEase Security Protocol · TLS 1.3 / HMAC-SHA256 Token Protection
      </footer>
    </main>
  );
}
