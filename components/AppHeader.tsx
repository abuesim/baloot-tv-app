"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";
import { APP_NAV, isCalculatorPath } from "./app-nav";

type Props = {
  appName: string;
  displayName: string;
  isAdmin: boolean;
};

export default function AppHeader({ appName, displayName, isAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const onCalculator = isCalculatorPath(pathname);

  // ====== شاشة الحاسبة: header مبسّط بزر خروج فقط ======
  if (onCalculator) {
    function exitGame() {
      if (
        confirm(
          "هل تريد الخروج من المباراة؟\nالمباراة محفوظة وتقدر ترجع لها لاحقاً.",
        )
      ) {
        router.push("/home");
      }
    }
    return (
      <header className="card-elev border-b border-white/5 px-4 py-3 flex items-center justify-end">
        <button
          onClick={exitGame}
          className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2"
        >
          <LogOut size={16} />
          خروج
        </button>
      </header>
    );
  }

  // ====== الـ header الكامل لباقي الصفحات ======
  return (
    <header className="card-elev border-b border-white/5 px-4 md:px-6 py-3 flex items-center justify-between">
      <Link href="/home">
        <Logo size="md" text={appName} />
      </Link>
      <nav className="hidden md:flex gap-1">
        {APP_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-white/10 ${
                active ? "text-gold" : "text-white/80 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden sm:inline text-white/60">{displayName}</span>
        {isAdmin && (
          <Link
            href="/admin"
            className="bg-gold/20 text-gold px-3 py-1 rounded-lg text-xs"
          >
            أدمن
          </Link>
        )}
        <LogoutButton className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg" />
      </div>
    </header>
  );
}
