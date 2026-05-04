/**
 * One-time migration script: adds otaRatings JSONB column to Hotel table.
 * Run with: node scripts/migrate-add-ota-ratings.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding otaRatings column to Hotel table...");
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Hotel" ADD COLUMN IF NOT EXISTS "otaRatings" JSONB;`
  );
  console.log("Done — otaRatings column is now present.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
