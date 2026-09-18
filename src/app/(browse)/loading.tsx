/**
 * Skeleton for the restaurant list while its query runs.
 *
 * This deliberately lives inside the `(browse)` group rather than at the app
 * root. A `loading` boundary flushes the response shell early, which locks the
 * status at 200, so a root-level one would turn every `notFound()` on a
 * nested route into a soft 404.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="h-40 animate-pulse rounded-3xl bg-surface-muted" />

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-2xl bg-surface-muted"
          />
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        Loading
      </p>
    </div>
  );
}
