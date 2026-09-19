import Image from "next/image";
import Link from "next/link";
import { Bike, Clock, Star } from "lucide-react";

import { formatMoney, formatPriceRange } from "@/lib/money";
import type { RestaurantListItem } from "@/lib/queries";

export function RestaurantCard({
  restaurant,
  index = 0,
}: {
  restaurant: RestaurantListItem;
  /** Position in the grid, used to stagger the entrance. */
  index?: number;
}) {
  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      // Capped so a long list does not leave the last cards waiting seconds.
      style={{ animationDelay: `${Math.min(index, 11) * 55}ms` }}
      className="animate-rise-in group overflow-hidden rounded-2xl border border-border bg-surface transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
        {restaurant.imageUrl ? (
          <Image
            src={restaurant.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw"
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              restaurant.isOpen ? "" : "grayscale"
            }`}
          />
        ) : (
          // No photo yet: a panel in the restaurant's own colour reads as a
          // deliberate choice, where a broken image or grey box would not.
          <div
            className="absolute inset-0 grid place-items-center"
            style={{
              background: `linear-gradient(135deg, ${restaurant.heroColor}, color-mix(in oklab, ${restaurant.heroColor} 55%, black))`,
            }}
          >
            <span className="text-3xl font-bold text-white/90">
              {restaurant.name.charAt(0)}
            </span>
          </div>
        )}

        {!restaurant.isOpen && (
          <div className="absolute inset-0 grid place-items-center bg-black/55">
            <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-foreground">
              Currently closed
            </span>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold">
          {restaurant.cuisine}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-tight">{restaurant.name}</h3>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold">
            <Star
              className="h-4 w-4 fill-accent text-accent"
              aria-hidden
            />
            {restaurant.rating.toFixed(1)}
            <span className="font-normal text-muted">
              ({restaurant.reviewCount.toLocaleString()})
            </span>
          </span>
        </div>

        <p className="mt-1 line-clamp-2 text-sm text-muted">
          {restaurant.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden />
            {restaurant.deliveryMinMinutes}-{restaurant.deliveryMaxMinutes} min
          </span>
          <span className="flex items-center gap-1.5">
            <Bike className="h-4 w-4" aria-hidden />
            {restaurant.deliveryFee === 0
              ? "Free delivery"
              : `${formatMoney(restaurant.deliveryFee)} delivery`}
          </span>
          <span aria-label={`Price level ${restaurant.priceRange} of 4`}>
            {formatPriceRange(restaurant.priceRange)}
          </span>
        </div>
      </div>
    </Link>
  );
}
