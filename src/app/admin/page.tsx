"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated" || (session && (session.user as any)?.role !== "ADMIN")) {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/stats");
        const contentType = res.headers.get("content-type");
        
        if (!res.ok) {
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            throw new Error(data.error || `Error ${res.status}`);
          }
          throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
        }

        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setStats(data);
        } else {
          throw new Error("Invalid response from server (expected JSON)");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session && (session.user as any)?.role === "ADMIN") {
      fetchStats();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500 animate-pulse">Loading Analytics...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-rose-500 font-bold">{error}</div>;
  }

  if (!stats) return null;

  // Process QR stats for display
  const qrByDay: Record<string, any> = {};
  stats.qrStats.forEach((s: any) => {
    if (!qrByDay[s.day]) qrByDay[s.day] = { total: 0 };
    qrByDay[s.day][s.type] = s.count;
    qrByDay[s.day].total += s.count;
  });

  const days = Object.keys(qrByDay).sort().reverse();
  const maxQrs = Math.max(...Object.values(qrByDay).map((d: any) => d.total), 1);

  return (
    <div className="min-h-screen p-8 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black gradient-text">Admin Analytics</h1>
            <p className="text-slate-500 font-medium">Monitoring QRShop growth and activity</p>
          </div>
          <button 
            onClick={() => router.push("/")}
            className="px-6 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition"
          >
            Back to App
          </button>
        </header>

        {/* Top Level Totals */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {[
            { label: "Total Users", value: stats.totals.users, icon: "👤", color: "bg-blue-500" },
            { label: "QR Codes Generated", value: stats.totals.qrcodes, icon: "🔢", color: "bg-indigo-500" },
            { label: "Premium Subscriptions", value: stats.totals.premiumSubscriptions, icon: "💎", color: "bg-emerald-500" },
          ].map((card) => (
            <div key={card.label} className="glass p-8 rounded-3xl bg-white flex items-center gap-6 shadow-sm">
              <div className={`w-16 h-16 ${card.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-100`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="text-3xl font-black">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Daily QR Code Trends */}
          <div className="glass p-8 rounded-[2.5rem] bg-white shadow-sm overflow-hidden">
            <h2 className="text-xl font-black mb-8 flex items-center gap-3">
              📅 Daily QR Generation
              <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-400">Last 100 Days</span>
            </h2>
            <div className="space-y-6">
              {days.slice(0, 10).map(day => (
                <div key={day} className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-slate-500">{day}</span>
                    <span className="text-slate-900">{qrByDay[day].total} codes</span>
                  </div>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    {Object.entries(qrByDay[day]).map(([type, count]: [string, any]) => {
                      if (type === 'total') return null;
                      const width = (count / maxQrs) * 100;
                      const colors: any = {
                        URL: 'bg-indigo-500',
                        WIFI: 'bg-emerald-500',
                        VCARD: 'bg-orange-500',
                        TEXT: 'bg-slate-500',
                        EMAIL: 'bg-rose-500',
                        SMS: 'bg-sky-500'
                      };
                      return (
                        <div 
                          key={type} 
                          title={`${type}: ${count}`}
                          className={`${colors[type] || 'bg-slate-300'} h-full transition-all`}
                          style={{ width: `${width}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              {days.length === 0 && <p className="text-slate-400 italic text-center py-12">No activity data yet</p>}
            </div>
            
            <div className="mt-8 flex flex-wrap gap-4 pt-6 border-t border-slate-100">
              {['URL', 'WIFI', 'VCARD', 'TEXT', 'EMAIL', 'SMS'].map(type => (
                <div key={type} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-slate-400">
                  <div className={`w-2 h-2 rounded-full ${
                    type === 'URL' ? 'bg-indigo-500' :
                    type === 'WIFI' ? 'bg-emerald-500' :
                    type === 'VCARD' ? 'bg-orange-500' :
                    type === 'TEXT' ? 'bg-slate-500' :
                    type === 'EMAIL' ? 'bg-rose-500' :
                    'bg-sky-500'
                  }`} />
                  {type}
                </div>
              ))}
            </div>
          </div>

          {/* New User Growth */}
          <div className="glass p-8 rounded-[2.5rem] bg-white shadow-sm">
            <h2 className="text-xl font-black mb-8 flex items-center gap-3">
              🚀 New User Registrations
              <span className="text-xs font-bold px-2 py-1 bg-indigo-50 rounded-lg text-indigo-400">Last 30 Days</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Signups</th>
                    <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.userStats.map((s: any) => (
                    <tr key={s.day} className="group">
                      <td className="py-4 font-bold text-slate-600">{s.day}</td>
                      <td className="py-4 font-black text-slate-900">{s.count}</td>
                      <td className="py-4 text-right">
                        <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black">
                          +{s.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {stats.userStats.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-400 italic">No user data yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
