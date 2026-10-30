import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Hotel, Loader2, Mail } from "lucide-react";
import hero from "@/assets/hotel-hero.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPopup, type AuthPopupConfig } from "@/components/ui/AuthPopup";
import { apiForgotPassword } from "@/lib/api";

export const Route = createFileRoute("/guest/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password: StayEase Guest Portal" },
      {
        name: "description",
        content: "Reset your StayEase Guest Portal password.",
      },
    ],
  }),
  component: ForgotPasswordScreen,
});

function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [popup, setPopup] = useState<AuthPopupConfig>({
    open: false,
    title: "",
    message: "",
    variant: "info",
    onClose: () => { },
  });

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;

    setLoading(true);

    try {
      const response = await apiForgotPassword(email);
      setLoading(false);

      if (response.success) {
        setPopup({
          open: true,
          title: "Password Reset Requested",
          message: `If an account exists for ${email}, a password reset link has been dispatched.`,
          variant: "success",
          actionText: "Back to Login",
          onClose: () => setPopup((p) => ({ ...p, open: false })),
        });
      } else {
        setPopup({
          open: true,
          title: "Reset Request Failed",
          message: response.error || "Unable to send reset instructions. Please try again.",
          variant: "error",
          actionText: "Close",
          onClose: () => setPopup((p) => ({ ...p, open: false })),
        });
      }
    } catch {
      setLoading(false);
      setPopup({
        open: true,
        title: "Network Error",
        message: "Unable to connect to the reset service.",
        variant: "error",
        actionText: "Close",
        onClose: () => setPopup((p) => ({ ...p, open: false })),
      });
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <div className="relative h-48 overflow-hidden rounded-b-[2rem]">
        <img
          src={hero}
          alt="Hotel Lobby"
          width={1024}
          height={1280}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-foreground/20" />
        <Link
          to="/"
          className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/30 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center text-center text-primary-foreground">
          <span className="grid h-10 w-10 place-items-center rounded-xl gradient-gold text-gold-foreground">
            <Hotel className="h-5 w-5" />
          </span>
          <p className="mt-1 text-xs uppercase tracking-[0.3em]">Password Recovery</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-6">
        <h1 className="text-center text-2xl font-semibold">Forgot Password?</h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Enter your registered email address and we'll send reset instructions.
        </p>

        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="aisha@example.com"
                className="h-12 rounded-xl pl-10 text-sm"
              />
            </div>
          </div>

          <Button type="submit" variant="hero" size="xl" className="w-full mt-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Sending link…" : "Send reset instructions"}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Remembered password?{" "}
          <Link to="/" className="font-semibold text-primary underline">
            Back to login
          </Link>
        </div>
      </div>

      <AuthPopup {...popup} />
    </main>
  );
}
