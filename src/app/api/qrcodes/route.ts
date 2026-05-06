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

  let { 
    type = "URL", 
    destinationUrl, 
    targetData, 
    isDynamic = true, 
    isLifetime = false 
  } = await req.json();

  if (type === "URL" && destinationUrl) {
    // Replace backslashes with forward slashes
    destinationUrl = destinationUrl.replace(/\\/g, "/");

    // Ensure URL has a protocol
    if (!/^https?:\/\//i.test(destinationUrl)) {
      destinationUrl = `http://${destinationUrl}`;
    }
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

  // Enforce limits for non-static codes (static codes don't use server resources for redirect)
  // Actually, we might still want to limit total codes per user.
  const limits: Record<string, number> = {
    FREE: 10, // Increased limits for new multi-type model
    PRO: 100,
    BUSINESS: 500,
  };

  const currentLimit = limits[subscription.plan] || 10;
  
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
      type,
      destinationUrl: destinationUrl || "",
      targetData: targetData ? JSON.stringify(targetData) : null,
      userId,
      userEmail: session?.user?.email || "",
      isDynamic,
      isLifetime,
    },
  });

  return NextResponse.json(qrcode, { status: 201 });
}
