"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  url: string;
  size?: number;
}

export default function QRCodeDisplay({ url, size = 200 }: QRCodeDisplayProps) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(
      url,
      {
        width: size,
        margin: 2,
        color: {
          dark: "#000000ff",
          light: "#ffffffff",
        },
      },
      (err, url) => {
        if (err) return console.error(err);
        setSrc(url);
      }
    );
  }, [url, size]);

  if (!src) return <div className="animate-pulse bg-gray-200" style={{ width: size, height: size }} />;

  return (
    <div className="flex flex-col items-center">
      <img src={src} alt="QR Code" width={size} height={size} className="rounded-xl shadow-lg" />
      <a 
        href={src} 
        download="qrcode.png" 
        className="mt-4 text-xs font-bold text-primary hover:text-white transition-all flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download QR
      </a>
    </div>
  );
}
