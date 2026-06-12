import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function TournamentsPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">البطولات</h1>
        <p className="text-white/60">نظّم بطولة بين فرقك</p>
      </div>

      <div className="bg-navy rounded-2xl p-8 text-center border border-white/10 space-y-4">
        <div className="text-5xl">🏗️</div>
        <p className="text-white/70">نظام البطولات قيد البناء — جاهز قريباً</p>
        <Link
          href="/teams"
          className="inline-block btn-grad px-6 py-2.5 rounded-xl text-sm"
        >
          🤝 جهّز فرقك الآن
        </Link>
      </div>
    </div>
  );
}
