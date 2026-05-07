import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any)?.role !== "ADMIN") {
    console.log("Admin Access Denied:", session?.user?.email, "Role:", (session?.user as any)?.role);
    return NextResponse.json({ error: "Unauthorized: Admin role required. Try signing out and back in." }, { status: 403 });
  }

  // Get daily QR codes by type
  // Note: Using queryRaw for date grouping which is more efficient for large datasets
  const qrStats: any[] = await prisma.$queryRaw`
    SELECT 
      TO_CHAR("createdAt", 'YYYY-MM-DD') as day,
      type,
      COUNT(*)::int as count
    FROM "QRCode"
    GROUP BY day, type
    ORDER BY day DESC
    LIMIT 100;
  `;

  // Get daily new users (approximated by Subscription creation if User records are new)
  // Now that we have a User model, we can use User.createdAt
  const userStats: any[] = await prisma.$queryRaw`
    SELECT 
      TO_CHAR("createdAt", 'YYYY-MM-DD') as day,
      COUNT(*)::int as count
    FROM "User"
    GROUP BY day
    ORDER BY day DESC
    LIMIT 30;
  `;

  // Get total stats
  const totalUsers = await prisma.user.count();
  const totalQRCodes = await prisma.qRCode.count();
  const totalSubscriptions = await prisma.subscription.count({
    where: { plan: { not: "FREE" } }
  });

  return NextResponse.json({
    qrStats,
    userStats,
    totals: {
      users: totalUsers,
      qrcodes: totalQRCodes,
      premiumSubscriptions: totalSubscriptions
    }
  });
}
