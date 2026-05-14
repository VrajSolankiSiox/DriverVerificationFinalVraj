import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "role" = 'USER'
    WHERE "role"::text IN ('MANAGER', 'REP');
  `);
  console.log("Legacy roles normalized to USER.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

