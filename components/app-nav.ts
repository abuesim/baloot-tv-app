import {
  Home,
  PlayCircle,
  BarChart3,
  UserCircle,
  Clock,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const APP_NAV: NavItem[] = [
  { href: "/home", label: "الرئيسية", icon: Home },
  { href: "/games/new", label: "صكة", icon: PlayCircle },
  { href: "/tournaments", label: "بطولات", icon: Trophy },
  { href: "/history", label: "السجل", icon: Clock },
  { href: "/stats", label: "إحصائيات", icon: BarChart3 },
  { href: "/profile", label: "ملفي", icon: UserCircle },
];

/** اعرف إذا كان المسار شاشة الحاسبة (صكة جارية) */
export function isCalculatorPath(pathname: string): boolean {
  return /^\/games\/[^/]+$/.test(pathname) && pathname !== "/games/new";
}
