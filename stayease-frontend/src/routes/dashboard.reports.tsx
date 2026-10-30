import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionHeader, StatCard } from "@/components/Primitives";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { session, auditLog } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (session && session.role !== "manager") {
      void navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  if (session?.role !== "manager") return null;
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Reports"
        subtitle="Daily operations summary"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" className="h-11 rounded-xl" onClick={() => toast.success("Daily report generated")}>
              <FileText className="size-4" /> Generate
            </Button>
            <Button className="h-11 rounded-xl" onClick={() => toast.success("Report exported as PDF")}>
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tasks completed" value={140} trend={{ value: "+9.4%", up: true }} />
        <StatCard label="Avg response" value="7.1 min" tone="gold" trend={{ value: "-0.8 min", up: true }} />
        <StatCard label="Occupancy" value="82%" tone="success" />
        <StatCard label="Guest rating" value="4.6" tone="gold" />
      </div>
      <section className="surface p-5">
        <h2 className="text-lg font-semibold">Activity & audit log</h2>
        <div className="mt-4 space-y-4">
          {auditLog.map((l) => (
            <div key={l.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{l.action}</p>
                <p className="text-sm text-muted-foreground">{l.detail}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {l.by} · {l.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
