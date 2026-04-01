import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.supplierinvoice.count();
    const invoices = await prisma.supplierinvoice.findMany({
      take: 5,
      include: { party: true }
    });
    console.log('COUNT:', count);
    console.log('SAMPLE:', JSON.stringify(invoices, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
