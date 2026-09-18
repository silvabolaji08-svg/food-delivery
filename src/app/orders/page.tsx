import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";

import { OrderLookup } from "@/components/order-lookup";
import { formatMoney } from "@/lib/money";
import { listRecentOrders } from "@/lib/queries";
import { STATUS_BADGES, isTerminal, toOrderStatus } from "@/lib/order-status";

export const metadata: Metadata = {
  title: "Orders",
  description: "Every order placed in this demo, newest first.",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default async function OrdersPage() {
  const orders = await listRecentOrders();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Orders</h1>
      <p className="mt-2 text-muted">
        This demo has no sign-in, so every order placed here is listed below.
      </p>

      <div className="mt-6">
        <OrderLookup />
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-muted text-muted">
            <Receipt className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 font-medium">No orders yet</p>
          <p className="mt-1 text-sm text-muted">
            Once you place an order it will show up here so you can track it.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
          >
            Browse restaurants
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((order) => {
            const status = toOrderStatus(order.status);
            const itemCount = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );

            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.orderNumber}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-brand"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {order.orderNumber}
                      </span>
                      <StatusBadge status={status} />
                    </div>

                    <p className="mt-1 truncate font-medium">
                      {order.restaurant.name}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
                      {dateFormat.format(order.placedAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold tabular-nums">
                      {formatMoney(order.total)}
                    </p>
                  </div>

                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-muted"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof toOrderStatus> }) {
  const tone =
    status === "CANCELLED"
      ? "bg-danger-subtle text-danger"
      : status === "DELIVERED"
        ? "bg-success-subtle text-success"
        : "bg-brand-subtle text-brand";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
    >
      {STATUS_BADGES[status]}
      {!isTerminal(status) && (
        <span className="sr-only"> — this order is still in progress</span>
      )}
    </span>
  );
}
