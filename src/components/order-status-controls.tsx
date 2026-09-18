"use client";

import { useTransition } from "react";
import { ChevronRight, RotateCw, XCircle } from "lucide-react";

import { advanceOrderStatus, cancelOrder } from "@/app/actions";
import {
  ORDER_FLOW,
  STATUS_LABELS,
  isCancellable,
  isTerminal,
  statusIndex,
  type OrderStatus,
} from "@/lib/order-status";

/**
 * Stands in for the restaurant POS and the courier app. Both buttons call
 * Server Actions that revalidate this route, so the timeline above re-renders
 * from the database rather than from local state.
 */
export function OrderStatusControls({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();

  const current = statusIndex(status);
  const next =
    current >= 0 && current < ORDER_FLOW.length - 1
      ? ORDER_FLOW[current + 1]
      : null;

  if (isTerminal(status)) {
    return (
      <p className="mt-6 rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
        This order is {status === "DELIVERED" ? "complete" : "closed"}. Nothing
        more will happen to it.
      </p>
    );
  }

  return (
    <div className="mt-6 border-t border-border pt-5">
      <p className="text-xs uppercase tracking-wide text-muted">
        Demo controls
      </p>
      <p className="mt-1 text-sm text-muted">
        There is no real kitchen behind this order — move it along yourself.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {next && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await advanceOrderStatus(orderNumber);
              })
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          >
            {pending ? (
              <RotateCw className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
            Advance to “{STATUS_LABELS[next]}”
          </button>
        )}

        {isCancellable(status) && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await cancelOrder(orderNumber);
              })
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-danger hover:bg-danger-subtle hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" aria-hidden />
            Cancel order
          </button>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {pending ? "Updating order status" : `Order status: ${STATUS_LABELS[status]}`}
      </p>
    </div>
  );
}
