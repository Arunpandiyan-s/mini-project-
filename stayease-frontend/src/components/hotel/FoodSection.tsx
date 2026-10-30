import { useMemo, useState } from "react";
import { Clock, Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { foodCategories, foodMenu, type FoodCategory, type FoodItem } from "@/lib/hotel-data";
import { createGuestRequest } from "@/lib/api";
import type { BackendRequestType } from "@/lib/types";

type CartLine = { item: FoodItem; qty: number };

interface FoodSectionProps {
  onRequestCreated: (requestId: string, label: string, requestType: BackendRequestType) => void;
  selectedRoomNumber?: string;
}

export function FoodSection({ onRequestCreated, selectedRoomNumber }: FoodSectionProps) {
  const [category, setCategory] = useState<FoodCategory>("Breakfast");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [detail, setDetail] = useState<FoodItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);

  const items = useMemo(() => foodMenu.filter((item) => item.category === category), [category]);
  const total = cart.reduce((sum, line) => sum + line.item.price * line.qty, 0);
  const count = cart.reduce((sum, line) => sum + line.qty, 0);

  const add = (item: FoodItem) => {
    setCart((lines) => {
      const existing = lines.find((line) => line.item.id === item.id);
      if (existing) {
        return lines.map((line) =>
          line.item.id === item.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [...lines, { item, qty: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const step = (id: string, delta: number) => {
    setCart((lines) =>
      lines
        .map((line) => (line.item.id === id ? { ...line, qty: line.qty + delta } : line))
        .filter((line) => line.qty > 0),
    );
  };

  const placeOrder = async () => {
    setPlacing(true);

    const orderLabel = `Food Order · ${count} item${count === 1 ? "" : "s"} (₹${total})`;
    const description = [
      ...cart.map((c) => `${c.qty}x ${c.item.name} (₹${c.item.price})`),
      `Total: ₹${total}`,
    ].join(", ");

    try {
      const result = await createGuestRequest({
        request_type: "food_order",
        description,
        room_number: selectedRoomNumber || undefined,
      });
      onRequestCreated(result.request_id, orderLabel, "food_order");
      toast.success(`Order placed! ${count} item${count === 1 ? "" : "s"}. We'll bring it to your room.`);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast.error(apiErr?.message ?? "Failed to place order. Please try again.");
    }

    setPlacing(false);
    setCart([]);
    setCartOpen(false);
  };

  return (
    <section aria-labelledby="food-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="food-title" className="text-base font-semibold">
          In-room dining
        </h2>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
        >
          <ShoppingBag className="h-4 w-4" /> Cart
          {count > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </div>

      <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
        {foodCategories.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setCategory(option)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              category === option
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                : "bg-card text-muted-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <article key={item.id} className="card-surface flex items-center gap-3 p-3">
            <button type="button" onClick={() => setDetail(item)} className="shrink-0">
              <img
                src={item.image}
                alt={item.name}
                width={512}
                height={512}
                loading="lazy"
                className="h-18 w-18 rounded-2xl object-cover"
              />
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setDetail(item)}
                className="block w-full text-left"
              >
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
              </button>
              <p className="mt-1 text-sm font-semibold text-primary">${item.price}</p>
            </div>
            <Button variant="gold" size="sm" className="shrink-0 rounded-full" onClick={() => add(item)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </article>
        ))}
      </div>

      {count > 0 && (
        <div className="card-surface mt-4 flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold">
              {count} item{count === 1 ? "" : "s"} · ${total}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Est. delivery 25–30 min
            </p>
          </div>
          <Button variant="hero" onClick={() => setCartOpen(true)}>
            Review cart
          </Button>
        </div>
      )}

      <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent side="bottom" className="rounded-t-[1.75rem] pb-8">
          {detail && (
            <>
              <img
                src={detail.image}
                alt={detail.name}
                width={512}
                height={512}
                loading="lazy"
                className="h-44 w-full rounded-2xl object-cover"
              />
              <SheetHeader className="mt-4 text-left">
                <SheetTitle>{detail.name}</SheetTitle>
              </SheetHeader>
              <p className="mt-1 text-sm text-muted-foreground">{detail.description}</p>
              <p className="mt-3 text-lg font-semibold text-primary">${detail.price}</p>
              <Button
                variant="hero"
                size="xl"
                className="mt-4 w-full"
                onClick={() => {
                  add(detail);
                  setDetail(null);
                }}
              >
                Add to cart
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-[1.75rem] pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>Your cart</SheetTitle>
          </SheetHeader>
          {cart.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Your cart is empty. Add something delicious from the menu.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {cart.map((line) => (
                <div key={line.item.id} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{line.item.name}</p>
                    <p className="text-xs text-muted-foreground">${line.item.price} each</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="soft"
                      size="icon"
                      className="rounded-full"
                      aria-label={`Remove one ${line.item.name}`}
                      onClick={() => step(line.item.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-5 text-center text-sm font-semibold">{line.qty}</span>
                    <Button
                      variant="soft"
                      size="icon"
                      className="rounded-full"
                      aria-label={`Add one ${line.item.name}`}
                      onClick={() => step(line.item.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>${total}</span>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Estimated delivery 25–30 minutes to Room 512
              </p>
              <Button variant="hero" size="xl" className="w-full" onClick={placeOrder} disabled={placing}>
                {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {placing ? "Placing order…" : "Place order"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}