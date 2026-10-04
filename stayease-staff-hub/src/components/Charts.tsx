import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DEPARTMENT_WORKLOAD,
  OCCUPANCY_TREND,
  RESPONSE_TIME,
  SATISFACTION,
  STAFF_PRODUCTIVITY,
  TASK_COMPLETION,
} from "@/lib/data";

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  borderRadius: 14,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
  fontSize: 12,
  color: "var(--color-foreground)",
};

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function OccupancyChart() {
  return (
    <ChartCard title="Occupancy trend" subtitle="Last 7 days vs target">
      <AreaChart data={OCCUPANCY_TREND}>
        <defs>
          <linearGradient id="occ" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="day" {...axis} />
        <YAxis {...axis} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="occupancy" stroke="var(--color-chart-1)" fill="url(#occ)" strokeWidth={2.5} />
        <Line type="monotone" dataKey="target" stroke="var(--color-chart-2)" strokeDasharray="4 4" dot={false} />
      </AreaChart>
    </ChartCard>
  );
}

export function TaskCompletionChart() {
  return (
    <ChartCard title="Task completion rate" subtitle="Completed vs assigned">
      <BarChart data={TASK_COMPLETION}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="day" {...axis} />
        <YAxis {...axis} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="assigned" fill="var(--color-muted)" radius={[8, 8, 0, 0]} />
        <Bar dataKey="completed" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function ResponseTimeChart() {
  return (
    <ChartCard title="Average response time" subtitle="Minutes to first action">
      <LineChart data={RESPONSE_TIME}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="day" {...axis} />
        <YAxis {...axis} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="minutes" stroke="var(--color-chart-4)" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ChartCard>
  );
}

export function SatisfactionChart() {
  return (
    <ChartCard title="Guest satisfaction" subtitle="Average daily rating (out of 5)">
      <AreaChart data={SATISFACTION}>
        <defs>
          <linearGradient id="sat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="day" {...axis} />
        <YAxis domain={[4, 5]} {...axis} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="score" stroke="var(--color-chart-2)" fill="url(#sat)" strokeWidth={2.5} />
      </AreaChart>
    </ChartCard>
  );
}

export function WorkloadChart() {
  return (
    <ChartCard title="Department workload" subtitle="Open + completed tasks today">
      <BarChart data={DEPARTMENT_WORKLOAD} layout="vertical" margin={{ left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="dept" width={92} {...axis} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="tasks" fill="var(--color-chart-1)" radius={[0, 8, 8, 0]} barSize={18} />
      </BarChart>
    </ChartCard>
  );
}

export function ProductivityChart() {
  return (
    <ChartCard title="Staff productivity" subtitle="Top performers this week">
      <BarChart data={STAFF_PRODUCTIVITY}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="name" {...axis} />
        <YAxis domain={[0, 100]} {...axis} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="score" fill="var(--color-chart-2)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted-foreground)",
];

export function RoleDistributionChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ChartCard title="Role distribution" subtitle="Employees per department">
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3}>
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartCard>
  );
}
