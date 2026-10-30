import { ClipboardList, Home, User, UtensilsCrossed } from "lucide-react";

export type NavKey = "home" | "requests" | "food" | "profile";

const items: { key: NavKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "requests", label: "Requests", icon: ClipboardList },
  { key: "food", label: "Food", icon: UtensilsCrossed },
  { key: "profile", label: "Profile", icon: User },
];

export function BottomNav({
  active,
  onSelect,
}: {
  active: NavKey;
  onSelect: (key: NavKey) => void;
}) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 md:bottom-5 z-40 mx-auto max-w-sm md:max-w-md border-t md:border border-border/80 bg-card/90 px-3 pb-[env(safe-area-inset-bottom)] md:pb-0 md:rounded-2xl backdrop-blur-md md:shadow-lift transition-all"
    >
      <ul className="flex items-stretch justify-between py-1.5 md:py-1">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <li key={item.key} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full flex-col items-center gap-1 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                  isActive
                    ? "text-primary font-bold bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}