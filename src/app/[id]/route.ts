import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

  // Check expiration for free tier
  if (!qrcode.isLifetime) {
    const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = new Date().getTime();
    const createdAt = new Date(qrcode.createdAt).getTime();

    if (now - createdAt > ONE_DAY) {
      return new NextResponse(
        `<html>
          <head>
            <title>QR Code Expired</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f4f4f5; color: #18181b; }
              .container { text-align: center; background: white; padding: 2rem 3rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
              h1 { color: #dc2626; margin-top: 0; }
              p { color: #52525b; margin-bottom: 1.5rem; }
              a { display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 0.5rem 1.5rem; border-radius: 9999px; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>QR Code Expired</h1>
              <p>This free QR code has expired after 24 hours.</p>
              <a href="/">Create your own</a>
            </div>
          </body>
        </html>`,
        {
          status: 410,
          headers: { "Content-Type": "text/html" },
        }
      );
    }
  }

  // Increment clicks
  await prisma.qRCode.update({
    where: { id },
    data: { clicks: { increment: 1 } },
  });

  return NextResponse.redirect(qrcode.destinationUrl);
}
