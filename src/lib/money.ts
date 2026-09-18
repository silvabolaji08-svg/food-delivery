/** All money in this app is stored and passed around as integer cents. */

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatPriceRange(priceRange: number): string {
  return "$".repeat(Math.max(1, Math.min(4, priceRange)));
}

/** Flat service fee: 8% of subtotal, capped so large orders are not punished. */
export const SERVICE_FEE_RATE = 0.08;
export const SERVICE_FEE_CAP = 500;

export function calculateServiceFee(subtotal: number): number {
  return Math.min(Math.round(subtotal * SERVICE_FEE_RATE), SERVICE_FEE_CAP);
}

export type OrderTotals = {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
};

export function calculateTotals(
  subtotal: number,
  deliveryFee: number,
): OrderTotals {
  const serviceFee = calculateServiceFee(subtotal);
  return {
    subtotal,
    deliveryFee,
    serviceFee,
    total: subtotal + deliveryFee + serviceFee,
  };
}
