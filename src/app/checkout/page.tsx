import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm your delivery details and place your order.",
};

/**
 * The cart lives in the browser, so the whole checkout is a Client Component.
 * The order itself is still created by a Server Action, which re-prices every
 * line against the database before writing anything.
 */
export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Checkout
      </h1>
      <p className="mt-2 text-muted">
        Tell us where to bring it. Nothing here is charged — payments are
        simulated.
      </p>

      <CheckoutForm />
    </div>
  );
}
