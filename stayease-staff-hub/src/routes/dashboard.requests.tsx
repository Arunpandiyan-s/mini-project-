import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequestLogsPanel } from "@/components/RequestLogsPanel";
import { SectionHeader } from "@/components/Primitives";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard/requests")({
  component: RequestsPage,
});

function RequestsPage() {
  const { session } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.role === "housekeeping" || session?.role === "fnb") {
      void navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  if (session?.role === "housekeeping" || session?.role === "fnb") return null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Requests & Service Activity Logs" subtitle="Live activity log feed of guest requests and staff assignments" />
      <RequestLogsPanel />
    </div>
  );
}
