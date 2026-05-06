"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV, isCalculatorPath } from "./app-nav";

export default function MobileBottomNav() {
  const pathname = usePathname();

  // إخفاء الشريط في شاشة الحاسبة (مباراة جارية) لتجربة مركّزة
  if (isCalculatorPath(pathname)) return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-navy border-t border-white/10 z-40 flex">
      {APP_NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] hover:bg-white/5 ${
              active ? "text-gold" : "text-white/80"
            }`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
