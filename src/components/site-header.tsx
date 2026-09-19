"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { cartItemCount, useCart } from "@/lib/cart-store";
import { useCartDrawer } from "@/lib/ui-store";
import { useHydrated } from "@/lib/use-hydrated";

export function SiteHeader() {
  const lines = useCart((state) => state.lines);
  const openDrawer = useCartDrawer((state) => state.open);

  // The cart is restored from localStorage after hydration, so the count is
  // held at zero until then to keep server and first client render identical.
  const hydrated = useHydrated();
  const count = hydrated ? cartItemCount(lines) : 0;

  // Adding a dish no longer opens the drawer, so this badge is the main
  // confirmation that anything happened. Re-keying the element restarts the
  // animation, which a class toggle alone would not do.
  const [bumpKey, setBumpKey] = useState(0);
  const previousCount = useRef(count);

  useEffect(() => {
    if (count > previousCount.current) setBumpKey((n) => n + 1);
    previousCount.current = count;
  }, [count]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <BrandMark />

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            Restaurants
          </Link>
          <Link
            href="/orders"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            Orders
          </Link>

          <button
            type="button"
            onClick={openDrawer}
            className="relative ml-1 inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground transition-all hover:bg-brand-hover hover:shadow-md active:scale-95"
            aria-label={
              count > 0 ? `Open cart, ${count} items` : "Open cart, empty"
            }
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span
                key={bumpKey}
                className="animate-badge-bump grid h-5 min-w-5 place-items-center rounded-full bg-brand-foreground px-1 text-xs font-bold text-brand"
              >
                {count}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
