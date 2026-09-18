"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  AlertCircle,
  Banknote,
  CreditCard,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { placeOrder } from "@/app/actions";
import { EMPTY_CHECKOUT_STATE } from "@/lib/checkout";
import type { CheckoutField } from "@/lib/checkout";
import { cartItemCount, cartTotals, useCart } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { useHydrated } from "@/lib/use-hydrated";

export function CheckoutForm() {
  const [state, formAction, pending] = useActionState(
    placeOrder,
    EMPTY_CHECKOUT_STATE,
  );

  const restaurant = useCart((s) => s.restaurant);
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);

  // The cart is rehydrated from localStorage after mount, so the first client
  // render must match the server's empty one.
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="mt-8 h-96 animate-pulse rounded-2xl bg-surface-muted" />;
  }

  if (!restaurant || lines.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-muted text-muted">
          <ShoppingBag className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-4 font-medium">Your cart is empty</p>
        <p className="mt-1 text-sm text-muted">
          Pick a restaurant and add a few dishes before checking out.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          Browse restaurants
        </Link>
      </div>
    );
  }

  const totals = cartTotals(lines, restaurant.deliveryFee);
  const count = cartItemCount(lines);
  const shortfall = restaurant.minimumOrder - totals.subtotal;
  const belowMinimum = shortfall > 0;

  const itemsPayload = JSON.stringify(
    lines.map((line) => ({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
    })),
  );

  return (
    <form action={formAction} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      {/* Priced and validated again on the server; these are only a hint. */}
      <input type="hidden" name="restaurantId" value={restaurant.id} />
      <input type="hidden" name="items" value={itemsPayload} />

      <div className="space-y-8">
        {state.error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-danger-subtle px-4 py-3 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {state.error}
          </p>
        )}

        <fieldset className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <legend className="px-1 text-lg font-semibold">Your details</legend>

          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Field
              name="customerName"
              label="Full name"
              autoComplete="name"
              required
              error={state.fieldErrors.customerName}
            />
            <Field
              name="customerPhone"
              label="Phone number"
              type="tel"
              autoComplete="tel"
              required
              error={state.fieldErrors.customerPhone}
            />
            <div className="sm:col-span-2">
              <Field
                name="customerEmail"
                label="Email"
                type="email"
                autoComplete="email"
                hint="Optional — for your receipt."
                error={state.fieldErrors.customerEmail}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <legend className="px-1 text-lg font-semibold">
            Delivery address
          </legend>

          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                name="addressLine"
                label="Street address"
                autoComplete="street-address"
                required
                error={state.fieldErrors.addressLine}
              />
            </div>
            <Field
              name="city"
              label="City"
              autoComplete="address-level2"
              required
              error={state.fieldErrors.city}
            />
            <Field
              name="postcode"
              label="Postcode"
              autoComplete="postal-code"
              required
              error={state.fieldErrors.postcode}
            />

            <div className="sm:col-span-2">
              <label
                htmlFor="deliveryNotes"
                className="block text-sm font-medium"
              >
                Notes for the courier
              </label>
              <textarea
                id="deliveryNotes"
                name="deliveryNotes"
                rows={3}
                placeholder="Buzzer code, which door to use, where to leave it..."
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-brand"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <legend className="px-1 text-lg font-semibold">Payment</legend>
          <p className="mt-1 text-sm text-muted">
            This is a demo. No card details are collected and nothing is
            charged.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PaymentOption
              value="CARD"
              label="Card on file"
              hint="Simulated payment"
              defaultChecked
              icon={<CreditCard className="h-5 w-5" aria-hidden />}
            />
            <PaymentOption
              value="CASH"
              label="Cash on delivery"
              hint="Pay the courier"
              icon={<Banknote className="h-5 w-5" aria-hidden />}
            />
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <p className="mt-0.5 text-sm text-muted">
            From{" "}
            <Link
              href={`/restaurants/${restaurant.slug}`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {restaurant.name}
            </Link>
          </p>

          <ul className="mt-4 divide-y divide-border">
            {lines.map((line) => (
              <li key={line.menuItemId} className="flex gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-muted">
                    {formatMoney(line.price)} each
                  </p>

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="inline-flex items-center rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(line.menuItemId, line.quantity - 1)
                        }
                        className="grid h-7 w-7 place-items-center rounded-l-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                        aria-label={`Decrease quantity of ${line.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(line.menuItemId, line.quantity + 1)
                        }
                        className="grid h-7 w-7 place-items-center rounded-r-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                        aria-label={`Increase quantity of ${line.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(line.menuItemId)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-subtle hover:text-danger"
                      aria-label={`Remove ${line.name} from cart`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold tabular-nums">
                  {formatMoney(line.price * line.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">
                Subtotal ({count} {count === 1 ? "item" : "items"})
              </dt>
              <dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="tabular-nums">{formatMoney(totals.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Service fee</dt>
              <dd className="tabular-nums">{formatMoney(totals.serviceFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(totals.total)}</dd>
            </div>
          </dl>

          {belowMinimum && (
            <p className="mt-4 rounded-xl bg-accent-subtle px-3 py-2 text-sm text-accent-strong">
              Add {formatMoney(shortfall)} more to reach the{" "}
              {formatMoney(restaurant.minimumOrder)} minimum order.
            </p>
          )}

          <button
            type="submit"
            disabled={pending || belowMinimum}
            className="mt-4 w-full rounded-xl bg-brand px-4 py-3 font-semibold text-brand-foreground transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          >
            {pending ? "Placing order..." : `Place order · ${formatMoney(totals.total)}`}
          </button>

          <p aria-live="polite" className="sr-only">
            {pending ? "Placing your order" : ""}
          </p>
        </div>
      </aside>
    </form>
  );
}

function Field({
  name,
  label,
  error,
  hint,
  type = "text",
  required,
  autoComplete,
}: {
  name: CheckoutField;
  label: string;
  error?: string;
  hint?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {!required && <span className="ml-1 text-muted">(optional)</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted ${
          error ? "border-danger" : "border-border focus:border-brand"
        }`}
      />

      {error ? (
        <p id={`${name}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function PaymentOption({
  value,
  label,
  hint,
  icon,
  defaultChecked,
}: {
  value: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-subtle">
      <input
        type="radio"
        name="paymentMethod"
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      <span className="text-muted">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}
