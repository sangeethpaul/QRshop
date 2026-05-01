import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const qrcodes = await prisma.qRCode.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(qrcodes);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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

  // Check how many free QR codes the user has
  if (user.email !== "sangeeth.paul@gmail.com") {
    const freeQrCodeCount = await prisma.qRCode.count({
      where: {
        userId: user.id,
        isLifetime: false,
      },
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
      userId: user.id,
    },
  });

  return NextResponse.json(qrcode, { status: 201 });
}
