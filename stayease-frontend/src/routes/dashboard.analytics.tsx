import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  OccupancyChart,
  TaskCompletionChart,
  ResponseTimeChart,
  SatisfactionChart,
  WorkloadChart,
  ProductivityChart,
} from "@/components/Charts";
import { SectionHeader } from "@/components/Primitives";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { session } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (session && session.role !== "manager") {
      void navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  if (session?.role !== "manager") return null;
  return (
    <div>
      <SectionHeader title="Analytics" subtitle="Operational performance over the last 7 days" />
      <div className="grid gap-4 xl:grid-cols-2">
        <OccupancyChart />
        <TaskCompletionChart />
        <ResponseTimeChart />
        <SatisfactionChart />
        <WorkloadChart />
        <ProductivityChart />
      </div>
    </div>
  );
}
