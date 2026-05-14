import type { Viewport } from "next";

// device-width يشتغل على التلفزيون (1920px) والجوال (390px) صح
// لا داعي لتثبيت 1920 — Tailwind breakpoints تشتغل حسب العرض الفعلي للشاشة
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
