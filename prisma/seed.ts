import "dotenv/config";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

type SeedItem = {
  slug: string;
  name: string;
  description: string;
  price: number;
  imageQuery: string;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  isPopular?: boolean;
  isAvailable?: boolean;
};

type SeedSection = { name: string; items: SeedItem[] };

type SeedRestaurant = {
  slug: string;
  name: string;
  description: string;
  cuisine: string;
  imageQuery: string;
  heroColor: string;
  rating: number;
  reviewCount: number;
  priceRange: number;
  deliveryMinMinutes: number;
  deliveryMaxMinutes: number;
  deliveryFee: number;
  minimumOrder: number;
  address: string;
  isOpen?: boolean;
  sections: SeedSection[];
};

const here = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * Restaurants and menus are plain JSON so that `scripts/fetch-food-images.py`
 * can read the same file to work out which photos to download.
 */
const { restaurants } = JSON.parse(
  readFileSync(join(here, "seed-data.json"), "utf-8"),
) as { restaurants: SeedRestaurant[] };

/**
 * Written by the image fetcher, listing what it actually saved. Seeding works
 * without it — dishes simply come out with no photo, which the menu rows
 * already render as a plain text layout.
 */
function loadImageManifest(): Record<string, string> {
  try {
    return JSON.parse(
      readFileSync(join(here, "image-manifest.json"), "utf-8"),
    ) as Record<string, string>;
  } catch {
    console.log("No image-manifest.json yet — seeding without photos.");
    return {};
  }
}

async function main() {
  const images = loadImageManifest();
  const heroFor = (slug: string) => images[`restaurants/${slug}.webp`] ?? null;
  const dishFor = (slug: string) => images[`menu/${slug}.webp`] ?? null;

  console.log("Clearing existing data...");
  // Children before parents, since SQLite enforces the foreign keys.
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuSection.deleteMany();
  await prisma.restaurant.deleteMany();

  let withPhoto = 0;
  let withoutPhoto = 0;

  for (const restaurant of restaurants) {
    const { sections } = restaurant;

    // Listed explicitly rather than spread, so `imageQuery` (which exists only
    // for the image fetcher) cannot leak into the database.
    const created = await prisma.restaurant.create({
      data: {
        slug: restaurant.slug,
        name: restaurant.name,
        description: restaurant.description,
        cuisine: restaurant.cuisine,
        heroColor: restaurant.heroColor,
        rating: restaurant.rating,
        reviewCount: restaurant.reviewCount,
        priceRange: restaurant.priceRange,
        deliveryMinMinutes: restaurant.deliveryMinMinutes,
        deliveryMaxMinutes: restaurant.deliveryMaxMinutes,
        deliveryFee: restaurant.deliveryFee,
        minimumOrder: restaurant.minimumOrder,
        address: restaurant.address,
        isOpen: restaurant.isOpen ?? true,
        imageUrl: heroFor(restaurant.slug),
        menuSections: {
          create: sections.map((section, sectionIndex) => ({
            name: section.name,
            position: sectionIndex,
            items: {
              create: section.items.map((item) => {
                const imageUrl = dishFor(item.slug);
                if (imageUrl) withPhoto += 1;
                else withoutPhoto += 1;

                return {
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  imageUrl,
                  isVegetarian: item.isVegetarian ?? false,
                  isSpicy: item.isSpicy ?? false,
                  isPopular: item.isPopular ?? false,
                  isAvailable: item.isAvailable ?? true,
                };
              }),
            },
          })),
        },
      },
    });

    const itemCount = sections.reduce((sum, s) => sum + s.items.length, 0);
    console.log(
      `  ${created.name} (${created.cuisine}) - ${sections.length} sections, ${itemCount} items`,
    );
  }

  const [restaurantCount, sectionCount, itemCount] = await Promise.all([
    prisma.restaurant.count(),
    prisma.menuSection.count(),
    prisma.menuItem.count(),
  ]);

  console.log(
    `\nSeeded ${restaurantCount} restaurants, ${sectionCount} sections, ${itemCount} menu items.`,
  );
  console.log(`Dish photos: ${withPhoto} present, ${withoutPhoto} missing.`);

  if (withoutPhoto > 0) {
    console.log("Run `python scripts/fetch-food-images.py` to fill them in.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
