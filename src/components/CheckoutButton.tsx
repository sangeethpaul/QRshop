"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

const PLAN_CONFIG = {
  PRO: { 
    label: "Pro Plan", 
    INR: { price: 199, label: "₹199" },
    USD: { price: 5, label: "$5" },
    shortLabel: "Go Pro", 
    description: "25 dynamic QRs, custom domain, no expiry" 
  },
  BUSINESS: { 
    label: "Business Plan", 
    INR: { price: 599, label: "₹599" },
    USD: { price: 15, label: "$15" },
    shortLabel: "Go Business", 
    description: "100 dynamic QRs, bulk creation, API access" 
  },
};

export default function CheckoutButton({ plan, onSuccess, userEmail = "", userName = "", variant = "full" }: { plan: "PRO" | "BUSINESS", onSuccess: () => void, userEmail?: string, userName?: string, variant?: "full" | "compact" }) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz !== "Asia/Calcutta" && tz !== "Asia/Kolkata") {
      setCurrency("USD");
    }
  }, []);

  const config = PLAN_CONFIG[plan];
  const currentPrice = config[currency];

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Step 1: Create Razorpay order on the server
      const res = await fetch("/api/checkout/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, currency }),
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
        description: `${config.label} — ${currentPrice.label}/mo`,
        order_id: orderData.id,
        handler: async function (response: any) {
          // Step 3: Verify payment on the server and upgrade subscription
          const verifyRes = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
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

  const isCompact = variant === "compact";

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <button
        onClick={() => setShowModal(true)}
        className={`${isCompact ? 'px-4 py-2 rounded-xl text-[11px]' : 'w-full py-4 px-4 rounded-2xl text-[13px]'} font-black leading-tight transition-all hover:scale-[1.02] ${
          plan === "BUSINESS"
            ? "btn-primary text-white shadow-lg shadow-indigo-200"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
        }`}
      >
        {isCompact ? config.shortLabel : (
          plan === "BUSINESS" 
            ? `Upgrade to ${config.label} at ${currentPrice.label}/mo` 
            : `Upgrade to ${config.label} at ${currentPrice.label}/mo`
        )}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="glass rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center relative overflow-hidden border-slate-200 bg-white">
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 blur-[80px]"></div>
            
            <div className="text-5xl mb-6">🚀</div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">{config.label}</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">{config.description}</p>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8">
              <p className="text-4xl font-black text-slate-900">{currentPrice.label}</p>
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
