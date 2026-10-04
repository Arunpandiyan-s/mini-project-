import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Hotel, Loader2, Lock, Mail } from "lucide-react";
import hero from "@/assets/hotel-hero.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPopup, type AuthPopupConfig } from "@/components/ui/AuthPopup";
import { guestLogin, setGuestToken, getGuestToken, getGuestMe, removeGuestToken } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StayEase Guest Portal — Your Stay, Simplified" },
      {
        name: "description",
        content:
          "Sign in to the StayEase Guest Portal to request services, order in-room dining and manage your hotel stay from your phone.",
      },
      { property: "og:title", content: "StayEase Guest Portal — Your Stay, Simplified" },
      {
        property: "og:description",
        content: "Hotel services, dining and requests in one simple guest app.",
      },
    ],
  }),
  component: WelcomeScreen,
});

function WelcomeScreen() {
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

  // Restore session from JWT on mount
  // Only a valid GET /api/guest-auth/me response allows dashboard access
  useEffect(() => {
    if (typeof window === "undefined") {
      setRestoring(false);
      return;
    }

    // Clean up old legacy session keys
    window.localStorage.removeItem("stayease_auth_token");

    const token = getGuestToken();
    if (!token) {
      setRestoring(false);
      return;
    }

    getGuestMe()
      .then(() => {
        // Token is valid — redirect to dashboard without showing login
        navigate({ to: "/dashboard" });
      })
      .catch(() => {
        // Token invalid or expired — clear and show login
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
        title: "Login Successful",
        message: `Welcome back, ${response.user.name}! Redirecting to your dashboard...`,
        variant: "success",
        actionText: "Go to Dashboard",
        autoCloseMs: 1500,
        onClose: () => {
          setPopup((p) => ({ ...p, open: false }));
          navigate({ to: "/dashboard" });
        },
      });
    } catch (err: unknown) {
      setLoading(false);
      const apiErr = err as { status?: number; message?: string };
      let msg = "Authentication failed. Please check your credentials.";
      if (apiErr?.status === 401) {
        msg = "Invalid email or password. Please try again.";
      } else if (apiErr?.status === 403) {
        msg = apiErr.message ?? "Your account does not have an active hotel stay at this time.";
      } else if (apiErr?.message) {
        msg = apiErr.message;
      }
      setPopup({
        open: true,
        title: "Login Failed",
        message: msg,
        variant: "error",
        actionText: "Try Again",
        onClose: () => setPopup((p) => ({ ...p, open: false })),
      });
    }
  };

  // Show nothing while checking existing session to avoid flash
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
      <div className="relative h-72 shrink-0 overflow-hidden sm:h-80">
        <img src={hero} alt="StayEase hotel lobby" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-background" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-6 text-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
              <Hotel className="size-5 text-white" />
              <span className="text-sm font-bold text-white tracking-wide">StayEase Guest Portal</span>
            </div>
            <p className="mt-2 text-xs text-white/70">Your stay, simplified</p>
          </div>
        </div>
      </div>

      {/* Login card */}
      <div className="mx-auto w-full max-w-sm flex-1 px-5 pt-8 pb-10">
        <div className="card-surface p-6">
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your hotel guest credentials to access your room services.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="guest@example.com"
                  className="h-12 rounded-xl pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="h-12 rounded-xl pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="mt-2 h-12 w-full rounded-xl text-base font-semibold"
              disabled={loading || !email.trim() || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground leading-relaxed space-y-1">
            <p>
              Don't have an account?{" "}
              <a href="/register" className="text-primary font-semibold hover:underline">
                Create Account
              </a>
            </p>
            <p className="text-[11px] opacity-75">
              Credentials are also provided at check-in by front desk.
            </p>
          </div>
        </div>
      </div>

      <AuthPopup {...popup} />
    </main>
  );
}
