import type { Viewport } from "next";

// viewport مخصص لشاشة TV — نفرض عرض 1920 حتى تشتغل Tailwind breakpoints صح
export const viewport: Viewport = {
  width: 1920,
  initialScale: 1,
  minimumScale: 1,
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
