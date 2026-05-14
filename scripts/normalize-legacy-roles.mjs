import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      target_role text;
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'UserRole' AND e.enumlabel = 'USER'
      ) THEN
        target_role := 'USER';
      ELSE
        target_role := 'ADMIN';
      END IF;

      EXECUTE format(
        'UPDATE "User" SET "role" = %L::"UserRole" WHERE "role"::text IN (''MANAGER'', ''REP'')',
        target_role
      );
    END $$;
  `);
  console.log("Legacy roles normalized.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
