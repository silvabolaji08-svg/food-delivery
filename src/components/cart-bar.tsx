"use client";

import { ShoppingBag } from "lucide-react";

import { cartItemCount, cartSubtotal, useCart } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { useCartDrawer } from "@/lib/ui-store";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Floating basket summary for the restaurant page. Adding a dish no longer
 * throws the drawer open over the menu, so this is what keeps the running
 * total and the way to checkout in view while browsing.
 */
export function CartBar({ restaurantId }: { restaurantId: string }) {
  const restaurant = useCart((state) => state.restaurant);
  const lines = useCart((state) => state.lines);
  const open = useCartDrawer((state) => state.open);
  const hydrated = useHydrated();

  // Only surfaces the basket that belongs to the menu being looked at.
  if (!hydrated || restaurant?.id !== restaurantId || lines.length === 0) {
    return null;
  }

  const count = cartItemCount(lines);
  const subtotal = cartSubtotal(lines);

  return (
    <div className="pointer-events-none sticky bottom-4 z-30 flex justify-center px-4">
      <button
        type="button"
        onClick={open}
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-brand px-5 py-3.5 font-semibold text-brand-foreground shadow-lg transition-colors hover:bg-brand-hover"
      >
        <span className="relative">
          <ShoppingBag className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex-1 text-left">
          View cart
          <span className="ml-2 font-normal opacity-90">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </span>
        <span className="tabular-nums">{formatMoney(subtotal)}</span>
      </button>
    </div>
  );
}
