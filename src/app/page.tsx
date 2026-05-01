"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import CheckoutButton from "@/components/CheckoutButton";

export default function Home() {
  const { data: session, status } = useSession();
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");

  const fetchQRCodes = async () => {
    try {
      const res = await fetch("/api/qrcodes");
      if (res.ok) {
        const data = await res.json();
        setQrCodes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (session) {
      fetchQRCodes();
    }
  }, [session]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/qrcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationUrl: urlInput }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate");
      } else {
        setUrlInput("");
        fetchQRCodes();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUrl = async (id: string) => {
    try {
      const res = await fetch(`/api/qrcodes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationUrl: editUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error);
        return;
      }
      
      setEditingId(null);
      fetchQRCodes();
    } catch (err) {
      console.error(err);
    }
  };

  const isExpired = (createdAt: string, isLifetime: boolean) => {
    if (isLifetime) return false;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    return now - created > ONE_DAY;
  };

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-zinc-900 mb-6">Premium QR Code Generator</h1>
        <p className="text-xl text-zinc-600 max-w-2xl mb-12">
          Create trackable QR codes in seconds. Upgrade for lifetime access and dynamic routing.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mb-12 w-full">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200">
            <h3 className="text-2xl font-bold mb-2">Free</h3>
            <p className="text-zinc-500 mb-6">24 hour expiration</p>
            <ul className="text-left space-y-3 mb-8">
              <li>✓ Basic QR Generation</li>
              <li>✓ Click Tracking</li>
              <li>✓ Max 3 QR Codes</li>
            </ul>
          </div>
          <div className="bg-zinc-900 text-white p-8 rounded-2xl shadow-xl transform scale-105">
            <h3 className="text-2xl font-bold mb-2">Basic</h3>
            <p className="text-zinc-400 mb-6">49 INR / Lifetime</p>
            <ul className="text-left space-y-3 mb-8">
              <li>✓ Lifetime Validity</li>
              <li>✓ Click Tracking</li>
              <li>✓ Static Destination</li>
            </ul>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200">
            <h3 className="text-2xl font-bold mb-2">Dynamic</h3>
            <p className="text-zinc-500 mb-6">99 INR / Lifetime</p>
            <ul className="text-left space-y-3 mb-8">
              <li>✓ Lifetime Validity</li>
              <li>✓ Click Tracking</li>
              <li>✓ Change URL Anytime</li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => signIn()}
          className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition shadow-lg"
        >
          Sign In to Get Started
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12 bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
            <p className="text-zinc-500">Welcome, {session.user?.name || session.user?.email}</p>
          </div>
          <button onClick={() => signOut()} className="text-zinc-500 hover:text-zinc-900 transition font-medium">
            Sign Out
          </button>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 mb-12">
          <h2 className="text-2xl font-bold mb-6">Generate New QR Code</h2>
          <form onSubmit={handleGenerate} className="flex gap-4">
            <input
              type="text"
              required
              placeholder="example.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 p-4 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-zinc-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-zinc-800 disabled:opacity-50 transition"
            >
              {loading ? "Generating..." : "Generate Free QR Code"}
            </button>
          </form>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>

        <h2 className="text-2xl font-bold mb-6">Your QR Codes</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {qrCodes.map((qr) => {
            const expired = isExpired(qr.createdAt, qr.isLifetime);
            const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/${qr.id}` : '';

            return (
              <div key={qr.id} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 flex flex-col items-center text-center">
                <div className="mb-4">
                  <QRCodeDisplay url={redirectUrl} size={150} />
                </div>
                
                <div className="mb-4 w-full">
                  <p className="text-sm text-zinc-500 mb-1">Destination:</p>
                  {editingId === qr.id ? (
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-zinc-300 rounded px-2 py-1 text-sm"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                      />
                      <button onClick={() => handleUpdateUrl(qr.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Save</button>
                      <button onClick={() => setEditingId(null)} className="bg-zinc-200 px-3 py-1 rounded text-sm">Cancel</button>
                    </div>
                  ) : (
                    <a href={qr.destinationUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium break-all">
                      {qr.destinationUrl}
                    </a>
                  )}
                </div>

                <div className="flex justify-between w-full text-sm font-medium mb-6 text-zinc-600 bg-zinc-50 p-3 rounded-lg">
                  <span>Clicks: {qr.clicks}</span>
                  <span className={expired ? "text-red-500" : "text-green-600"}>
                    {qr.isDynamic ? "Dynamic" : qr.isLifetime ? "Basic" : expired ? "Expired" : "Active (24h)"}
                  </span>
                </div>

                <div className="mt-auto w-full space-y-3">
                  {!qr.isLifetime && (
                    <div className="flex flex-col gap-2">
                      <CheckoutButton qrCodeId={qr.id} tier="BASIC" onSuccess={fetchQRCodes} />
                      <CheckoutButton qrCodeId={qr.id} tier="DYNAMIC" onSuccess={fetchQRCodes} />
                    </div>
                  )}
                  {qr.isLifetime && !qr.isDynamic && (
                    <CheckoutButton qrCodeId={qr.id} tier="DYNAMIC" onSuccess={fetchQRCodes} />
                  )}
                  {qr.isDynamic && editingId !== qr.id && (
                    <button
                      onClick={() => {
                        setEditingId(qr.id);
                        setEditUrl(qr.destinationUrl);
                      }}
                      className="w-full px-4 py-2 border border-zinc-300 rounded-md text-sm font-medium hover:bg-zinc-50 transition"
                    >
                      Edit URL
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {qrCodes.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500">
              No QR codes generated yet. Create your first one above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
