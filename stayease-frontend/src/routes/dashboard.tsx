import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Staff Dashboard — StayEase Staff Portal" },
      {
        name: "description",
        content:
          "Role-based hotel operations dashboard: duty status, live tasks, rooms, requests and analytics.",
      },
      { property: "og:title", content: "Staff Dashboard — StayEase Staff Portal" },
      {
        property: "og:description",
        content: "Live hotel operations for staff and managers on any device.",
      },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { session } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!session) void navigate({ to: "/" });
    }, 400);
    return () => clearTimeout(timer);
  }, [session, navigate]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
