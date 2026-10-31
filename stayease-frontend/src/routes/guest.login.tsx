import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Hotel,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  CalendarCheck,
  UserPlus,
  ShieldAlert,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { AuthPopup, type AuthPopupConfig } from "@/components/ui/AuthPopup";
import { guestLogin, setGuestToken, getGuestToken, getGuestMe, removeGuestToken } from "@/lib/api";

export const Route = createFileRoute("/guest/login")({
  head: () => ({
    meta: [
      { title: "Guest Sign In: StayEase Luxury Guest Portal" },
      {
        name: "description",
        content:
          "Sign in to the StayEase Guest Portal for digital room key, in-room controls, 24/7 concierge, and hotel services.",
      },
    ],
  }),
  component: GuestLoginPage,
});

function GuestLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [popup, setPopup] = useState<AuthPopupConfig>({
    open: false,
    title: "",
    message: "",
    variant: "info",
    onClose: () => {},
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      setRestoring(false);
      return;
    }

    window.localStorage.removeItem("stayease_auth_token");
    const token = getGuestToken();
    if (!token) {
      setRestoring(false);
      return;
    }

    getGuestMe()
      .then(() => {
        navigate({ to: "/guest/dashboard" });
      })
      .catch(() => {
        removeGuestToken();
        setRestoring(false);
      });
  }, [navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await guestLogin(cleanEmail, password);
      setGuestToken(response.access_token);
      setLoading(false);

      setPopup({
        open: true,
        title: "Welcome to StayEase",
        message: `Welcome back, ${response.user.name}! Connecting you to your hotel suite...`,
        variant: "success",
        actionText: "Enter Guest Hub",
        autoCloseMs: 1200,
        onClose: () => {
          setPopup((p) => ({ ...p, open: false }));
          navigate({ to: "/guest/dashboard" });
        },
      });
    } catch (err: unknown) {
      setLoading(false);
      const apiErr = err as { status?: number; message?: string };
      let msg = "Authentication failed. Please verify your guest email and password.";
      if (apiErr?.status === 401) {
        msg = "Invalid email or password. Please verify your credentials or pre-register.";
      } else if (apiErr?.status === 403) {
        msg = apiErr.message ?? "Your account does not have an active hotel stay at this time.";
      } else if (apiErr?.message) {
        msg = apiErr.message;
      }
      setError(msg);
    }
  };

  const fillDemoGuest = () => {
    setEmail("aisha.rahman@example.com");
    setPassword("stayease");
    setError(null);
  };

  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-x-hidden">
      {/* Decorative ambient gradients */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-sky-500/10 blur-3xl opacity-70" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-amber-500/10 blur-3xl opacity-70" />
      </div>

      {/* Top Header */}
      <header className="mx-auto w-full max-w-5xl flex items-center justify-between z-10">
        <Logo />
        <Link
          to="/"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          Portal Overview <ArrowRight className="size-3" />
        </Link>
      </header>

      {/* Main Luxury Guest Card */}
      <div className="mx-auto w-full max-w-md z-10 my-8">
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <div className="inline-grid size-14 place-items-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-500 shadow-inner mb-1">
              <Hotel className="size-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Compass className="size-3" /> Guest Experience Portal
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Welcome to StayEase
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Access your digital room key, in-room amenities, and 24/7 AI concierge.
            </p>
          </div>

          {/* Quick Demo Guest Auto-Fill */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-500/5 border border-sky-500/20 text-xs">
            <div>
              <span className="font-semibold block text-foreground">Demo Guest Stay:</span>
              <span className="text-[11px] text-muted-foreground">aisha.rahman@example.com (Room 512)</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={fillDemoGuest}
              className="h-8 rounded-xl border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 text-xs font-semibold"
            >
              <Sparkles className="size-3 mr-1 text-sky-500" /> Auto-Fill
            </Button>
          </div>

          {/* Error notice */}
          {error && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
              <ShieldAlert className="size-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="guest-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Guest Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="guest-email"
                  type="email"
                  placeholder="e.g. aisha.rahman@example.com"
                  className="h-12 rounded-xl pl-10 text-sm bg-background/50 border-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="guest-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <Link to="/guest/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="guest-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 rounded-xl pl-10 pr-10 text-sm bg-background/50 border-input"
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
              disabled={loading || !email.trim() || !password}
              className="w-full h-12 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Accessing Guest Suite...
                </>
              ) : (
                <>
                  Enter Guest Portal <ArrowRight className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          {/* Secondary Actions */}
          <div className="pt-4 border-t border-border/60 grid grid-cols-2 gap-2 text-center text-xs">
            <Link
              to="/pre-register"
              className="p-2.5 rounded-xl border border-border/80 hover:bg-accent hover:text-accent-foreground transition flex items-center justify-center gap-1.5 font-medium"
            >
              <CalendarCheck className="size-3.5 text-primary" /> Pre-Register Stay
            </Link>
            <Link
              to="/guest/register"
              className="p-2.5 rounded-xl border border-border/80 hover:bg-accent hover:text-accent-foreground transition flex items-center justify-center gap-1.5 font-medium"
            >
              <UserPlus className="size-3.5 text-sky-500" /> Create Account
            </Link>
          </div>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition underline">
              Staff or Executive Admin? Sign in here
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-5xl text-center text-xs text-muted-foreground py-2 z-10">
        StayEase Smart Hotel Platform · Luxury Guest Services & Operations
      </footer>

      <AuthPopup {...popup} />
    </main>
  );
}
