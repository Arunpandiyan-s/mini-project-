import logoImg from "@/assets/logo.jpeg";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logoImg}
        alt="StayEase Logo"
        className="size-11 shrink-0 rounded-2xl object-cover shadow-soft ring-1 ring-black/10"
      />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-base font-semibold">StayEase</p>
          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-gold-foreground/70">
            Staff Portal
          </p>
        </div>
      )}
    </div>
  );
}
