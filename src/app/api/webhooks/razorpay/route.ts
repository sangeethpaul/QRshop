import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify Webhook Signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  console.log("Razorpay Webhook Event:", event.event);

  try {
    // Handle Subscription Charged (Renewal)
    if (event.event === "subscription.charged") {
      const { id: subscriptionId } = event.payload.subscription.entity;
      
      // Extend expiration by 30 days
      await prisma.subscription.update({
        where: { razorpaySubscriptionId: subscriptionId },
        data: {
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
      });
      
      console.log(`Subscription renewed: ${subscriptionId}`);
    }

    // Handle Subscription Cancelled
    if (event.event === "subscription.cancelled") {
      const { id: subscriptionId } = event.payload.subscription.entity;
      
      await prisma.subscription.update({
        where: { razorpaySubscriptionId: subscriptionId },
        data: {
          plan: "FREE",
          expiresAt: new Date(), // Expire immediately
        }
      });
      
      console.log(`Subscription cancelled: ${subscriptionId}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
