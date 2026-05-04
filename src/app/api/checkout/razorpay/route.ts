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

  const { plan } = await req.json();

  if (!plan || !["PRO", "BUSINESS"].includes(plan)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }



  let amount = 0;
  if (plan === "PRO") {
    amount = 19900; // 199 INR
  } else if (plan === "BUSINESS") {
    amount = 59900; // 599 INR
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${userId}_${Date.now()}`,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
