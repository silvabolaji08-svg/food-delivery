/** SQLite has no enums, so order status is a String validated here. */
export const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The happy path, in order — used to render the tracking timeline. */
export const ORDER_FLOW = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const satisfies readonly OrderStatus[];

/** Kept as the old name so existing imports keep working. */
export const TRACKED_STATUSES: readonly OrderStatus[] = ORDER_FLOW;

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: "Order placed",
  CONFIRMED: "Restaurant confirmed",
  PREPARING: "Preparing your food",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  PLACED: "We sent your order to the kitchen.",
  CONFIRMED: "The restaurant accepted your order.",
  PREPARING: "Your food is being cooked right now.",
  OUT_FOR_DELIVERY: "Your courier is on the way to you.",
  DELIVERED: "Enjoy your meal!",
  CANCELLED: "This order was cancelled.",
};

/** Short labels for the compact badge shown in the orders list. */
export const STATUS_BADGES: Record<OrderStatus, string> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

/** Position along the happy path, or -1 for a cancelled order. */
export function statusIndex(status: OrderStatus): number {
  return (ORDER_FLOW as readonly OrderStatus[]).indexOf(status);
}

export function isTerminal(status: OrderStatus): boolean {
  return status === "DELIVERED" || status === "CANCELLED";
}

/** A customer may cancel until the courier has collected the food. */
export function isCancellable(status: OrderStatus): boolean {
  return status === "PLACED" || status === "CONFIRMED" || status === "PREPARING";
}

/**
 * Falls back to `PLACED` for an unrecognised value so a bad row renders
 * something sensible rather than crashing the tracking page.
 */
export function toOrderStatus(value: string): OrderStatus {
  return isOrderStatus(value) ? value : "PLACED";
}
