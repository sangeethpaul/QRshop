"use client";

import { useState } from "react";
import Script from "next/script";

interface CheckoutButtonProps {
  qrCodeId: string;
  tier: "BASIC" | "DYNAMIC";
  onSuccess: () => void;
  userEmail?: string;
  userName?: string;
}

const TIER_CONFIG = {
  BASIC: { label: "Basic Lifetime", price: "₹49", description: "Lifetime validity + click tracking" },
  DYNAMIC: { label: "Dynamic Lifetime", price: "₹99", description: "Lifetime validity + change URL anytime" },
};

export default function CheckoutButton({ qrCodeId, tier, onSuccess, userEmail = "", userName = "" }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const config = TIER_CONFIG[tier];

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Step 1: Create Razorpay order on the server
      const res = await fetch("/api/checkout/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeId, tier }),
      });

      const orderData = await res.json();

      if (!res.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // Step 2: Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "QRShop",
        description: `${config.label} — ${config.price}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          // Step 3: Verify payment on the server and upgrade QR code
          const verifyRes = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              qrCodeId,
              tier,
            }),
          });

          if (verifyRes.ok) {
            setShowModal(false);
            onSuccess();
          } else {
            const err = await verifyRes.json();
            alert(err.error || "Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: {
          color: "#18181b",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setShowModal(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        alert(`Payment failed: ${response.error.description}`);
        setLoading(false);
        setShowModal(false);
      });
      rzp.open();
    } catch (error: any) {
      alert(error.message || "Something went wrong. Please try again.");
      setLoading(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <button
        onClick={() => setShowModal(true)}
        className={`w-full px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
          tier === "DYNAMIC"
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-zinc-800 text-white hover:bg-zinc-700"
        }`}
      >
        Upgrade — {config.price}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="text-4xl mb-4">🔓</div>
            <h3 className="text-xl font-bold text-zinc-900 mb-1">{config.label}</h3>
            <p className="text-zinc-500 text-sm mb-6">{config.description}</p>

            <div className="bg-zinc-50 rounded-xl p-4 mb-6">
              <p className="text-3xl font-extrabold text-zinc-900">{config.price}</p>
              <p className="text-zinc-400 text-xs mt-1">One-time payment · Lifetime access</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setLoading(false); }}
                className="flex-1 py-3 rounded-xl border border-zinc-200 text-zinc-600 font-medium hover:bg-zinc-50 transition"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 disabled:opacity-50 transition"
              >
                {loading ? "Opening..." : `Pay ${config.price}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
