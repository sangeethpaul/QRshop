"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import CheckoutButton from "@/components/CheckoutButton";

export default function Home() {
  const { data: session, status } = useSession();
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>({ plan: "FREE" });
  const [selectedType, setSelectedType] = useState("URL");
  const [selectedMode, setSelectedMode] = useState("DYNAMIC");
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const QR_TYPES = [
    { id: 'URL', label: 'URL', icon: '🌐' },
    { id: 'WIFI', label: 'WiFi', icon: '📶' },
    { id: 'VCARD', label: 'vCard', icon: '📇' },
    { id: 'TEXT', label: 'Text', icon: '📝' },
    { id: 'EMAIL', label: 'Email', icon: '📧' },
    { id: 'SMS', label: 'SMS', icon: '💬' },
  ];

  const MODES = [
    { id: 'FREE', label: 'Free (24h)', icon: '⏳', desc: 'Expires in 24h. Dynamic.' },
    { id: 'STATIC', label: 'Static', icon: '🔒', desc: 'Permanent. Non-trackable.' },
    { id: 'DYNAMIC', label: 'Dynamic', icon: '⚡', desc: 'Trackable. Editable anytime.' },
  ];

  const formatStaticContent = (type: string, data: any) => {
    switch (type) {
      case 'WIFI':
        return `WIFI:S:${data.ssid};T:${data.encryption || 'WPA'};P:${data.password || ''};H:${data.hidden ? 'true' : 'false'};;`;
      case 'VCARD':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${data.name || ''}\nTEL:${data.phone || ''}\nEMAIL:${data.email || ''}\nEND:VCARD`;
      case 'TEXT':
        return data.text || '';
      case 'EMAIL':
        return `mailto:${data.to || ''}?subject=${encodeURIComponent(data.subject || '')}&body=${encodeURIComponent(data.body || '')}`;
      case 'SMS':
        return `smsto:${data.phone || ''}:${data.message || ''}`;
      default:
        return data.url || '';
    }
  };

  const isExpired = (createdAt: string, isLifetime: boolean) => {
    if (isLifetime) return false;
    if (subscription.plan === "PRO" || subscription.plan === "BUSINESS") return false;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    return now - created > ONE_DAY;
  };

  const limits: Record<string, number> = {
    FREE: 10,
    PRO: 100,
    BUSINESS: 500,
  };

  const currentLimit = limits[subscription.plan] || 10;
  const expiredCount = qrCodes.filter(qr => isExpired(qr.createdAt, qr.isLifetime)).length;
  const hasReachedLimit = qrCodes.length >= currentLimit;

  const fetchQRCodes = async () => {
    try {
      const res = await fetch("/api/qrcodes");
      if (res.ok) {
        const data = await res.json();
        setQrCodes(data.qrcodes || []);
        setSubscription(data.subscription || { plan: "FREE" });
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
      let payload: any = {
        type: selectedType,
        isDynamic: selectedMode !== "STATIC",
        isLifetime: selectedMode === "DYNAMIC",
        targetData: formData,
      };

      if (selectedType === "URL") {
        payload.destinationUrl = formData.url;
      } else if (selectedMode === "STATIC") {
        payload.destinationUrl = formatStaticContent(selectedType, formData);
      } else {
        // Dynamic non-URL types will be handled by the redirect route showing a landing page
        payload.destinationUrl = "#"; 
      }

      const res = await fetch("/api/qrcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate");
      } else {
        setFormData({});
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


  if (status === "loading") return <div className="min-h-screen flex items-center justify-center text-slate-900">Loading...</div>;

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[20%] w-[35rem] h-[35rem] bg-secondary/10 rounded-full blur-[120px] animate-pulse"></div>
        </div>

        <h1 className="text-6xl font-black tracking-tight mb-2 gradient-text">QRdoer</h1>
        <p className="text-xl font-bold text-indigo-600 mb-6 tracking-wide uppercase text-sm">QR Code Generator - Get it done</p>
        <p className="text-xl text-slate-500 max-w-2xl mb-16 leading-relaxed">
          Create powerful, trackable QR codes in seconds. <br />
          Experience the next generation of dynamic routing and analytics.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mb-16 w-full">
          {[
            { 
              name: "Free", 
              price: "0 INR", 
              sub: "Basic access",
              features: ["3 Dynamic QR Codes", "24h Expiration", "Basic Tracking"],
              highlight: false 
            },
            { 
              name: "Pro", 
              price: "199 INR", 
              sub: "Per month",
              features: ["25 Dynamic QR Codes", "No Expiration", "Edit Anytime", "Custom Short Domain"],
              highlight: true 
            },
            { 
              name: "Business", 
              price: "599 INR", 
              sub: "Per month",
              features: ["100 Dynamic QR Codes", "Bulk Creation", "API Access", "Team Members"],
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
          <button
            onClick={() => signIn()}
            className="group relative px-12 py-5 rounded-2xl text-xl font-bold text-white overflow-hidden"
          >
            <div className="absolute inset-0 gradient-primary transition-all group-hover:scale-105"></div>
            <span className="relative flex items-center gap-3">
              Get Started Now
              <svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
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
            <h1 className="text-3xl font-black gradient-text">QRdoer Dashboard</h1>
            <p className="text-slate-500 font-medium">
              Plan: <span className="text-indigo-600 font-black">{subscription.plan}</span> • {qrCodes.length}/{currentLimit} Codes
            </p>
          </div>
          <button 
            onClick={() => signOut()} 
            className="px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition font-bold text-sm"
          >
            Sign Out
          </button>
        </div>

        <div className="glass p-8 rounded-[2.5rem] mb-12 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px]"></div>
          
          <div className="flex flex-col gap-8">
            {/* QR Type Tabs */}
            <div className="flex flex-wrap gap-2">
              {QR_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedType(t.id); setFormData({}); }}
                  className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
                    selectedType === t.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {QR_TYPES.find(t => t.id === selectedType)?.icon}
                    {QR_TYPES.find(t => t.id === selectedType)?.label} Details
                  </h3>
                  
                  {selectedType === 'URL' && (
                    <input
                      type="url"
                      required
                      placeholder="https://example.com"
                      value={formData.url || ""}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  )}

                  {selectedType === 'WIFI' && (
                    <div className="space-y-3">
                      <input
                        placeholder="SSID (Network Name)"
                        required
                        value={formData.ssid || ""}
                        onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={formData.password || ""}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                      />
                      <select
                        value={formData.encryption || "WPA"}
                        onChange={(e) => setFormData({ ...formData, encryption: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary font-bold text-slate-600"
                      >
                        <option value="WPA">WPA/WPA2</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">No Encryption</option>
                      </select>
                    </div>
                  )}

                  {selectedType === 'VCARD' && (
                    <div className="space-y-3">
                      <input
                        placeholder="Full Name"
                        required
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        placeholder="Phone Number"
                        required
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        required
                        value={formData.email || ""}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}

                  {selectedType === 'TEXT' && (
                    <textarea
                      placeholder="Enter your plain text here..."
                      required
                      rows={4}
                      value={formData.text || ""}
                      onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}

                  {selectedType === 'EMAIL' && (
                    <div className="space-y-3">
                      <input
                        type="email"
                        placeholder="Recipient Email"
                        required
                        value={formData.to || ""}
                        onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        placeholder="Subject"
                        value={formData.subject || ""}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                      />
                      <textarea
                        placeholder="Email Body"
                        rows={3}
                        value={formData.body || ""}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}

                  {selectedType === 'SMS' && (
                    <div className="space-y-3">
                      <input
                        placeholder="Phone Number"
                        required
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                      />
                      <textarea
                        placeholder="Message Content"
                        required
                        rows={3}
                        value={formData.message || ""}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    ⚙️ Generation Mode
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {MODES.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMode(m.id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedMode === m.id
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xl">{m.icon}</span>
                          <span className={`font-black uppercase tracking-tight ${selectedMode === m.id ? 'text-indigo-600' : 'text-slate-900'}`}>
                            {m.label}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  type="submit"
                  disabled={loading || hasReachedLimit}
                  className="w-full py-5 rounded-3xl font-black btn-primary text-white disabled:opacity-50 text-xl shadow-xl shadow-indigo-200 transition-all hover:scale-[1.01]"
                >
                  {loading ? "Creating..." : hasReachedLimit ? "Limit Reached" : `Generate ${selectedMode.charAt(0) + selectedMode.slice(1).toLowerCase()} QR`}
                </button>
                {error && <p className="text-rose-500 font-bold flex items-center justify-center gap-2 text-sm animate-bounce">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {error}
                </p>}
              </div>
            </form>
          </div>
        </div>
        
        {(expiredCount > 0 || hasReachedLimit) && (
          <div className="mb-8 p-6 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
                  {expiredCount > 0 ? "⚠️" : "🚀"}
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {expiredCount > 0 
                      ? `${expiredCount} QR Code${expiredCount > 1 ? 's have' : ' has'} expired` 
                      : "You've reached your plan limit"}
                  </h3>
                  <p className="text-indigo-100 text-sm font-medium">
                    Upgrade to a premium plan to unlock more slots and remove expiration.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20 whitespace-nowrap"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        )}

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
              <div key={qr.id} id={`qr-${qr.id}`} className={`glass p-6 rounded-3xl flex flex-col items-center text-center group hover:border-primary/50 transition-all duration-300 bg-white relative ${expired ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                {expired && (
                  <div className="absolute top-4 right-4 z-20">
                    <span className="bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-rose-200">
                      Expired
                    </span>
                  </div>
                )}
                <div className={`mb-6 p-4 bg-white rounded-2xl shadow-xl ${expired ? 'shadow-slate-100' : 'shadow-indigo-100/50'}`}>
                  <QRCodeDisplay 
                    content={qr.isDynamic ? redirectUrl : qr.destinationUrl} 
                    size={240} 
                    isExpired={expired} 
                  />
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
                    <span className="text-[10px] uppercase text-slate-400 mb-1">Type & Status</span>
                    <span className={expired ? "text-rose-500" : "text-emerald-600"}>
                      {qr.type} • {qr.isDynamic ? "Dynamic" : "Static"}
                    </span>
                  </div>
                </div>

                <div className="mt-auto w-full">
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

      {showUpgradeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass rounded-[3rem] shadow-2xl w-full max-w-4xl p-8 md:p-12 relative overflow-hidden bg-white border-slate-200 flex flex-col max-h-[90vh]">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 blur-[100px]"></div>
            
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-200">
                  ⚡
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">Upgrade Your Plan</h3>
                  <p className="text-slate-500 text-sm font-medium">Select a plan to unlock more features</p>
                </div>
              </div>
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid md:grid-cols-2 gap-8">
                {[
                  {
                    id: "PRO",
                    name: "Pro Plan",
                    price: "199 INR",
                    features: ["25 Dynamic QR Codes", "No Expiration", "Custom Short Domain", "Basic Analytics"],
                    highlight: true
                  },
                  {
                    id: "BUSINESS",
                    name: "Business Plan",
                    price: "599 INR",
                    features: ["100 Dynamic QR Codes", "API Access", "Bulk Creation", "Team Members", "Premium Reports"],
                    highlight: false
                  }
                ].map((plan) => (
                  <div key={plan.id} className={`p-8 rounded-[2rem] border transition-all ${plan.highlight ? 'bg-indigo-50/30 border-indigo-100 ring-2 ring-indigo-500/10' : 'bg-slate-50 border-slate-100'}`}>
                    <h4 className="text-xl font-black text-slate-900 mb-2">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                      <span className="text-slate-500 text-sm font-bold">/mo</span>
                    </div>
                    <ul className="space-y-4 mb-8">
                      {plan.features.map(f => (
                        <li key={f} className="text-sm font-bold text-slate-600 flex items-center gap-3">
                          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <CheckoutButton 
                      plan={plan.id as any} 
                      onSuccess={() => { fetchQRCodes(); setShowUpgradeModal(false); }} 
                      userEmail={session.user?.email || ""} 
                      userName={session.user?.name || ""} 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 shrink-0">
              <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                Cancel anytime. All plans include priority support and high-resolution downloads.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
