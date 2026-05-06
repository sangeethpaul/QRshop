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
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan, currency = "INR" } = await req.json();

  if (!plan || !["PRO", "BUSINESS"].includes(plan)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    // True Recurring Subscription (Only for INR for now)
    if (currency === "INR") {
      const planIdKey = `RAZORPAY_PLAN_${plan}_INR`;
      const planId = process.env[planIdKey];

      if (!planId) {
        console.error(`Plan ID missing for ${planIdKey}`);
        return NextResponse.json({ error: "Subscription plan not configured" }, { status: 500 });
      }

      const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: 60, // 5 years
        quantity: 1,
        customer_notify: 1,
      });

      return NextResponse.json({ ...subscription, isSubscription: true });
    }

    // Fallback: One-time payment for USD (until PayPal/Stripe is set up)
    let amount = 0;
    if (currency === "USD") {
      amount = plan === "PRO" ? 500 : 1000; // $5 or $10 in cents
    } else {
      amount = plan === "PRO" ? 19900 : 59900; // ₹199 or ₹599 in paise
    }

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: `receipt_${userId}_${Date.now()}`,
    });

    return NextResponse.json({ ...order, isSubscription: false });
  } catch (error) {
    console.error("Razorpay error:", error);
    return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
  }
}
