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

  let amount = 0;
  if (currency === "USD") {
    amount = plan === "PRO" ? 500 : 1500; // $5 or $15 in cents
  } else {
    amount = plan === "PRO" ? 19900 : 59900; // ₹199 or ₹599 in paise
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: `receipt_${userId}_${Date.now()}`,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
