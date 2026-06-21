import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export default async function AdminDashboard() {
  const [usersCount, gamesCount, activeGamesCount, bannersCount, settings] =
    await Promise.all([
      db.user.count({ where: { role: "USER" } }),
      db.game.count({ where: { deletedAt: null } }),
      db.game.count({ where: { status: "IN_PROGRESS", deletedAt: null } }),
      db.adBanner.count({ where: { active: true } }),
      getSettings(),
    ]);

  const stats = [
    { label: "المستخدمون", value: usersCount, href: "/admin/users" },
    { label: "كل الصكات", value: gamesCount, href: null },
    { label: "صكات جارية", value: activeGamesCount, href: null },
    { label: "إعلانات نشطة", value: bannersCount, href: "/admin/banners" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">لوحة التحكم</h1>
        <p className="text-white/60">نظرة عامة على التطبيق</p>
      </div>

      {settings.maintenanceMode && (
        <div className="bg-danger/20 border border-danger/40 rounded-xl p-4">
          <strong className="text-red-300">⚠️ وضع الصيانة مفعّل</strong>
          <p className="text-sm text-white/80 mt-1">
            التطبيق مغلق على المستخدمين العاديين.{" "}
            <Link href="/admin/settings" className="underline">
              عطّله من الإعدادات
            </Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const card = (
            <div className="bg-navy rounded-2xl p-6 border border-white/5 hover:border-white/10">
              <div className="text-4xl font-bold text-gold">{s.value}</div>
              <div className="text-sm text-white/60 mt-2">{s.label}</div>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {card}
            </Link>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/users"
          className="bg-navy rounded-2xl p-6 border border-white/5 hover:border-gold/40"
        >
          <h3 className="font-bold text-lg mb-2">إدارة المستخدمين</h3>
          <p className="text-sm text-white/60">إضافة، تعديل، تعطيل</p>
        </Link>
        <Link
          href="/admin/settings"
          className="bg-navy rounded-2xl p-6 border border-white/5 hover:border-gold/40"
        >
          <h3 className="font-bold text-lg mb-2">إعدادات التطبيق</h3>
          <p className="text-sm text-white/60">الاسم، الصيانة، الافتراضات</p>
        </Link>
        <Link
          href="/admin/banners"
          className="bg-navy rounded-2xl p-6 border border-white/5 hover:border-gold/40"
        >
          <h3 className="font-bold text-lg mb-2">إعلانات الشريط السفلي</h3>
          <p className="text-sm text-white/60">نص، روابط، تفعيل</p>
        </Link>
      </div>
    </div>
  );
}
