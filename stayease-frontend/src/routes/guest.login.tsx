import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Hotel, Loader2, Lock, Mail, Sparkles, UserPlus, CalendarCheck } from "lucide-react";
import hero from "@/assets/hotel-hero.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPopup, type AuthPopupConfig } from "@/components/ui/AuthPopup";
import { guestLogin, setGuestToken, getGuestToken, getGuestMe, removeGuestToken } from "@/lib/api";

export const Route = createFileRoute("/guest/login")({
  head: () => ({
    meta: [
      { title: "Guest Sign In — StayEase Guest Portal" },
      {
        name: "description",
        content:
          "Sign in to the StayEase Guest Portal to access digital check-in, room controls, concierge, and hotel services.",
      },
    ],
  }),
  component: GuestLoginPage,
});

function GuestLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const [popup, setPopup] = useState<AuthPopupConfig>({
    open: false,
    title: "",
    message: "",
    variant: "info",
    onClose: () => { },
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
    if (!email.trim() || !password || loading) return;

    setLoading(true);

    try {
      const response = await guestLogin(email.trim(), password);
      setGuestToken(response.access_token);
      setLoading(false);

      setPopup({
        open: true,
        title: "Welcome to StayEase",
        message: `Welcome back, ${response.user.name}! Connecting you to your hotel suite...`,
        variant: "success",
        actionText: "Enter Guest Hub",
        autoCloseMs: 1500,
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
        msg = "Invalid email or password. Please check your credentials or register.";
      } else if (apiErr?.status === 403) {
        msg = apiErr.message ?? "Your account does not have an active hotel stay at this time.";
      } else if (apiErr?.message) {
        msg = apiErr.message;
      }
      setPopup({
        open: true,
        title: "Sign In Failed",
        message: msg,
        variant: "error",
        actionText: "Try Again",
        onClose: () => setPopup((p) => ({ ...p, open: false })),
      });
    }
  };

  const fillDemoGuest = () => {
    setEmail("aisha.rahman@example.com");
    setPassword("stayease");
  };

  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Hero section */}
      <div className="relative h-64 shrink-0 overflow-hidden sm:h-72">
        <img src={hero} alt="StayEase hotel suite" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-5 text-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md border border-white/20">
              <Hotel className="size-4 text-amber-300" />
              <span className="text-sm font-bold text-white tracking-wide">StayEase Guest Experience</span>
            </div>
            <p className="mt-2 text-xs text-white/80 font-medium">Digital Concierge · Room Services · Seamless Stay</p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto w-full max-w-md flex-1 px-5 pt-4 pb-10">
        {/* Navigation tabs */}
        <div className="grid grid-cols-3 gap-2 mb-4 bg-muted/60 p-1 rounded-2xl border border-border/40 text-xs font-semibold">
          <button
            type="button"
            className="py-2 rounded-xl bg-card text-foreground shadow-xs text-center font-bold"
          >
            Guest Login
          </button>
          <Link
            to="/pre-register"
            className="py-2 rounded-xl text-muted-foreground hover:text-foreground text-center transition-colors flex items-center justify-center gap-1"
          >
            <CalendarCheck className="size-3.5" /> Pre-Register
          </Link>
          <Link
            to="/register"
            className="py-2 rounded-xl text-muted-foreground hover:text-foreground text-center transition-colors flex items-center justify-center gap-1"
          >
            <UserPlus className="size-3.5" /> Sign Up
          </Link>
        </div>

        {/* Login Card */}
        <div className="card-surface p-6 shadow-sm border border-border/80 rounded-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Guest Sign In</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your registered guest email to access your stay.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={fillDemoGuest}
              className="text-xs h-8 rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              title="Click to fill Aisha Rahman (Room 512)"
            >
              <Sparkles className="size-3 mr-1" /> Demo Guest
            </Button>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="guest-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="guest-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="aisha.rahman@example.com"
                  className="h-12 rounded-xl pl-10 text-sm"
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
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="guest-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 rounded-xl pl-10 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="mt-2 h-12 w-full rounded-xl text-sm font-bold shadow-md"
              disabled={loading || !email.trim() || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                "Sign In to Guest Portal"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/50 flex flex-col gap-2.5 text-center text-xs text-muted-foreground">
            <div>
              Arriving soon?{" "}
              <Link to="/pre-register" className="text-primary font-bold hover:underline">
                Complete Digital Pre-Registration
              </Link>
            </div>
            <div>
              New guest?{" "}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Create a Guest Account
              </Link>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          StayEase Smart Hotel Platform · Guest Services & In-Room Experience
        </p>
      </div>

      <AuthPopup {...popup} />
    </main>
  );
}
