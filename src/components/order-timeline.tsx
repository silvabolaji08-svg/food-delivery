import { Check, XCircle } from "lucide-react";

import {
  ORDER_FLOW,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  statusIndex,
  type OrderStatus,
} from "@/lib/order-status";

/**
 * The happy-path timeline. A cancelled order leaves the flow entirely, so it
 * gets its own panel rather than a half-filled progress track.
 */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-xl bg-danger-subtle px-4 py-3">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
        <div>
          <p className="font-medium text-danger">
            {STATUS_LABELS.CANCELLED}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {STATUS_DESCRIPTIONS.CANCELLED}
          </p>
        </div>
      </div>
    );
  }

  const current = statusIndex(status);

  return (
    <ol className="mt-4">
      {ORDER_FLOW.map((step, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        const isLast = index === ORDER_FLOW.length - 1;

        return (
          <li key={step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                  isDone || isCurrent
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border bg-surface text-muted"
                }`}
              >
                {isDone ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </span>

              {!isLast && (
                <span
                  aria-hidden
                  className={`w-0.5 flex-1 ${
                    isDone ? "bg-brand" : "bg-border"
                  }`}
                />
              )}
            </div>

            <div className={isLast ? "pb-1" : "pb-6"}>
              <p
                className={`font-medium leading-8 ${
                  isDone || isCurrent ? "" : "text-muted"
                }`}
              >
                {STATUS_LABELS[step]}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-semibold text-brand">
                    Now
                  </span>
                )}
              </p>

              {isCurrent && (
                <p className="text-sm text-muted">
                  {STATUS_DESCRIPTIONS[step]}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
