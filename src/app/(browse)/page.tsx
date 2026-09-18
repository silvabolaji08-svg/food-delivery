import { Suspense } from "react";

import { RestaurantCard } from "@/components/restaurant-card";
import { RestaurantFilters } from "@/components/restaurant-filters";
import { listCuisines, listRestaurants } from "@/lib/queries";
import type { RestaurantFilters as Filters } from "@/lib/queries";

const SORTS = ["recommended", "rating", "delivery", "price"] as const;

function parseSort(value?: string): Filters["sort"] {
  return (SORTS as readonly string[]).includes(value ?? "")
    ? (value as Filters["sort"])
    : "recommended";
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;

  const search = typeof params.q === "string" ? params.q : undefined;
  const cuisine = typeof params.cuisine === "string" ? params.cuisine : undefined;
  const sort = parseSort(typeof params.sort === "string" ? params.sort : undefined);

  const [restaurants, cuisines] = await Promise.all([
    listRestaurants({ search, cuisine, sort }),
    listCuisines(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <section className="rounded-3xl bg-brand-subtle px-6 py-10 sm:px-10 sm:py-14">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Good food, brought to your door.
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Order from {restaurants.length > 0 ? "local" : "our"} kitchens and
          follow your delivery from the moment it leaves the pass.
        </p>
      </section>

      <section className="mt-8">
        <Suspense fallback={<div className="h-28" />}>
          <RestaurantFilters cuisines={cuisines} />
        </Suspense>
      </section>

      <section className="mt-8">
        <h2 className="sr-only">Restaurants</h2>

        {restaurants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-medium">No restaurants match that search.</p>
            <p className="mt-1 text-sm text-muted">
              Try a different cuisine or clear your filters.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              {restaurants.length}{" "}
              {restaurants.length === 1 ? "restaurant" : "restaurants"}
              {cuisine ? ` serving ${cuisine}` : ""}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
