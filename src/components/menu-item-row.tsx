"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Flame, Leaf, Plus } from "lucide-react";

import { useCart, type CartRestaurant } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { useCartDrawer } from "@/lib/ui-store";

export type MenuItemView = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isVegetarian: boolean;
  isSpicy: boolean;
  isPopular: boolean;
  isAvailable: boolean;
};

export function MenuItemRow({
  item,
  restaurant,
  canOrder,
  index = 0,
}: {
  item: MenuItemView;
  restaurant: CartRestaurant;
  canOrder: boolean;
  /** Position within its section, used to stagger the entrance. */
  index?: number;
}) {
  const addItem = useCart((state) => state.addItem);
  const openDrawer = useCartDrawer((state) => state.open);
  const [justAdded, setJustAdded] = useState(false);

  const disabled = !canOrder || !item.isAvailable;

  function handleAdd() {
    addItem(restaurant, {
      menuItemId: item.id,
      name: item.name,
      price: item.price,
    });

    // A different-restaurant add is blocked until the customer chooses, and
    // that prompt lives in the drawer — so this is the one case worth
    // interrupting for. On a normal add the drawer would just cover the menu
    // the customer is still ordering from, so the button and the header badge
    // carry the confirmation instead.
    if (useCart.getState().conflict) {
      openDrawer();
      return;
    }

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  const addButton = (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        disabled
          ? "cursor-not-allowed bg-surface-muted text-muted"
          : justAdded
            ? "bg-success text-white"
            : "bg-brand text-brand-foreground hover:bg-brand-hover"
      }`}
      aria-label={`Add ${item.name} to cart`}
    >
      {justAdded ? (
        <>
          <Check className="h-4 w-4" aria-hidden />
          Added
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </>
      )}
    </button>
  );

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="animate-rise-in group/row flex items-start justify-between gap-4 py-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-medium leading-tight">{item.name}</h4>

          {item.isPopular && (
            <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-semibold text-accent-strong">
              Popular
            </span>
          )}
          {item.isVegetarian && (
            <span
              className="flex items-center gap-1 rounded-full bg-success-subtle px-2 py-0.5 text-xs font-semibold text-success"
              title="Vegetarian"
            >
              <Leaf className="h-3 w-3" aria-hidden />
              Veg
            </span>
          )}
          {item.isSpicy && (
            <span
              className="flex items-center gap-1 rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-semibold text-danger"
              title="Spicy"
            >
              <Flame className="h-3 w-3" aria-hidden />
              Spicy
            </span>
          )}
        </div>

        <p className="mt-1 text-sm text-muted">{item.description}</p>
        <p className="mt-2 font-semibold tabular-nums">
          {formatMoney(item.price)}
        </p>

        {!item.isAvailable && (
          <p className="mt-1 text-sm text-muted">Sold out</p>
        )}
      </div>

      {item.imageUrl ? (
        // With a photo the button tucks into its corner, the way most delivery
        // menus do it. Dishes without one keep the plain text layout instead of
        // reserving an empty grey square.
        <div className="relative shrink-0">
          {/* The clip lives on an inner wrapper so the zoom stays inside the
              rounded photo without also cropping the button that overhangs it. */}
          <div className="overflow-hidden rounded-xl">
            <Image
              src={item.imageUrl}
              alt=""
              width={240}
              height={240}
              sizes="(min-width: 640px) 128px, 96px"
              className={`h-24 w-24 object-cover transition-transform duration-300 group-hover/row:scale-[1.04] sm:h-32 sm:w-32 ${
                item.isAvailable ? "" : "grayscale"
              }`}
            />
          </div>
          <div className="absolute -bottom-2 -right-2">{addButton}</div>
        </div>
      ) : (
        <div className="mt-1">{addButton}</div>
      )}
    </li>
  );
}
