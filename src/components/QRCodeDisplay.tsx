"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  content: string;
  size?: number;
  isExpired?: boolean;
}

export default function QRCodeDisplay({ content, size = 200, isExpired = false }: QRCodeDisplayProps) {
  const [src, setSrc] = useState<string>("");
  const [highResSrc, setHighResSrc] = useState<string>("");

  useEffect(() => {
    // Generate display version
    QRCode.toDataURL(content, { width: size, margin: 2 }, (err, url) => {
      if (!err) setSrc(url);
    });
    // Generate high-res version for A4 printing (approx 1500px)
    QRCode.toDataURL(content, { width: 1500, margin: 4 }, (err, url) => {
      if (!err) setHighResSrc(url);
    });
  }, [content, size]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - QRdoer</title>
          <style>
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: white; }
            img { max-width: 80%; height: auto; display: block; margin: 0 auto; }
            @page { size: A4 portrait; margin: 0; }
          </style>
        </head>
        <body>
          <img src="${highResSrc}" />
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!src) return <div className="animate-pulse bg-gray-200" style={{ width: size, height: size }} />;

  return (
    <div className="flex flex-col items-center">
      <img src={src} alt="QR Code" width={size} height={size} className="rounded-xl shadow-lg" />
      
      {!isExpired && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <a 
            href={highResSrc} 
            download="qrdoer-high-res.png" 
            className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all border border-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            High-Res PNG
          </a>
          
          <button 
            onClick={handlePrint}
            className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print A4
          </button>
        </div>
      )}
    </div>
  );
}
