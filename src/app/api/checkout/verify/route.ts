import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const { 
    razorpay_order_id, 
    razorpay_subscription_id,
    razorpay_payment_id, 
    razorpay_signature, 
    plan 
  } = await req.json();

  if (!(razorpay_order_id || razorpay_subscription_id) || !razorpay_payment_id || !razorpay_signature || !plan) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET as string || "test_secret";
  const isSubscription = !!razorpay_subscription_id;

  // Verify Signature
  const signData = isSubscription 
    ? razorpay_payment_id + "|" + razorpay_subscription_id
    : razorpay_order_id + "|" + razorpay_payment_id;

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(signData)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Update User Subscription in Database
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updatedSubscription = await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: plan,
      razorpaySubscriptionId: razorpay_subscription_id || null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    create: {
      userId,
      plan: plan,
      razorpaySubscriptionId: razorpay_subscription_id || null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ success: true, updatedSubscription });
}
