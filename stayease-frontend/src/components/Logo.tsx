import logoImg from "@/assets/logo.jpeg";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
  subtitle = "Hospitality Platform",
}: {
  className?: string;
  compact?: boolean;
  subtitle?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={logoImg}
        alt="StayEase Logo"
        className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-border shadow-2xs"
      />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-base font-bold tracking-tight text-foreground">
            StayEase
          </p>
          <p className="truncate text-[10px] font-mono font-medium uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
