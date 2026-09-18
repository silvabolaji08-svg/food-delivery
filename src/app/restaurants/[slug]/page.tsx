import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bike, Clock, MapPin, ShoppingBag, Star } from "lucide-react";

import { CartBar } from "@/components/cart-bar";
import { MenuItemRow } from "@/components/menu-item-row";
import { MenuSectionNav } from "@/components/menu-section-nav";
import { formatMoney, formatPriceRange } from "@/lib/money";
import { getRestaurantBySlug } from "@/lib/queries";

export async function generateMetadata({
  params,
}: PageProps<"/restaurants/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) {
    return { title: "Restaurant not found" };
  }

  return {
    title: restaurant.name,
    description: restaurant.description,
    openGraph: {
      title: restaurant.name,
      description: restaurant.description,
      // Falls back to the app-wide opengraph-image when this restaurant has
      // no photo of its own yet.
      ...(restaurant.imageUrl
        ? { images: [{ url: restaurant.imageUrl }] }
        : {}),
    },
  };
}

export default async function RestaurantPage({
  params,
}: PageProps<"/restaurants/[slug]">) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) notFound();

  const sections = restaurant.menuSections.filter(
    (section) => section.items.length > 0,
  );

  // The cart only needs enough of the restaurant to price and route an order.
  const cartRestaurant = {
    id: restaurant.id,
    slug: restaurant.slug,
    name: restaurant.name,
    deliveryFee: restaurant.deliveryFee,
    minimumOrder: restaurant.minimumOrder,
  };

  return (
    <div>
      <div className="relative h-56 w-full overflow-hidden sm:h-72">
        {restaurant.imageUrl && (
          <Image
            src={restaurant.imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className={`object-cover ${restaurant.isOpen ? "" : "grayscale"}`}
          />
        )}
        {/* The hero tint comes from the row, so it stays an inline style. */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: `linear-gradient(to top, ${restaurant.heroColor}, transparent 70%)`,
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-black/30" />

        <div className="absolute inset-x-0 top-0 mx-auto max-w-6xl px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-black/60"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All restaurants
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <header className="-mt-16 relative rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-semibold text-brand">
              {restaurant.cuisine}
            </span>
            {!restaurant.isOpen && (
              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">
                Currently closed
              </span>
            )}
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {restaurant.name}
          </h1>
          <p className="mt-2 max-w-2xl text-muted">{restaurant.description}</p>

          <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Rating</dt>
              <Star className="h-4 w-4 fill-accent text-accent" aria-hidden />
              <dd className="font-semibold">
                {restaurant.rating.toFixed(1)}{" "}
                <span className="font-normal text-muted">
                  ({restaurant.reviewCount.toLocaleString()} reviews)
                </span>
              </dd>
            </div>

            <div className="flex items-center gap-1.5 text-muted">
              <dt className="sr-only">Delivery time</dt>
              <Clock className="h-4 w-4" aria-hidden />
              <dd>
                {restaurant.deliveryMinMinutes}-{restaurant.deliveryMaxMinutes}{" "}
                min
              </dd>
            </div>

            <div className="flex items-center gap-1.5 text-muted">
              <dt className="sr-only">Delivery fee</dt>
              <Bike className="h-4 w-4" aria-hidden />
              <dd>
                {restaurant.deliveryFee === 0
                  ? "Free delivery"
                  : `${formatMoney(restaurant.deliveryFee)} delivery`}
              </dd>
            </div>

            <div className="flex items-center gap-1.5 text-muted">
              <dt className="sr-only">Minimum order</dt>
              <ShoppingBag className="h-4 w-4" aria-hidden />
              <dd>{formatMoney(restaurant.minimumOrder)} minimum</dd>
            </div>

            <div className="flex items-center gap-1.5 text-muted">
              <dt className="sr-only">Price level</dt>
              <dd aria-label={`Price level ${restaurant.priceRange} of 4`}>
                {formatPriceRange(restaurant.priceRange)}
              </dd>
            </div>

            <div className="flex items-center gap-1.5 text-muted">
              <dt className="sr-only">Address</dt>
              <MapPin className="h-4 w-4" aria-hidden />
              <dd>{restaurant.address}</dd>
            </div>
          </dl>

          {!restaurant.isOpen && (
            <p className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
              {restaurant.name} is not accepting orders right now. You can still
              browse the menu.
            </p>
          )}
        </header>

        {sections.length === 0 ? (
          <div className="my-12 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-medium">This menu is empty.</p>
            <p className="mt-1 text-sm text-muted">
              {restaurant.name} has not published any dishes yet.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 pb-28 lg:grid-cols-[220px_1fr]">
            {/* The bottom padding above lets the last dishes scroll clear of
                the floating cart bar instead of ending up underneath it. */}
            <MenuSectionNav
              sections={sections.map((section) => ({
                id: section.id,
                name: section.name,
                count: section.items.length,
              }))}
            />

            <div className="min-w-0">
              <h2 className="sr-only">Menu</h2>

              {sections.map((section) => (
                <section
                  key={section.id}
                  id={`section-${section.id}`}
                  className="mb-10 scroll-mt-24"
                >
                  <h3 className="text-xl font-semibold tracking-tight">
                    {section.name}
                  </h3>

                  <ul className="mt-2 divide-y divide-border">
                    {section.items.map((item) => (
                      <MenuItemRow
                        key={item.id}
                        item={item}
                        restaurant={cartRestaurant}
                        canOrder={restaurant.isOpen}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>

      <CartBar restaurantId={restaurant.id} />
    </div>
  );
}
