"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Next 16 passes `retry` (not `reset`) to re-render the failed segment.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Stands in for an error reporting service.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-danger-subtle text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>

      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 text-muted">
        That page failed to load. Trying again often clears it.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted">
          Reference: {error.digest}
        </p>
      )}

      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
      >
        <RotateCw className="h-4 w-4" aria-hidden />
        Try again
      </button>
    </div>
  );
}
