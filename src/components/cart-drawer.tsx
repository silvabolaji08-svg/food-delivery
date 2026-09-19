"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

import { cartItemCount, cartTotals, useCart } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { useCartDrawer } from "@/lib/ui-store";
import { useHydrated } from "@/lib/use-hydrated";

export function CartDrawer() {
  const { isOpen, close: closeNow } = useCartDrawer();
  const restaurant = useCart((state) => state.restaurant);
  const lines = useCart((state) => state.lines);
  const setQuantity = useCart((state) => state.setQuantity);
  const removeItem = useCart((state) => state.removeItem);
  const clear = useCart((state) => state.clear);
  const conflict = useCart((state) => state.conflict);
  const resolveConflict = useCart((state) => state.resolveConflict);

  const hydrated = useHydrated();

  // The panel has to outlive `isOpen` long enough to animate out, so closing
  // is staged: mark it closing and let the animation's end event unmount it.
  // Tying it to `animationend` rather than a timer keeps the two from drifting
  // apart, and still fires when reduced motion collapses the duration.
  const [closing, setClosing] = useState(false);

  /** Starts the exit animation; `onAnimationEnd` finishes the job. */
  const close = useCallback(() => setClosing(true), []);

  function handleExitEnd() {
    if (!closing) return;
    setClosing(false);
    closeNow();
  }

  // Close on Escape, and lock background scrolling while the panel is open.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // The conflict prompt sits on top of the drawer, so it dismisses first.
      if (useCart.getState().conflict) {
        useCart.getState().dismissConflict();
        return;
      }

      close();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close]);

  if (!hydrated || !isOpen) return null;

  const totals = cartTotals(lines, restaurant?.deliveryFee ?? 0);
  const count = cartItemCount(lines);
  const belowMinimum =
    restaurant != null && totals.subtotal < restaurant.minimumOrder;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close cart"
        onClick={close}
        className={`absolute inset-0 bg-black/40 ${
          closing ? "animate-fade-out" : "animate-fade-in"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        onAnimationEnd={handleExitEnd}
        className={`relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-xl ${
          closing ? "animate-slide-out-right" : "animate-slide-in-right"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Your cart</h2>
            {restaurant && (
              <p className="text-sm text-muted">
                From{" "}
                <Link
                  href={`/restaurants/${restaurant.slug}`}
                  onClick={close}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {restaurant.name}
                </Link>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-muted text-muted">
              <ShoppingBag className="h-6 w-6" aria-hidden />
            </span>
            <p className="font-medium">Your cart is empty</p>
            <p className="text-sm text-muted">
              Add dishes from a restaurant and they will show up here.
            </p>
            <Link
              href="/"
              onClick={close}
              className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              Browse restaurants
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {lines.map((line) => (
                <li key={line.menuItemId} className="flex gap-3 py-4">
                  <div className="flex-1">
                    <p className="font-medium leading-tight">{line.name}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {formatMoney(line.price)} each
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="inline-flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(line.menuItemId, line.quantity - 1)
                          }
                          className="grid h-8 w-8 place-items-center rounded-l-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                          aria-label={`Decrease quantity of ${line.name}`}
                        >
                          <Minus className="h-4 w-4" aria-hidden />
                        </button>
                        <span
                          className="w-8 text-center text-sm font-semibold tabular-nums"
                          aria-live="polite"
                        >
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(line.menuItemId, line.quantity + 1)
                          }
                          className="grid h-8 w-8 place-items-center rounded-r-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                          aria-label={`Increase quantity of ${line.name}`}
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(line.menuItemId)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-subtle hover:text-danger"
                        aria-label={`Remove ${line.name} from cart`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <p className="font-semibold tabular-nums">
                    {formatMoney(line.price * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="border-t border-border px-5 py-4">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">
                    Subtotal ({count} {count === 1 ? "item" : "items"})
                  </dt>
                  <dd className="tabular-nums">
                    {formatMoney(totals.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Delivery</dt>
                  <dd className="tabular-nums">
                    {formatMoney(totals.deliveryFee)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Service fee</dt>
                  <dd className="tabular-nums">
                    {formatMoney(totals.serviceFee)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMoney(totals.total)}</dd>
                </div>
              </dl>

              {belowMinimum && restaurant && (
                <p className="mt-3 rounded-lg bg-accent-subtle px-3 py-2 text-sm text-accent-strong">
                  Add {formatMoney(restaurant.minimumOrder - totals.subtotal)}{" "}
                  more to reach the {formatMoney(restaurant.minimumOrder)}{" "}
                  minimum order.
                </p>
              )}

              <Link
                href="/checkout"
                onClick={close}
                aria-disabled={belowMinimum}
                tabIndex={belowMinimum ? -1 : undefined}
                className={`mt-4 block rounded-xl px-4 py-3 text-center font-semibold transition-colors ${
                  belowMinimum
                    ? "pointer-events-none bg-surface-muted text-muted"
                    : "bg-brand text-brand-foreground hover:bg-brand-hover"
                }`}
              >
                Go to checkout
              </Link>

              <button
                type="button"
                onClick={clear}
                className="mt-2 w-full rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-danger"
              >
                Empty cart
              </button>
            </div>
          </>
        )}

        {/* A cart can only hold one kitchen at a time, so an add from another
            restaurant waits here for the customer to decide. */}
        {conflict && (
          <div className="animate-fade-in absolute inset-0 z-10 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-5">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="cart-conflict-title"
              aria-describedby="cart-conflict-body"
              className="animate-pop-in w-full rounded-t-2xl border-t border-border bg-surface p-5 shadow-xl sm:rounded-2xl sm:border"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-subtle text-brand">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </span>

              <h3 id="cart-conflict-title" className="mt-3 text-lg font-semibold">
                Start a new cart?
              </h3>
              <p id="cart-conflict-body" className="mt-1.5 text-sm text-muted">
                Your cart has food from{" "}
                <span className="font-medium text-foreground">
                  {restaurant?.name}
                </span>
                . Adding{" "}
                <span className="font-medium text-foreground">
                  {conflict.line.name}
                </span>{" "}
                from{" "}
                <span className="font-medium text-foreground">
                  {conflict.incoming.name}
                </span>{" "}
                will empty it first.
              </p>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => resolveConflict(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-muted"
                >
                  Keep my cart
                </button>
                <button
                  type="button"
                  onClick={() => resolveConflict(true)}
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
                >
                  Start new cart
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
