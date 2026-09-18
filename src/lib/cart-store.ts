"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { calculateTotals } from "@/lib/money";

export type CartLine = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

export type CartRestaurant = {
  id: string;
  slug: string;
  name: string;
  deliveryFee: number;
  minimumOrder: number;
};

type CartState = {
  restaurant: CartRestaurant | null;
  lines: CartLine[];
  /** Set when an add is blocked because the cart belongs to another restaurant. */
  conflict: { incoming: CartRestaurant; line: CartLine } | null;

  addItem: (restaurant: CartRestaurant, line: Omit<CartLine, "quantity">) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clear: () => void;
  /** Clears only if the cart still holds exactly what an order captured. */
  clearIfMatches: (restaurantId: string, menuItemIds: string[]) => void;
  resolveConflict: (replace: boolean) => void;
  dismissConflict: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      restaurant: null,
      lines: [],
      conflict: null,

      addItem: (restaurant, line) => {
        const state = get();

        // A delivery cart can only hold items from one kitchen at a time.
        if (state.restaurant && state.restaurant.id !== restaurant.id) {
          set({
            conflict: { incoming: restaurant, line: { ...line, quantity: 1 } },
          });
          return;
        }

        const existing = state.lines.find(
          (l) => l.menuItemId === line.menuItemId,
        );

        set({
          restaurant,
          lines: existing
            ? state.lines.map((l) =>
                l.menuItemId === line.menuItemId
                  ? { ...l, quantity: l.quantity + 1 }
                  : l,
              )
            : [...state.lines, { ...line, quantity: 1 }],
        });
      },

      setQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }

        set((state) => ({
          lines: state.lines.map((l) =>
            l.menuItemId === menuItemId ? { ...l, quantity } : l,
          ),
        }));
      },

      removeItem: (menuItemId) => {
        set((state) => {
          const lines = state.lines.filter((l) => l.menuItemId !== menuItemId);
          // Drop the restaurant binding once the cart empties, so the next
          // add from anywhere is not treated as a conflict.
          return { lines, restaurant: lines.length ? state.restaurant : null };
        });
      },

      clear: () => set({ restaurant: null, lines: [], conflict: null }),

      clearIfMatches: (restaurantId, menuItemIds) => {
        const state = get();
        if (state.restaurant?.id !== restaurantId) return;

        const inCart = new Set(state.lines.map((line) => line.menuItemId));
        if (inCart.size !== menuItemIds.length) return;
        if (!menuItemIds.every((id) => inCart.has(id))) return;

        set({ restaurant: null, lines: [], conflict: null });
      },

      resolveConflict: (replace) => {
        const { conflict } = get();
        if (!conflict) return;

        if (replace) {
          set({
            restaurant: conflict.incoming,
            lines: [conflict.line],
            conflict: null,
          });
        } else {
          set({ conflict: null });
        }
      },

      dismissConflict: () => set({ conflict: null }),
    }),
    {
      name: "bitebox-cart",
      // `conflict` is transient UI state and must not survive a reload.
      partialize: (state) => ({
        restaurant: state.restaurant,
        lines: state.lines,
      }),
    },
  ),
);

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartTotals(lines: CartLine[], deliveryFee: number) {
  return calculateTotals(cartSubtotal(lines), deliveryFee);
}
