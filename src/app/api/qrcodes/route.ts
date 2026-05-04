import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

function getUserId(session: any): string | null {
  return (session?.user as any)?.id || null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qrcodes = await prisma.qRCode.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  return NextResponse.json({ 
    qrcodes, 
    subscription: subscription || { plan: "FREE" } 
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let { destinationUrl } = await req.json();

  if (!destinationUrl || typeof destinationUrl !== "string") {
    return NextResponse.json({ error: "Invalid destination URL" }, { status: 400 });
  }

  // Replace backslashes with forward slashes
  destinationUrl = destinationUrl.replace(/\\/g, "/");

  // Ensure URL has a protocol
  if (!/^https?:\/\//i.test(destinationUrl)) {
    destinationUrl = `http://${destinationUrl}`;
  }

  // Fetch user subscription
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  // Default to FREE if no subscription found
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: { userId, plan: "FREE" },
    });
  }

  // Enforce limits
  const limits: Record<string, number> = {
    FREE: 3,
    PRO: 25,
    BUSINESS: 100,
  };

  const currentLimit = limits[subscription.plan] || 3;
  
  // Count current QR codes (only those created under this plan model)
  const qrCodeCount = await prisma.qRCode.count({
    where: { userId },
  });

  if (qrCodeCount >= currentLimit) {
    return NextResponse.json(
      { error: `You have reached the limit for your ${subscription.plan} plan (${currentLimit} QR codes).` },
      { status: 403 }
    );
  }

  const qrcode = await prisma.qRCode.create({
    data: {
      destinationUrl,
      userId,
      userEmail: session?.user?.email || "",
      isDynamic: true, // All new codes are dynamic under the new model
    },
  });

  return NextResponse.json(qrcode, { status: 201 });
}
