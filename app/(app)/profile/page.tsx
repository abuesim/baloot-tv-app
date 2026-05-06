import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { qrSvg } from "@/lib/qr";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import TvSection from "./TvSection";

export default async function ProfilePage() {
  const me = await requireUser();
  const userRow = await db.user.findUnique({
    where: { id: me.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      tvOrientation: true,
      calculatorStyle: true,
      tvCode: true,
    },
  });
  if (!userRow) return null;

  // رابط TV الكامل + QR
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  const tvUrl = userRow.tvCode ? `${origin}/tv/${userRow.tvCode}` : null;
  const qr = tvUrl ? await qrSvg(tvUrl) : null;

  return (
    <div className="space-y-6">
      <section className="bg-navy rounded-2xl p-6 border border-white/10">
        <h2 className="font-bold text-lg mb-4">المعلومات الأساسية</h2>
        <ProfileForm
          displayName={userRow.displayName}
          tvOrientation={userRow.tvOrientation}
          calculatorStyle={userRow.calculatorStyle}
        />
      </section>

      <section className="bg-navy rounded-2xl p-6 border border-white/10">
        <h2 className="font-bold text-lg mb-4">شاشة التلفزيون — رابط الاتصال</h2>
        <TvSection code={userRow.tvCode} tvUrl={tvUrl} qrSvg={qr} />
      </section>

      <section className="bg-navy rounded-2xl p-6 border border-white/10">
        <h2 className="font-bold text-lg mb-4">تغيير كلمة السر</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
