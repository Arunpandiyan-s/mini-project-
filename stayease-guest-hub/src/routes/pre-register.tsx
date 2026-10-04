import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/pre-register")({
  head: () => ({
    meta: [
      { title: "Pre-Registration — StayEase" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PreRegisterRedirect,
});

/**
 * Pre-registration through the guest portal is not connected to the backend in Phase 8.
 * This route redirects to the login page with a single informational toast.
 * The ref guard prevents the toast from firing more than once in React StrictMode.
 */
function PreRegisterRedirect() {
  const navigate = useNavigate();
  const toastFired = useRef(false);

  useEffect(() => {
    if (toastFired.current) return;
    toastFired.current = true;

    toast.info(
      "Pre-registration is handled by the hotel. Please contact reception to set up your stay.",
      { duration: 6000 }
    );

    navigate({ to: "/", replace: true });
  }, [navigate]);

  return null;
}