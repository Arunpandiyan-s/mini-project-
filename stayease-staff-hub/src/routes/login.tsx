import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";
import { roleName } from "@/lib/data";
import { useApp } from "@/lib/store";
import { loginStaff, setToken } from "@/lib/api";
import hotelImage from "@/assets/hotel-branding.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Staff Login — StayEase Staff Portal" },
      {
        name: "description",
        content: "Secure sign in for StayEase hotel staff and managers with role-based access.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { selectedRole, login } = useApp();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; general?: string }>({});

  const [popup, setPopup] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: { identifier?: string; password?: string } = {};
    const value = identifier.trim();
    if (!value) next.identifier = "Email, staff ID, or phone number is required";
    if (!password) next.password = "Password is required";
    else if (password.length < 6) next.password = "Password must be at least 6 characters";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);

    try {
      // Pass selected role to backend for role-mismatch validation
      // Backend normalises "manager" → "admin" internally
      const backendRole = selectedRole === "manager" ? "admin" : selectedRole ?? undefined;
      const response = await loginStaff(value, password, backendRole);

      // Store JWT before calling store.login() — buildSession reads it via getToken()
      setToken(response.access_token);

      // Update store with real staff data from backend
      const uiRole = selectedRole ?? "reception";
      login(uiRole, value, response.user);

      setPopup({
        open: true,
        type: "success",
        title: "Login Successful",
        message: `Welcome back, ${response.user.name}! Authenticated via StayEase backend.`,
      });
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      let msg = "Authentication failed. Please check your credentials.";
      if (apiErr?.status === 401) {
        msg = "Invalid identifier or password. Please try again.";
      } else if (apiErr?.status === 403) {
        msg = apiErr.message ?? "Account is suspended or role mismatch.";
      } else if (apiErr?.status === 422) {
        msg = apiErr.message ?? "Invalid request format. Please check your input.";
      } else if (apiErr?.message) {
        msg = apiErr.message;
      }
      setPopup({
        open: true,
        type: "error",
        title: "Authentication Failed",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePopupClose = () => {
    const isSuccess = popup.type === "success";
    setPopup((prev) => ({ ...prev, open: false }));
    if (isSuccess && typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src={hotelImage}
          alt="StayEase hotel lobby at golden hour"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-primary/70 via-primary/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-primary-foreground">
          <div className="h-px w-20 gold-line" />
          <h2 className="mt-6 text-3xl font-bold">Run the hotel, not the paperwork.</h2>
          <p className="mt-3 max-w-sm text-sm text-primary-foreground/85">
            Live tasks, room status and team coordination in one calm workspace.
          </p>
        </div>
      </div>

      <div className="hero-gradient flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Change department
          </Link>

          <div className="surface p-6 sm:p-8">
            <Logo />
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Signing in as
              </p>
              <h1 className="mt-1 text-2xl font-bold">{roleName(selectedRole)}</h1>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="identifier">Email, Staff ID, or Phone</Label>
                <Input
                  id="identifier"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="name@stayease.com or EMP-1001"
                  className="h-12 rounded-xl"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  aria-invalid={!!errors.identifier}
                />
                {errors.identifier && (
                  <p className="text-xs font-medium text-destructive">{errors.identifier}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="h-12 rounded-xl pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                    aria-label="Remember me"
                  />
                  Remember me
                </label>
              </div>

              <Button type="submit" className="h-12 w-full rounded-xl text-base font-bold" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? "Signing in..." : "Login"}
              </Button>
            </form>

            {/* Development Account Hint — identifiers only, no auto-password fill */}
            <div className="mt-6 pt-5 border-t border-border space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Development Accounts</span>
                <span className="text-[10px] text-primary font-bold">Use your dev password</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {selectedRole === "manager" && (
                  <button
                    type="button"
                    onClick={() => setIdentifier("daniel.o@stayease.com")}
                    className="p-3 rounded-xl bg-primary-soft hover:bg-primary/20 text-left border border-primary/30 font-bold sm:col-span-2 text-sm text-foreground flex items-center justify-between"
                  >
                    <span>👔 Daniel Okoye — daniel.o@stayease.com</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-black">ADMIN</span>
                  </button>
                )}
                {selectedRole === "housekeeping" && (
                  <div className="sm:col-span-2 p-2 rounded-lg bg-muted/50 border border-border/40 text-muted-foreground">
                    Click identifier to fill. Enter your development password separately.
                  </div>
                )}
                {selectedRole === "maintenance" && (
                  <div className="sm:col-span-2 p-2 rounded-lg bg-muted/50 border border-border/40 text-muted-foreground">
                    Use seeded staff credentials from the backend dev setup.
                  </div>
                )}
                {selectedRole === "reception" && (
                  <div className="sm:col-span-2 p-2 rounded-lg bg-muted/50 border border-border/40 text-muted-foreground">
                    Use seeded staff credentials from the backend dev setup.
                  </div>
                )}
                {selectedRole === "fnb" && (
                  <div className="sm:col-span-2 p-2 rounded-lg bg-muted/50 border border-border/40 text-muted-foreground">
                    Use seeded staff credentials from the backend dev setup.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Result Dialog */}
      <Dialog open={popup.open} onOpenChange={(val) => !val && handlePopupClose()}>
        <DialogContent className="w-[92vw] max-w-sm rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="space-y-3 text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              {popup.type === "success" ? (
                <div className="grid size-12 place-items-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="size-6 shrink-0" />
                </div>
              ) : (
                <div className="grid size-12 place-items-center rounded-full bg-destructive/15 text-destructive">
                  <AlertTriangle className="size-6 shrink-0" />
                </div>
              )}
            </div>
            <DialogTitle className="text-xl font-bold font-display">{popup.title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-foreground/80 font-medium">
              {popup.message}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              className={`h-11 w-full rounded-xl font-bold text-sm ${
                popup.type === "success"
                  ? "bg-primary text-primary-foreground"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }`}
              onClick={handlePopupClose}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
