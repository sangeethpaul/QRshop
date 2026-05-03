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

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center text-slate-900">Loading...</div>;

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[20%] w-[35rem] h-[35rem] bg-secondary/10 rounded-full blur-[120px] animate-pulse"></div>
        </div>

        <h1 className="text-6xl font-black tracking-tight mb-6 gradient-text">Premium QR Shop</h1>
        <p className="text-xl text-slate-500 max-w-2xl mb-16 leading-relaxed">
          Create powerful, trackable QR codes in seconds. <br />
          Experience the next generation of dynamic routing and analytics.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mb-16 w-full">
          {[
            { 
              name: "Free", 
              price: "0 INR", 
              sub: "24 hour expiration",
              features: ["Basic QR Generation", "Click Tracking", "Max 3 QR Codes"],
              highlight: false 
            },
            { 
              name: "Basic", 
              price: "49 INR", 
              sub: "Lifetime / QR",
              features: ["Lifetime Validity", "Click Tracking", "Static Destination"],
              highlight: true 
            },
            { 
              name: "Dynamic", 
              price: "99 INR", 
              sub: "Lifetime / QR",
              features: ["Lifetime Validity", "Click Tracking", "Change URL Anytime"],
              highlight: false 
            }
          ].map((plan) => (
            <button
              key={plan.name}
              onClick={() => signIn()}
              className={`group flex flex-col items-center p-8 rounded-3xl transition-all duration-500 text-center glass glass-hover relative overflow-hidden ${
                plan.highlight ? 'ring-2 ring-primary/30 scale-105 z-10 bg-white' : 'scale-100'
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-0 w-full h-1 gradient-primary"></div>
              )}
              <h3 className="text-2xl font-bold mb-1 text-slate-900">{plan.name}</h3>
              <p className="text-3xl font-black mb-1 text-slate-900">{plan.price}</p>
              <p className="text-slate-400 text-sm mb-8 font-medium">{plan.sub}</p>
              
              <ul className="text-left space-y-4 mb-8 w-full">
                {plan.features.map((f) => (
                  <li key={f} className="text-slate-600 text-sm flex items-center gap-3">
                    <svg className="w-5 h-5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div className={`mt-auto w-full py-4 rounded-2xl font-bold transition-all ${
                plan.highlight 
                ? 'btn-primary text-white' 
                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
              }`}>
                Choose {plan.name}
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          </button>
          <p className="text-slate-400 text-sm">Join 1,000+ creators and businesses</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 text-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12 glass p-6 rounded-3xl">
          <div>
            <h1 className="text-3xl font-black gradient-text">Dashboard</h1>
            <p className="text-slate-500 font-medium">Welcome back, {session.user?.name || session.user?.email}</p>
          </div>
          <button 
            onClick={() => signOut()} 
            className="px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition font-bold text-sm"
          >
            Sign Out
          </button>
        </div>

        <div className="glass p-8 rounded-3xl mb-12 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px]"></div>
          <h2 className="text-2xl font-bold mb-6 text-slate-900">Generate QR Code</h2>
          <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-4 relative">
            <div className="flex-1 relative group">
              <input
                type="text"
                required
                placeholder="Paste your URL here (e.g. google.com)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826L10.242 9.172a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102 1.101" />
              </svg>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-4 rounded-2xl font-bold btn-primary text-white disabled:opacity-50 text-lg"
            >
              {loading ? "Generating..." : "Generate Free"}
            </button>
          </form>
          {error && <p className="text-rose-500 mt-4 font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </p>}
        </div>

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            Your QR Codes
            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-sm">{qrCodes.length}</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {qrCodes.map((qr) => {
            const expired = isExpired(qr.createdAt, qr.isLifetime);
            const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/${qr.id}` : '';

            return (
              <div key={qr.id} className="glass p-6 rounded-3xl flex flex-col items-center text-center group hover:border-primary/50 transition-all duration-300 bg-white">
                <div className="mb-6 p-4 bg-white rounded-2xl shadow-xl shadow-indigo-100/50">
                  <QRCodeDisplay url={redirectUrl} size={240} />
                </div>
                
                <div className="mb-6 w-full px-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Destination</p>
                  {editingId === qr.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-slate-900"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateUrl(qr.id)} className="flex-1 bg-primary text-white py-2 rounded-xl text-xs font-bold">Save</button>
                        <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 text-slate-500 py-2 rounded-xl text-xs font-bold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <a href={qr.destinationUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-500 transition-colors text-sm font-bold break-all line-clamp-1">
                      {qr.destinationUrl}
                    </a>
                  )}
                </div>

                <div className="flex justify-between w-full text-xs font-bold mb-6 text-slate-500 bg-slate-50 p-4 rounded-2xl">
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] uppercase text-slate-400 mb-1">Engagements</span>
                    <span className="text-slate-900 text-base">{qr.clicks}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase text-slate-400 mb-1">Status</span>
                    <span className={expired ? "text-rose-500" : "text-emerald-600"}>
                      {qr.isDynamic ? "Dynamic" : qr.isLifetime ? "Lifetime" : expired ? "Expired" : "Free (24h)"}
                    </span>
                  </div>
                </div>

                <div className="mt-auto w-full space-y-3">
                  {!qr.isLifetime && (
                    <div className="flex flex-col gap-3">
                      <CheckoutButton qrCodeId={qr.id} tier="BASIC" onSuccess={fetchQRCodes} userEmail={session.user?.email || ""} userName={session.user?.name || ""} />
                      <CheckoutButton qrCodeId={qr.id} tier="DYNAMIC" onSuccess={fetchQRCodes} userEmail={session.user?.email || ""} userName={session.user?.name || ""} />
                    </div>
                  )}
                  {qr.isLifetime && !qr.isDynamic && (
                    <CheckoutButton qrCodeId={qr.id} tier="DYNAMIC" onSuccess={fetchQRCodes} userEmail={session.user?.email || ""} userName={session.user?.name || ""} />
                  )}
                  {qr.isDynamic && editingId !== qr.id && (
                    <button
                      onClick={() => {
                        setEditingId(qr.id);
                        setEditUrl(qr.destinationUrl);
                      }}
                      className="w-full py-3 rounded-2xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-all hover:scale-[1.02]"
                    >
                      Update Destination
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {qrCodes.length === 0 && (
            <div className="col-span-full text-center py-24 glass rounded-3xl border-dashed border-2 border-slate-200">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No QR Codes Yet</h3>
              <p className="text-slate-500">Generate your first premium QR code above!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
