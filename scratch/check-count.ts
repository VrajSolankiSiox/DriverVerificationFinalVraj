import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.rateObservation.count({
    where: { 
        captureDate: { 
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) 
        } 
    }
  });
  console.log('Count:', count);
  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
