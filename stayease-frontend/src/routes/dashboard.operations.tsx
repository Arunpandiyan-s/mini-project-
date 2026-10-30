import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OperationsMonitoringPanel } from "@/components/OperationsMonitoringPanel";
import { SectionHeader } from "@/components/Primitives";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard/operations")({
  component: OperationsPage,
});

function OperationsPage() {
  const { session } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.role === "housekeeping") {
      void navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  if (session?.role === "housekeeping") {
    return null;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Operations Monitoring & Coordination"
        subtitle="Central operational monitoring for Housekeeping, Maintenance, and Room Readiness"
      />
      <OperationsMonitoringPanel />
    </div>
  );
}
