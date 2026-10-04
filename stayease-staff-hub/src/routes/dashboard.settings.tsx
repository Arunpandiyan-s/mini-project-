import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SectionHeader } from "@/components/Primitives";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

const OPTIONS = [
  "Push notifications",
  "Task sound alerts",
  "Shift reminders",
  "Emergency broadcasts",
];

function SettingsPage() {
  const { session } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.role === "housekeeping") {
      void navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  if (session?.role === "housekeeping") return null;

  return (
    <div>
      <SectionHeader title="Settings" subtitle="Preferences for this device" />
      <div className="surface divide-y divide-border overflow-hidden">
        {OPTIONS.map((o, i) => (
          <label key={o} className="flex min-h-16 items-center justify-between gap-4 p-4">
            <span className="min-w-0 truncate text-sm font-medium">{o}</span>
            <Switch defaultChecked={i !== 1} onCheckedChange={() => toast.success(`${o} updated`)} />
          </label>
        ))}
      </div>
      <Button
        variant="secondary"
        className="mt-4 h-12 w-full rounded-xl"
        onClick={() => toast.success("Preferences saved")}
      >
        Save preferences
      </Button>
    </div>
  );
}
