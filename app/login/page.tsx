import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/Logo";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/home");

  const settings = await getSettings();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" text={settings.appName} />
          <p className="text-white/50 mt-3 text-sm">{settings.appTagline}</p>
          <span className="mt-1.5 text-xs text-white/25 tracking-widest">الإصدار 5.7</span>
        </div>
        <LoginForm />

        <Link
          href="/play"
          className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-white/70 hover:text-white text-base font-bold"
        >
          🃏 حاسبة البلوت بدون تسجيل
        </Link>
      </div>

      {/* فوتر المبرمج */}
      <p className="text-center text-xs text-white/20 leading-relaxed">
        تصميم وبرمجة · محمد المسند
        <br />
        <span className="font-mono tracking-wide">0565406221</span>
      </p>
    </div>
  );
}
