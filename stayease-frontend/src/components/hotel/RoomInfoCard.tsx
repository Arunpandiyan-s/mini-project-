import { useState } from "react";
import { Check, ChevronDown, Copy, Wifi } from "lucide-react";
import { toast } from "sonner";
import { roomInfo } from "@/lib/hotel-data";
import type { ApiGuestStay } from "@/lib/types";

const rows: { label: string; value: string }[] = [
  { label: "TV instructions", value: roomInfo.tv },
  { label: "Air conditioning", value: roomInfo.ac },
  { label: "Water & utilities", value: roomInfo.water },
  { label: "Emergency information", value: roomInfo.emergency },
  { label: "Hotel policies", value: roomInfo.policies },
];

export function RoomInfoCard({ stay }: { stay?: ApiGuestStay | null }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomInfo.wifiPassword);
      setCopied(true);
      toast.success("Wi-Fi password copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy: please enter it manually");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/40 transition-colors"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary border border-primary/20">
          <Wifi className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">Room information</span>
          <span className="block text-xs text-muted-foreground">
            Wi-Fi network, climate controls, room policies and emergency line
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 pb-5 pt-4">
          <div className="rounded-lg bg-secondary/50 border border-border/60 p-3">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Room type</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{stay?.room.room_type ?? "Standard Deluxe Suite"}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 border border-border/60 p-3">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">Wi-Fi network</p>
            <p className="text-sm font-bold text-foreground font-mono mt-0.5">{roomInfo.wifiName}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-mono text-sm">{roomInfo.wifiPassword}</span>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          {rows.map((row) => (
            <div key={row.label} className="rounded-xl bg-secondary/60 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {row.label}
              </p>
              <p className="mt-1 text-sm leading-relaxed">{row.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}