import "server-only";

import { connection } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * All database reads live here so pages and server actions never talk to
 * Prisma directly. Swapping SQLite for another store means changing only
 * this file and `prisma.ts`.
 *
 * Every read awaits `connection()` first so it cannot resolve during
 * prerendering and bake build-time rows into static HTML. Restaurant
 * availability and order status both change between deploys.
 */

export type RestaurantListItem = Awaited<
  ReturnType<typeof listRestaurants>
>[number];

export type RestaurantWithMenu = NonNullable<
  Awaited<ReturnType<typeof getRestaurantBySlug>>
>;

export type OrderWithDetail = NonNullable<
  Awaited<ReturnType<typeof getOrderByNumber>>
>;

export type OrderListItem = Awaited<ReturnType<typeof listRecentOrders>>[number];

export type RestaurantFilters = {
  search?: string;
  cuisine?: string;
  sort?: "recommended" | "rating" | "delivery" | "price";
};

export async function listRestaurants(filters: RestaurantFilters = {}) {
  await connection();

  const { search, cuisine, sort = "recommended" } = filters;

  // SQLite's LIKE is case-insensitive for ASCII, which is what Prisma's
  // `contains` compiles to here. `mode: "insensitive"` is not supported.
  const where = {
    AND: [
      cuisine ? { cuisine } : {},
      search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
              { cuisine: { contains: search } },
            ],
          }
        : {},
    ],
  };

  const orderBy = {
    recommended: [{ isOpen: "desc" as const }, { rating: "desc" as const }],
    rating: [{ rating: "desc" as const }],
    delivery: [{ deliveryMinMinutes: "asc" as const }],
    price: [{ priceRange: "asc" as const }],
  }[sort];

  return prisma.restaurant.findMany({
    where,
    orderBy,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      cuisine: true,
      imageUrl: true,
      heroColor: true,
      rating: true,
      reviewCount: true,
      priceRange: true,
      deliveryMinMinutes: true,
      deliveryMaxMinutes: true,
      deliveryFee: true,
      minimumOrder: true,
      isOpen: true,
    },
  });
}

export async function listCuisines() {
  await connection();

  const rows = await prisma.restaurant.findMany({
    distinct: ["cuisine"],
    select: { cuisine: true },
    orderBy: { cuisine: "asc" },
  });

  return rows.map((row) => row.cuisine);
}

export async function getRestaurantBySlug(slug: string) {
  await connection();

  return prisma.restaurant.findUnique({
    where: { slug },
    include: {
      menuSections: {
        orderBy: { position: "asc" },
        include: {
          items: { orderBy: { name: "asc" } },
        },
      },
    },
  });
}

export async function getRestaurantById(id: string) {
  await connection();

  return prisma.restaurant.findUnique({ where: { id } });
}

/**
 * Prices are re-read from the database at checkout rather than trusted from
 * the browser, so a tampered cart cannot change what an order costs.
 */
export async function getMenuItemsByIds(ids: string[]) {
  if (ids.length === 0) return [];

  await connection();

  return prisma.menuItem.findMany({
    where: { id: { in: ids } },
    include: {
      section: {
        select: { restaurantId: true },
      },
    },
  });
}

export async function getOrderByNumber(orderNumber: string) {
  await connection();

  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      restaurant: {
        select: { name: true, slug: true, imageUrl: true, heroColor: true },
      },
      items: {
        orderBy: { nameSnapshot: "asc" },
      },
    },
  });
}

export async function listRecentOrders(limit = 20) {
  await connection();

  return prisma.order.findMany({
    orderBy: { placedAt: "desc" },
    take: limit,
    include: {
      restaurant: { select: { name: true, slug: true } },
      items: { select: { quantity: true } },
    },
  });
}
