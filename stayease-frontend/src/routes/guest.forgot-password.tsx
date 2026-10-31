import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Hotel, Loader2, Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
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
  const [error, setError] = useState<string | null>(null);

  const [popup, setPopup] = useState<AuthPopupConfig>({
    open: false,
    title: "",
    message: "",
    variant: "info",
    onClose: () => {},
  });

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiForgotPassword(email.trim());
      setLoading(false);

      if (response.success) {
        setPopup({
          open: true,
          title: "Password Reset Requested",
          message: `If an account exists for ${email}, reset instructions have been sent.`,
          variant: "success",
          actionText: "Back to Login",
          onClose: () => setPopup((p) => ({ ...p, open: false })),
        });
      } else {
        setError(response.error || "Unable to send reset instructions. Please try again.");
      }
    } catch {
      setLoading(false);
      setError("Unable to connect to the authentication service.");
    }
  };

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
          to="/guest/login"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="size-3" /> Back to Guest Login
        </Link>
      </header>

      {/* Main Card */}
      <div className="mx-auto w-full max-w-md z-10 my-8">
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-grid size-14 place-items-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-inner mb-1">
              <Hotel className="size-7" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Reset Your Password
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Enter your registered guest email address and we'll send you recovery instructions.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
              <ShieldAlert className="size-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. aisha.rahman@example.com"
                  className="h-12 rounded-xl pl-10 text-sm bg-background/50 border-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-12 rounded-xl font-bold text-sm shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Sending Link...
                </>
              ) : (
                <>
                  Send Reset Instructions <ArrowRight className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-2 border-t border-border/60">
            <Link to="/guest/login" className="text-xs text-primary hover:underline font-semibold">
              Remember your password? Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-5xl text-center text-xs text-muted-foreground py-2 z-10">
        StayEase Smart Hotel Platform · Account Recovery
      </footer>

      <AuthPopup {...popup} />
    </main>
  );
}
