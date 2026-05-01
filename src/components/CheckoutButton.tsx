"use client";

import { useState } from "react";
import Script from "next/script";

interface CheckoutButtonProps {
  qrCodeId: string;
  tier: "BASIC" | "DYNAMIC";
  onSuccess: () => void;
}

export default function CheckoutButton({ qrCodeId, tier, onSuccess }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Create order on the server
      const res = await fetch("/api/checkout/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeId, tier }),
      });
      
      const orderData = await res.json();
      
      if (!res.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // 2. Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Enter the Key ID generated from the Dashboard
        amount: orderData.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency: orderData.currency,
        name: "QR Code Service",
        description: `Upgrade to ${tier} tier`,
        order_id: orderData.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
        handler: async function (response: any) {
          // 3. Verify payment on the server
          const verifyRes = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              qrCodeId,
              tier
            }),
          });
          
          if (verifyRes.ok) {
            onSuccess();
          } else {
            alert("Payment verification failed");
          }
        },
        prefill: {
          name: "User",
          email: "user@example.com",
        },
        theme: {
          color: "#000000",
        },
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        alert(response.error.description);
      });
      rzp1.open();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />
      <button
        onClick={handlePayment}
        disabled={loading}
        className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "Processing..." : `Upgrade to ${tier}`}
      </button>
    </>
  );
}
