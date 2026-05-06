import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const readex = Readex_Pro({
  subsets: ["arabic", "latin"],
  variable: "--font-readex",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "أكك لايف | Akak Live",
  description: "تسجيل نقاط البلوت المباشر",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "أكك لايف",
  },
  icons: {
    apple: "/icon-192x192.png",
    icon: "/icon-512x512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${readex.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans bg-bg text-white flex flex-col relative">
        <div className="bg-grid pointer-events-none fixed inset-0 z-0" />
        <div className="bg-glow pointer-events-none fixed inset-0 z-0" />
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
