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
        name: "QRdoer",
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
          color: "#6366f1",
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
        className={`w-full py-4 px-4 rounded-2xl text-[13px] font-black leading-tight transition-all hover:scale-[1.02] ${
          tier === "DYNAMIC"
            ? "btn-primary text-white shadow-lg shadow-indigo-200"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
        }`}
      >
        {tier === "DYNAMIC" 
          ? "Buy a Dynamic QR code for lifetime at 99 INR" 
          : "Buy a Static QR code for lifetime at 49 INR"}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="glass rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center relative overflow-hidden border-slate-200 bg-white">
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 blur-[80px]"></div>
            
            <div className="text-5xl mb-6">🚀</div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">{config.label}</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">{config.description}</p>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8">
              <p className="text-4xl font-black text-slate-900">{config.price}</p>
              <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-bold">One-time payment · Lifetime access</p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full py-4 rounded-2xl font-bold btn-primary text-white disabled:opacity-50 transition-all"
              >
                {loading ? "Processing..." : `Complete Purchase`}
              </button>
              <button
                onClick={() => { setShowModal(false); setLoading(false); }}
                className="w-full py-3 rounded-2xl text-slate-400 font-bold hover:text-slate-600 transition-colors"
                disabled={loading}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
