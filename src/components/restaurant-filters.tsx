"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Top rated" },
  { value: "delivery", label: "Fastest" },
  { value: "price", label: "Cheapest" },
] as const;

export function RestaurantFilters({ cuisines }: { cuisines: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeSearch = searchParams.get("q") ?? "";
  const activeCuisine = searchParams.get("cuisine") ?? "";
  const activeSort = searchParams.get("sort") ?? "recommended";

  const [term, setTerm] = useState(activeSearch);

  // Keep the input in step when navigation changes the query string (back
  // button, or the "clear filters" link). Adjusting during render rather than
  // in an effect avoids the extra pass React would otherwise have to discard.
  const [syncedSearch, setSyncedSearch] = useState(activeSearch);
  if (syncedSearch !== activeSearch) {
    setSyncedSearch(activeSearch);
    setTerm(activeSearch);
  }

  function applyParams(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const query = params.toString();
    startTransition(() => router.push(query ? `/?${query}` : "/"));
  }

  // Debounce typing so every keystroke does not hit the database.
  useEffect(() => {
    if (term === activeSearch) return;

    const timer = setTimeout(() => applyParams({ q: term || null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const hasFilters = Boolean(
    activeSearch || activeCuisine || activeSort !== "recommended",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search restaurants or cuisines"
            aria-label="Search restaurants"
            className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted focus:border-brand"
          />
        </div>

        <label className="sr-only" htmlFor="sort">
          Sort restaurants
        </label>
        <select
          id="sort"
          value={activeSort}
          onChange={(event) => applyParams({ sort: event.target.value })}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-brand"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          label="All"
          isActive={activeCuisine === ""}
          onClick={() => applyParams({ cuisine: null })}
        />
        {cuisines.map((cuisine) => (
          <FilterChip
            key={cuisine}
            label={cuisine}
            isActive={activeCuisine === cuisine}
            onClick={() =>
              applyParams({
                cuisine: activeCuisine === cuisine ? null : cuisine,
              })
            }
          />
        ))}

        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              applyParams({ q: null, cuisine: null, sort: null })
            }
            className="ml-1 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear
          </button>
        )}

        <span
          aria-live="polite"
          className={`text-sm text-muted transition-opacity ${
            isPending ? "opacity-100" : "opacity-0"
          }`}
        >
          Updating...
        </span>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border bg-surface text-muted hover:border-brand hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
