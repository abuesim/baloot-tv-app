"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ProfileTabs({ showStudio }: { showStudio: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/profile", label: "👤 ملفي", visible: true },
    { href: "/profile/studio", label: "🎬 الاستوديو", visible: showStudio },
  ].filter((t) => t.visible);

  return (
    <div className="flex gap-1 border-b border-white/10 -mt-2">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-5 py-3 text-sm border-b-2 -mb-px transition ${
              active
                ? "border-accent text-white font-bold"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
