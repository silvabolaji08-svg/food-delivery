import Link from "next/link";
import { Receipt } from "lucide-react";

export default function OrderNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-muted text-muted">
        <Receipt className="h-6 w-6" aria-hidden />
      </span>

      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        No order with that number
      </h1>
      <p className="mt-2 text-muted">
        Check the code from your confirmation — order numbers look like
        <span className="font-mono"> BB-4K7XQZ</span>.
      </p>

      <Link
        href="/orders"
        className="mt-6 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
      >
        Back to orders
      </Link>
    </div>
  );
}
