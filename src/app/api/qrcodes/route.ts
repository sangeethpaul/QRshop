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

  return NextResponse.json(qrcodes);
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

  // Check free QR code limit (max 3 per user, admins exempt)
  const adminEmails = ["sangeeth.paul@gmail.com"];
  const userEmail = session?.user?.email || "";

  if (!adminEmails.includes(userEmail)) {
    const freeQrCodeCount = await prisma.qRCode.count({
      where: { userId, isLifetime: false },
    });

    if (freeQrCodeCount >= 3) {
      return NextResponse.json(
        { error: "You have reached the maximum limit of 3 free QR codes." },
        { status: 403 }
      );
    }
  }

  const qrcode = await prisma.qRCode.create({
    data: {
      destinationUrl,
      userId,
      userEmail: session?.user?.email || "",
    },
  });

  return NextResponse.json(qrcode, { status: 201 });
}
