import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const qrcode = await prisma.qRCode.findUnique({
    where: { id },
  });

  if (!qrcode) {
    return new NextResponse("QR Code Not Found", { status: 404 });
  }

  // Expiration check removed - all QR codes are now permanent


  // Increment clicks
  await prisma.qRCode.update({
    where: { id },
    data: { clicks: { increment: 1 } },
  });

  if (qrcode.type !== "URL") {
    const data = qrcode.targetData ? JSON.parse(qrcode.targetData) : {};
    let contentHtml = "";

    switch (qrcode.type) {
      case "WIFI":
        const encryption = data.encryption === 'nopass' ? '' : `T:${data.encryption || 'WPA'};`;
        const password = data.encryption === 'nopass' ? '' : `P:${data.password || ''};`;
        const hidden = data.hidden ? 'H:true;' : '';
        const wifiUri = `WIFI:${encryption}S:${data.ssid};${password}${hidden};`;
        contentHtml = `
          <div class="info-card">
            <div class="icon">📶</div>
            <h2>WiFi Network</h2>
            <div class="field">
              <label>SSID (Network Name)</label>
              <div class="value">${data.ssid || "N/A"}</div>
            </div>
            <div class="field">
              <label>Password</label>
              <div class="value password-field">
                <span id="pass">${data.password || "No Password"}</span>
                <button onclick="copyPass()" class="copy-btn">Copy</button>
              </div>
            </div>
            <div class="field">
              <label>Encryption</label>
              <div class="value">${data.encryption || "WPA"}</div>
            </div>
            <a href="${wifiUri}" class="primary-btn connect-btn">Connect to WiFi</a>
            <p class="hint">Click above to join network automatically</p>
            <div id="ios-note" class="ios-note" style="display: none;">
              <p>Note: iOS Safari does not support automatic joining. Please use the "Copy" button for the password above.</p>
            </div>
          </div>
          <script>
            // Check if iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
              document.getElementById('ios-note').style.display = 'block';
              document.querySelector('.connect-btn').style.display = 'none';
              document.querySelector('.hint').style.display = 'none';
            } else {
              // Auto-trigger WiFi connection prompt on load for non-iOS
              window.onload = () => {
                setTimeout(() => {
                  window.location.href = "${wifiUri}";
                }, 1000);
              };
            }
          </script>
        `;
        break;
      case "VCARD":
        contentHtml = `
          <div class="info-card">
            <div class="icon">📇</div>
            <h2>Contact Information</h2>
            <div class="field">
              <label>Name</label>
              <div class="value">${data.name || "N/A"}</div>
            </div>
            <div class="field">
              <label>Phone</label>
              <div class="value">${data.phone || "N/A"}</div>
            </div>
            <div class="field">
              <label>Email</label>
              <div class="value">${data.email || "N/A"}</div>
            </div>
            <button class="primary-btn" onclick="downloadVCard()">Save Contact</button>
          </div>
        `;
        break;
      case "TEXT":
        contentHtml = `
          <div class="info-card">
            <div class="icon">📝</div>
            <h2>Plain Text</h2>
            <div class="value text-content">${data.text || "N/A"}</div>
            <button class="primary-btn" onclick="copyText()">Copy Text</button>
          </div>
        `;
        break;
      case "EMAIL":
        contentHtml = `
          <div class="info-card">
            <div class="icon">📧</div>
            <h2>Email Draft</h2>
            <div class="field">
              <label>To</label>
              <div class="value">${data.to || "N/A"}</div>
            </div>
            <div class="field">
              <label>Subject</label>
              <div class="value">${data.subject || "N/A"}</div>
            </div>
            <div class="field">
              <label>Body</label>
              <div class="value">${data.body || "N/A"}</div>
            </div>
            <a href="mailto:${data.to}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}" class="primary-btn">Send Email</a>
          </div>
        `;
        break;
      case "SMS":
        contentHtml = `
          <div class="info-card">
            <div class="icon">💬</div>
            <h2>SMS Message</h2>
            <div class="field">
              <label>Recipient</label>
              <div class="value">${data.phone || "N/A"}</div>
            </div>
            <div class="field">
              <label>Message</label>
              <div class="value">${data.message || "N/A"}</div>
            </div>
            <a href="sms:${data.phone}?body=${encodeURIComponent(data.message)}" class="primary-btn">Send SMS</a>
          </div>
        `;
        break;
    }

    return new NextResponse(
      `<html>
        <head>
          <title>QRdoer - View Content</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            :root { --primary: #6366f1; --bg: #f8fafc; --text: #0f172a; }
            body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .container { width: 100%; max-width: 400px; }
            .info-card { background: white; padding: 2rem; border-radius: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h2 { margin: 0 0 1.5rem 0; font-weight: 800; letter-spacing: -0.025em; }
            .field { text-align: left; margin-bottom: 1.25rem; }
            label { display: block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
            .value { font-size: 1.125rem; font-weight: 600; color: #1e293b; word-break: break-all; }
            .password-field { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 0.75rem 1rem; border-radius: 0.75rem; }
            button, .primary-btn { width: 100%; background: var(--primary); color: white; border: none; padding: 1rem; border-radius: 1rem; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; margin-top: 1rem; text-decoration: none; display: block; box-sizing: border-box; }
            .copy-btn { width: auto; margin-top: 0; padding: 0.5rem 1rem; font-size: 0.75rem; border-radius: 0.5rem; background: #e2e8f0; color: #475569; }
            .connect-btn { background: #10b981; margin-top: 2rem; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2); }
            button:hover, .primary-btn:hover { filter: brightness(1.1); transform: translateY(-2px); }
            .text-content { background: #f1f5f9; padding: 1.5rem; border-radius: 1rem; text-align: left; line-height: 1.5; margin-bottom: 1rem; }
            .hint { font-size: 0.75rem; color: #94a3b8; margin-top: 0.75rem; font-weight: 500; }
            .ios-note { margin-top: 1.5rem; padding: 1rem; background: #fff7ed; border-radius: 0.75rem; border: 1px solid #fed7aa; color: #9a3412; font-size: 0.875rem; font-weight: 500; line-height: 1.4; }
            .footer { text-align: center; margin-top: 2rem; color: #94a3b8; font-size: 0.875rem; }
            .footer a { color: var(--primary); text-decoration: none; font-weight: 700; }
          </style>
          <script>
            function copyPass() {
              const pass = document.getElementById('pass').innerText;
              navigator.clipboard.writeText(pass);
              alert('Password copied!');
            }
            function copyText() {
              const text = document.querySelector('.text-content').innerText;
              navigator.clipboard.writeText(text);
              alert('Text copied!');
            }
            function downloadVCard() {
              const vcard = \`BEGIN:VCARD\\nVERSION:3.0\\nFN:${data.name}\\nTEL:${data.phone}\\nEMAIL:${data.email}\\nEND:VCARD\`;
              const blob = new Blob([vcard], { type: 'text/vcard' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'contact.vcf';
              a.click();
            }
          </script>
        </head>
        <body>
          <div class="container">
            ${contentHtml}
            <div class="footer">
              Powered by <a href="/">QRdoer</a>
            </div>
          </div>
        </body>
      </html>`,
      {
        headers: { 
          "Content-Type": "text/html",
          "X-Robots-Tag": "noindex"
        },
      }

    );
  }

  return NextResponse.redirect(qrcode.destinationUrl, {
    headers: {
      'X-Robots-Tag': 'noindex'
    }
  });

}
