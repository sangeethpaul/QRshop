
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuery() {
  try {
    console.log('Testing raw query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Basic query result:', result);

    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Available tables:', tables);

    const qrStats = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM-DD') as day,
        type,
        COUNT(*)::int as count
      FROM "QRCode"
      GROUP BY day, type
      ORDER BY day DESC
      LIMIT 5;
    `;
    console.log('QR Stats sample:', qrStats);

  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
