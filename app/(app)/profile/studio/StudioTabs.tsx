"use client";

import Link from "next/link";
import { SlidersHorizontal, WandSparkles } from "lucide-react";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/profile/studio", label: "إعدادات البث", icon: SlidersHorizontal },
  { href: "/profile/studio/layout", label: "محرر الشاشة", icon: WandSparkles },
];

export default function StudioTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="أقسام الاستديو" className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-navy p-2">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              active ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
