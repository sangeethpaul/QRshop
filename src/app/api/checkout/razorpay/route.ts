import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Razorpay from "razorpay";
import prisma from "@/lib/prisma";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string || "test_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET as string || "test_secret",
});

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

  const { qrCodeId, tier } = await req.json();

  if (!qrCodeId || !tier || !["BASIC", "DYNAMIC"].includes(tier)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  // Verify QR code belongs to user
  const qrcode = await prisma.qRCode.findUnique({
    where: { id: qrCodeId },
  });

  if (!qrcode || qrcode.userId !== user.id) {
    return NextResponse.json({ error: "QR code not found or unauthorized" }, { status: 404 });
  }

  let amount = 0;
  if (tier === "BASIC") {
    amount = 4900; // 49 INR
  } else if (tier === "DYNAMIC") {
    amount = 9900; // 99 INR
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${qrCodeId}_${Date.now()}`,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
