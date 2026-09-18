import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-muted text-muted">
        <Compass className="h-6 w-6" aria-hidden />
      </span>

      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        We could not find that page
      </h1>
      <p className="mt-2 text-muted">
        The link may be out of date, or the page may have moved.
      </p>

      <Link
        href="/"
        className="mt-6 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
      >
        Back to restaurants
      </Link>
    </div>
  );
}
