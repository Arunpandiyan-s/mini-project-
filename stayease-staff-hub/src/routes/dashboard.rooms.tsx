import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FloorWiseRoomGrid } from "@/components/FloorWiseRoomGrid";
import { SectionHeader } from "@/components/Primitives";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/dashboard/rooms")({
  component: RoomsPage,
});

function RoomsPage() {
  const { session } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.role === "housekeeping" || session?.role === "fnb") {
      void navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  if (session?.role === "housekeeping" || session?.role === "fnb") {
    return null;
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Room Availability - Floor Wise" subtitle="Floor-wise interactive room control matrix and quick actions" />
      <FloorWiseRoomGrid />
    </div>
  );
}
