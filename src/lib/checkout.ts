/**
 * Shared checkout contract between the form and the Server Action.
 *
 * This deliberately does not live in `src/app/actions.ts`: a `"use server"`
 * module may only export async functions, so a plain constant declared there
 * never reaches the client and arrives as `undefined`.
 */

export type CartLineInput = { menuItemId: string; quantity: number };

export type CheckoutField =
  | "customerName"
  | "customerPhone"
  | "customerEmail"
  | "addressLine"
  | "city"
  | "postcode";

/**
 * Shape returned to `useActionState`. A successful order never produces a
 * state, because `redirect` unwinds the action before it can return.
 */
export type PlaceOrderState = {
  error: string | null;
  fieldErrors: Partial<Record<CheckoutField, string>>;
};

export const EMPTY_CHECKOUT_STATE: PlaceOrderState = {
  error: null,
  fieldErrors: {},
};
