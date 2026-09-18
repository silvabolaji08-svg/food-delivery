"use client";

import { useEffect } from "react";

import { useCart } from "@/lib/cart-store";

/**
 * Empties the basket that produced this order.
 *
 * The order is created by a Server Action that redirects here, so the browser
 * never gets a success callback to clean up in. Clearing is scoped to a cart
 * that still matches this order, so reopening an old tracking link cannot wipe
 * a basket the customer has since started somewhere else.
 */
export function ClearCartOnOrder({
  restaurantId,
  menuItemIds,
}: {
  restaurantId: string;
  menuItemIds: string[];
}) {
  const clearIfMatches = useCart((state) => state.clearIfMatches);

  useEffect(() => {
    clearIfMatches(restaurantId, menuItemIds);
    // `menuItemIds` is a fresh array on every render, so it is compared by
    // content rather than identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, menuItemIds.join(","), clearIfMatches]);

  return null;
}
