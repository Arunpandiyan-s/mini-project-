import { useState, useMemo } from "react";
import { Users, CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";

export type StaffMemberAvailability = {
  id: string;
  name: string;
  department: "Reception" | "Housekeeping" | "Maintenance" | "Food & Beverage" | "Management";
  role: string;
  status: "Working" | "Leave the duty";
  shift: string;
};

// Initial default staff pool including names from user request and active system staff
const INITIAL_STAFF_MEMBERS: StaffMemberAvailability[] = [
  { id: "S-1", name: "Harish", department: "Housekeeping", role: "Cleaner", status: "Working", shift: "08:00 - 16:00" },
  { id: "S-2", name: "Vijay", department: "Maintenance", role: "Electrician", status: "Working", shift: "06:00 - 14:00" },
  { id: "S-3", name: "Dinesh", department: "Food & Beverage", role: "Server", status: "Leave the duty", shift: "10:00 - 18:00" },
  { id: "S-4", name: "Austin", department: "Reception", role: "Front Desk", status: "Working", shift: "07:00 - 15:00" },
  { id: "S-5", name: "Keerthi", department: "Housekeeping", role: "Supervisor", status: "Working", shift: "08:00 - 16:00" },
  { id: "S-6", name: "Anita Sharma", department: "Reception", role: "Receptionist", status: "Working", shift: "07:00 - 15:00" },
  { id: "S-7", name: "Ravi Kumar", department: "Maintenance", role: "Technician", status: "Working", shift: "06:00 - 14:00" },
  { id: "S-8", name: "Grace Okafor", department: "Housekeeping", role: "Senior Cleaner", status: "Working", shift: "08:00 - 16:00" },
  { id: "S-9", name: "Samuel Tetteh", department: "Maintenance", role: "Plumber", status: "Leave the duty", shift: "14:00 - 22:00" },
  { id: "S-10", name: "Mei Tanaka", department: "Food & Beverage", role: "Chef", status: "Working", shift: "10:00 - 18:00" },
  { id: "S-11", name: "Laura Fernandes", department: "Housekeeping", role: "Attendant", status: "Leave the duty", shift: "08:00 - 16:00" },
  { id: "S-12", name: "Omar Haddad", department: "Reception", role: "Concierge", status: "Leave the duty", shift: "15:00 - 23:00" },
];

export function StaffAvailabilityWheel() {
  const { staff: systemStaff } = useApp();
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [hoveredStaffId, setHoveredStaffId] = useState<string | null>(null);

  // Sync with store state if available, or fallback to full initial pool
  const staffList: StaffMemberAvailability[] = useMemo(() => {
    if (systemStaff && systemStaff.length > 0) {
      // Map system staff to availability format
      const systemMapped = systemStaff.map((s) => ({
        id: s.id,
        name: s.name,
        department: (s.role === "reception"
          ? "Reception"
          : s.role === "housekeeping"
          ? "Housekeeping"
          : s.role === "maintenance"
          ? "Maintenance"
          : s.role === "fnb"
          ? "Food & Beverage"
          : "Management") as StaffMemberAvailability["department"],
        role: s.role,
        status: (s.duty === "On Duty" ? "Working" : "Leave the duty") as StaffMemberAvailability["status"],
        shift: s.shift,
      }));

      // Combine with user specific names if not present
      const extraUserNames = INITIAL_STAFF_MEMBERS.filter(
        (m) => !systemMapped.some((sm) => sm.name.toLowerCase() === m.name.toLowerCase())
      );
      return [...INITIAL_STAFF_MEMBERS.slice(0, 5), ...systemMapped, ...extraUserNames.slice(5)];
    }
    return INITIAL_STAFF_MEMBERS;
  }, [systemStaff]);

  // Filtered by department
  const filteredList = useMemo(() => {
    if (selectedDept === "All") return staffList;
    return staffList.filter((s) => s.department === selectedDept);
  }, [staffList, selectedDept]);

  const total = filteredList.length;
  const workingCount = filteredList.filter((s) => s.status === "Working").length;
  const leaveCount = filteredList.filter((s) => s.status === "Leave the duty").length;
  const workingPct = total > 0 ? Math.round((workingCount / total) * 100) : 0;

  // SVG Geometry Dimensions
  const svgWidth = 600;
  const svgHeight = 440;
  const cx = svgWidth / 2;
  const cy = svgHeight / 2;
  const rOut = 110;
  const rIn = 80;

  return (
    <div className="surface p-5 sm:p-6 space-y-6">
      {/* Header & Department Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="size-5 text-primary shrink-0" /> Staff Availability Wheel
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Individual staff member status split ring callout diagram
          </p>
        </div>

        {/* Department Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 p-1 rounded-xl">
          {["All", "Housekeeping", "Maintenance", "Reception", "Food & Beverage"].map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                selectedDept === dept
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* CIRCULAR WHEEL SVG & POINTER CALLOUT DIAGRAM */}
      <div className="relative flex flex-col items-center justify-center min-h-[420px] overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[620px] h-auto overflow-visible select-none"
        >
          <defs>
            <marker
              id="arrow-green"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#22c55e" />
            </marker>
            <marker
              id="arrow-red"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#ef4444" />
            </marker>
          </defs>

          {/* Render Segment Arcs & Pointer Arrows */}
          {filteredList.map((member, i) => {
            const isHovered = hoveredStaffId === member.id;
            const isWorking = member.status === "Working";
            const segmentAngle = 360 / total;
            const gap = 3.5; // Gap between segments in degrees

            // Calculate start & end angles (shift -90 deg to start from top)
            const angleStartDeg = i * segmentAngle + gap / 2 - 90;
            const angleEndDeg = (i + 1) * segmentAngle - gap / 2 - 90;
            const angleMidDeg = (i + 0.5) * segmentAngle - 90;

            const radStart = (angleStartDeg * Math.PI) / 180;
            const radEnd = (angleEndDeg * Math.PI) / 180;
            const radMid = (angleMidDeg * Math.PI) / 180;

            // Segment 4 corner points
            const x1o = cx + rOut * Math.cos(radStart);
            const y1o = cy + rOut * Math.sin(radStart);
            const x2o = cx + rOut * Math.cos(radEnd);
            const y2o = cy + rOut * Math.sin(radEnd);

            const x2i = cx + rIn * Math.cos(radEnd);
            const y2i = cy + rIn * Math.sin(radEnd);
            const x1i = cx + rIn * Math.cos(radStart);
            const y1i = cy + rIn * Math.sin(radStart);

            const largeArc = segmentAngle - gap > 180 ? 1 : 0;

            // Arc Path String
            const pathData = [
              `M ${x1o} ${y1o}`,
              `A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2o} ${y2o}`,
              `L ${x2i} ${y2i}`,
              `A ${rIn} ${rIn} 0 ${largeArc} 0 ${x1i} ${y1i}`,
              `Z`,
            ].join(" ");

            // Pointer Arrow Line Calculation
            const p1x = cx + (rOut + 4) * Math.cos(radMid);
            const p1y = cy + (rOut + 4) * Math.sin(radMid);

            // Extend pointer line outward
            const pointerLength = 45;
            const p2x = cx + (rOut + pointerLength) * Math.cos(radMid);
            const p2y = cy + (rOut + pointerLength) * Math.sin(radMid);

            // Horizontal elbow direction
            const isRightSide = Math.cos(radMid) >= 0;
            const elbowLen = 25;
            const p3x = p2x + (isRightSide ? elbowLen : -elbowLen);
            const p3y = p2y;

            // Text Label position
            const textX = p3x + (isRightSide ? 6 : -6);
            const textY = p3y;
            const textAnchor = isRightSide ? "start" : "end";

            const strokeColor = isWorking ? "#22c55e" : "#ef4444";
            const fillColor = isWorking ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)";

            return (
              <g
                key={member.id}
                onMouseEnter={() => setHoveredStaffId(member.id)}
                onMouseLeave={() => setHoveredStaffId(null)}
                className="cursor-pointer transition-all duration-300"
              >
                {/* Donut Arc Segment */}
                <path
                  d={pathData}
                  fill={fillColor}
                  stroke={isHovered ? "#ffffff" : "transparent"}
                  strokeWidth={isHovered ? 2.5 : 0}
                  className={cn(
                    "transition-all duration-300 hover:opacity-100",
                    isHovered ? "scale-[1.04] opacity-100 filter drop-shadow-md" : "opacity-90 hover:opacity-100"
                  )}
                />

                {/* Pointer Arrow Line */}
                <path
                  d={`M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 2.5 : 1.8}
                  strokeDasharray={isHovered ? "none" : "3 2"}
                  markerStart={isWorking ? "url(#arrow-green)" : "url(#arrow-red)"}
                  className="transition-all duration-300"
                />

                {/* Staff Member Name Label */}
                <text
                  x={textX}
                  y={textY - 4}
                  textAnchor={textAnchor}
                  className={cn(
                    "font-display font-extrabold transition-all text-xs",
                    isHovered ? "fill-foreground font-black text-sm" : "fill-foreground/90"
                  )}
                  style={{ fontSize: isHovered ? "14px" : "12px", fontWeight: 700 }}
                >
                  {member.name}
                </text>

                {/* Status Dot / Badge Subtext */}
                <text
                  x={textX}
                  y={textY + 12}
                  textAnchor={textAnchor}
                  className={cn(
                    "font-bold uppercase tracking-wider text-[9px]",
                    isWorking ? "fill-emerald-600 dark:fill-emerald-400" : "fill-rose-600 dark:fill-rose-400"
                  )}
                  style={{ fontSize: "9px", fontWeight: 700 }}
                >
                  {isWorking ? "● Working" : "● Leave the duty"}
                </text>
              </g>
            );
          })}

          {/* Center Donut Ring Summary Text */}
          <circle cx={cx} cy={cy} r={rIn - 6} className="fill-card stroke-border" strokeWidth="2" />
          <text cx={cx} y={cy - 12} textAnchor="middle" className="fill-muted-foreground text-[10px] uppercase font-extrabold tracking-widest" style={{ fontSize: "10px", textAnchor: "middle" }}>
            <tspan x={cx} dy="0">Overall</tspan>
            <tspan x={cx} dy="16" className="fill-foreground font-display font-black text-xl" style={{ fontSize: "20px", fontWeight: 800 }}>{workingPct}%</tspan>
            <tspan x={cx} dy="16" className="fill-emerald-600 dark:fill-emerald-400 font-bold" style={{ fontSize: "10px" }}>{workingCount} / {total} Active</tspan>
          </text>
        </svg>
      </div>

      {/* BOTTOM LEGEND & DETAILED HOVER PROMPT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/80">
        {/* Exact Handwritten Legend: Green = Working, Red = Leave the duty */}
        <div className="flex items-center gap-6 text-xs sm:text-sm font-bold">
          <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30">
            <span className="size-3 rounded-full bg-emerald-500 shadow-xs" />
            <span>Green = Working</span>
          </span>
          <span className="flex items-center gap-2 text-rose-700 dark:text-rose-400 bg-rose-500/15 px-3 py-1.5 rounded-xl border border-rose-500/30">
            <span className="size-3 rounded-full bg-rose-500 shadow-xs" />
            <span>Red = Leave the duty</span>
          </span>
        </div>

        {/* Live Hover Info Banner */}
        {hoveredStaffId ? (
          <div className="flex items-center gap-2 text-xs font-semibold bg-primary-soft text-accent-foreground px-3 py-1.5 rounded-xl border border-primary/20">
            <Info className="size-3.5 text-primary shrink-0" />
            {(() => {
              const m = staffList.find((s) => s.id === hoveredStaffId);
              if (!m) return null;
              return (
                <span>
                  <strong>{m.name}</strong> ({m.department}) · Shift: {m.shift} · Status:{" "}
                  <span className={m.status === "Working" ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                    {m.status}
                  </span>
                </span>
              );
            })()}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic flex items-center gap-1">
            <Info className="size-3.5" /> Hover or tap any staff segment for shift & role details
          </p>
        )}
      </div>
    </div>
  );
}
