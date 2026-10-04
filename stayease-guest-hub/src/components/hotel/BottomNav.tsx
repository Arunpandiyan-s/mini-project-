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
      className="fixed inset-x-0 bottom-0 md:bottom-6 z-40 mx-auto max-w-md md:max-w-lg border-t md:border border-border bg-card/95 px-2 md:px-4 pb-[env(safe-area-inset-bottom)] md:pb-0 md:rounded-full backdrop-blur md:shadow-2xl transition-all"
    >
      <ul className="flex items-stretch justify-between">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <li key={item.key} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full flex-col items-center gap-1 py-3 text-[11px] font-semibold transition ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}