import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

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

  const qrcode = await prisma.qRCode.findUnique({
    where: { id },
  });

  if (!qrcode) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }

  if (qrcode.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!qrcode.isDynamic) {
    return NextResponse.json(
      { error: "This QR code is not dynamic. You cannot edit the destination URL." },
      { status: 403 }
    );
  }

  const updatedQrCode = await prisma.qRCode.update({
    where: { id },
    data: { destinationUrl },
  });

  return NextResponse.json(updatedQrCode);
}
