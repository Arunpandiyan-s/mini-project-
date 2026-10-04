import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TaskCard } from "@/components/TaskCard";
import { SectionHeader } from "@/components/Primitives";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import type { TaskStatus } from "@/lib/data";

export const Route = createFileRoute("/dashboard/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { tasks, session } = useApp();
  const navigate = useNavigate();
  const isReception = session?.role === "reception";
  const filters = isReception
    ? ["All", "Pending", "Accepted", "In Progress", "Attention Needed"]
    : ["All", "Pending", "In Progress", "Completed", "Attention Needed"];

  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    if (session?.role === "housekeeping") {
      void navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  if (session?.role === "housekeeping") return null;

  // Filter tasks based on role. Managers see all. Reception sees only reception.
  const scoped = session?.role === "manager" ? tasks : tasks.filter((t) => t.role === session?.role);
  const visible = filter === "All" ? scoped : scoped.filter((t) => t.status === filter);

  return (
    <div>
      <SectionHeader title="Tasks" subtitle="All tasks assigned to you today" />
      <div className="flex gap-2 overflow-x-auto pb-4">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {visible.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
        {visible.length === 0 && (
          <p className="surface p-8 text-center text-sm text-muted-foreground">No tasks here.</p>
        )}
      </div>
    </div>
  );
}
