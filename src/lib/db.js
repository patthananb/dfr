import { PrismaClient } from "@prisma/client";

// Cache the Prisma client on globalThis in dev so Next.js HMR doesn't spawn a
// new connection pool on every reload. In production a single instance is
// created per process.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__dfrPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__dfrPrisma = prisma;
}
