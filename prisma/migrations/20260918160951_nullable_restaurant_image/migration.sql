-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Restaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "imageUrl" TEXT,
    "heroColor" TEXT NOT NULL DEFAULT '#f97316',
    "rating" REAL NOT NULL DEFAULT 4.5,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "priceRange" INTEGER NOT NULL DEFAULT 2,
    "deliveryMinMinutes" INTEGER NOT NULL DEFAULT 20,
    "deliveryMaxMinutes" INTEGER NOT NULL DEFAULT 40,
    "deliveryFee" INTEGER NOT NULL DEFAULT 299,
    "minimumOrder" INTEGER NOT NULL DEFAULT 1000,
    "address" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Restaurant" ("address", "createdAt", "cuisine", "deliveryFee", "deliveryMaxMinutes", "deliveryMinMinutes", "description", "heroColor", "id", "imageUrl", "isOpen", "minimumOrder", "name", "priceRange", "rating", "reviewCount", "slug") SELECT "address", "createdAt", "cuisine", "deliveryFee", "deliveryMaxMinutes", "deliveryMinMinutes", "description", "heroColor", "id", "imageUrl", "isOpen", "minimumOrder", "name", "priceRange", "rating", "reviewCount", "slug" FROM "Restaurant";
DROP TABLE "Restaurant";
ALTER TABLE "new_Restaurant" RENAME TO "Restaurant";
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");
CREATE INDEX "Restaurant_cuisine_idx" ON "Restaurant"("cuisine");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
