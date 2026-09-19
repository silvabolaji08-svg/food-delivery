import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 requires an explicit driver adapter. Postgres rather than SQLite,
 * because the app runs on serverless where the filesystem is read-only and
 * thrown away between invocations, so a local database file cannot be written
 * to or survive a request.
 */
function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });
}

// Next.js hot-reloads modules in dev, which would otherwise open a new
// connection pool on every edit until the database refuses more.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
