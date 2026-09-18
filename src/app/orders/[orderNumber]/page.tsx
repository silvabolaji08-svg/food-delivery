import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bike, MapPin, Phone, Receipt, StickyNote, User } from "lucide-react";

import { ClearCartOnOrder } from "@/components/clear-cart-on-order";
import { OrderStatusControls } from "@/components/order-status-controls";
import { OrderTimeline } from "@/components/order-timeline";
import { formatMoney } from "@/lib/money";
import { getOrderByNumber } from "@/lib/queries";
import { STATUS_DESCRIPTIONS, isTerminal, toOrderStatus } from "@/lib/order-status";

export async function generateMetadata({
  params,
}: PageProps<"/orders/[orderNumber]">): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber}`,
    description: "Track your delivery from the kitchen to your door.",
    // A tracking page is personal and transient; keep it out of search results.
    robots: { index: false, follow: false },
  };
}

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const dateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export default async function OrderPage({
  params,
}: PageProps<"/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber.toUpperCase());

  if (!order) notFound();

  const status = toOrderStatus(order.status);
  const settled = isTerminal(status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Reaching this page means the order was accepted, so the basket that
          produced it can be emptied. */}
      <ClearCartOnOrder
        restaurantId={order.restaurantId}
        menuItemIds={order.items.map((item) => item.menuItemId)}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Order{" "}
            <span className="font-mono font-semibold text-foreground">
              {order.orderNumber}
            </span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {STATUS_DESCRIPTIONS[status]}
          </h1>
          <p className="mt-2 text-muted">
            From{" "}
            <Link
              href={`/restaurants/${order.restaurant.slug}`}
              className="font-medium underline underline-offset-2 hover:text-foreground"
            >
              {order.restaurant.name}
            </Link>{" "}
            · placed {dateFormat.format(order.placedAt)} at{" "}
            {timeFormat.format(order.placedAt)}
          </p>
        </div>

        {!settled && (
          <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-muted">
              Estimated arrival
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-lg font-semibold tabular-nums">
              <Bike className="h-4 w-4 text-accent" aria-hidden />
              {timeFormat.format(order.estimatedAt)}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Progress</h2>
            <OrderTimeline status={status} />
            <OrderStatusControls
              orderNumber={order.orderNumber}
              status={status}
            />
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MapPin className="h-4 w-4 text-muted" aria-hidden />
              Delivering to
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex gap-3">
                <dt className="sr-only">Recipient</dt>
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                <dd>{order.customerName}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="sr-only">Phone</dt>
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                <dd>{order.customerPhone}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="sr-only">Address</dt>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                <dd>
                  {order.addressLine}
                  <br />
                  {order.city}, {order.postcode}
                </dd>
              </div>
              {order.deliveryNotes && (
                <div className="flex gap-3">
                  <dt className="sr-only">Notes for the courier</dt>
                  <StickyNote
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                    aria-hidden
                  />
                  <dd className="text-muted">{order.deliveryNotes}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        <aside className="lg:h-fit">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Receipt className="h-4 w-4 text-muted" aria-hidden />
              Receipt
            </h2>

            <ul className="mt-4 divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3 text-sm">
                  <span className="font-semibold tabular-nums text-muted">
                    {item.quantity}×
                  </span>
                  <span className="min-w-0 flex-1">{item.nameSnapshot}</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums">
                  {formatMoney(order.deliveryFee)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Service fee</dt>
                <dd className="tabular-nums">{formatMoney(order.serviceFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(order.total)}</dd>
              </div>
              <div className="flex justify-between pt-1">
                <dt className="text-muted">Paid by</dt>
                <dd>
                  {order.paymentMethod === "CASH"
                    ? "Cash on delivery"
                    : "Card (simulated)"}
                </dd>
              </div>
            </dl>
          </section>

          <Link
            href="/"
            className="mt-4 block rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold transition-colors hover:bg-surface-muted"
          >
            Order something else
          </Link>
        </aside>
      </div>
    </div>
  );
}
