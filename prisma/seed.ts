import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const users = [
    { name: "Ava Admin", email: "admin@rankmenow.io", role: "ADMIN" as const },
    { name: "Mason Manager", email: "manager@rankmenow.io", role: "MANAGER" as const },
    { name: "Riley Rep", email: "rep@rankmenow.io", role: "REP" as const },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
      },
    });
  }

  console.log("Seed completed: user records are upserted only.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
