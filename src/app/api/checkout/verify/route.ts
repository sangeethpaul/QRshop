import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, qrCodeId, tier } = await req.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !qrCodeId || !tier) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET as string || "test_secret";

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Update DB
  const isDynamic = tier === "DYNAMIC";

  const updatedQrCode = await prisma.qRCode.update({
    where: { id: qrCodeId },
    data: {
      isLifetime: true,
      isDynamic: isDynamic,
    },
  });

  return NextResponse.json({ success: true, updatedQrCode });
}
