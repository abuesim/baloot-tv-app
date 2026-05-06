import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Settings,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo } from "@/components/Logo";

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
  { href: "/admin/banners", label: "الإعلانات", icon: Megaphone },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex-1 flex flex-col pb-20 md:pb-0">
      <header className="card-elev border-b border-white/5 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 md:gap-8 min-w-0">
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
            <Logo size="md" showText={false} />
            <span className="text-lg md:text-xl font-bold">أدمن</span>
          </Link>
          <nav className="hidden md:flex gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 inline-flex items-center gap-2"
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <span className="hidden sm:inline text-white/60 truncate max-w-24">
            {admin.displayName}
          </span>
          <LogoutButton className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg" />
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-navy border-t border-white/10 z-40 flex">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] hover:bg-white/5"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
