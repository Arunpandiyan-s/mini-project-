import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pb-4">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "primary",
  className,
  onClick,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: string; up: boolean };
  tone?: "primary" | "gold" | "success" | "danger" | "muted";
  className?: string;
  onClick?: () => void;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary border-primary/20",
    gold: "bg-gold-soft text-gold-foreground border-amber-500/20",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    danger: "bg-destructive/10 text-destructive border-destructive/25",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "surface p-4 sm:p-5 transition-all select-none border border-border/80 shadow-xs",
        onClick && "cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border", tones[tone])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight tabular-nums sm:text-3xl text-foreground">{value}</p>
      {trend && (
        <p
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
            trend.up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
          )}
        >
          {trend.up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {trend.value}
        </p>
      )}
    </div>
  );
}

export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-success/12 px-3 py-1 text-xs font-semibold text-success">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      {label}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 120,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * value) / 100}
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-xl font-bold">{value}%</p>
          {label && <p className="text-[11px] text-muted-foreground">{label}</p>}
        </div>
      </div>
    </div>
  );
}
