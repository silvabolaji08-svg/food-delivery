"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

/**
 * Jumps straight to a tracking page from an order number. Lookup happens on
 * the order route itself, which already renders a not-found state for a code
 * that does not exist.
 */
export function OrderLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 0) return;

    router.push(`/orders/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Track an order number, e.g. BB-4K7XQZ"
          aria-label="Order number"
          className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 font-mono text-sm uppercase outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-muted focus:border-brand"
        />
      </div>

      <button
        type="submit"
        className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
      >
        Track order
      </button>
    </form>
  );
}
