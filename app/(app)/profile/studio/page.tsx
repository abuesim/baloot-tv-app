import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { canManageAds, requireUser } from "@/lib/auth";
import TvStudioForm from "../TvStudioForm";
import MyAdsSection from "../MyAdsSection";
import StreamlabsSetup from "./StreamlabsSetup";

export default async function StudioPage() {
  const me = await requireUser();
  if (!canManageAds(me.role)) redirect("/profile");

  const userRow = await db.user.findUnique({
    where: { id: me.id },
    select: {
      tvCode: true,
      tvAccentColor: true,
      tvShowRounds: true,
      tvShowChat: true,
      tvChatUrl: true,
      tvShowDonations: true,
      tvDonationUrl: true,
      tvShowAlert: true,
      tvAlertUrl: true,
      tvStreamlabsToken: true,
    },
  });
  if (!userRow) return null;

  // رابط التطبيق الكامل لاستخدامه في سنيبت Streamlabs
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const myAds = await db.adBanner.findMany({
    where: { userId: me.id },
    orderBy: [{ active: "desc" }, { order: "asc" }],
  });

  return (
    <div className="space-y-6">
      <section className="bg-navy rounded-2xl p-6 border border-white/10">
        <h2 className="font-bold text-lg mb-1">🎬 إعدادات شاشة البث</h2>
        <p className="text-xs text-white/50 mb-4">
          خصّص شكل ولون شاشة بثّك + ربط الشات والدونيشن
        </p>
        <TvStudioForm
          initial={{
            tvAccentColor: userRow.tvAccentColor,
            tvShowRounds: userRow.tvShowRounds,
            tvShowChat: userRow.tvShowChat,
            tvChatUrl: userRow.tvChatUrl,
            tvShowDonations: userRow.tvShowDonations,
            tvDonationUrl: userRow.tvDonationUrl,
            tvShowAlert: userRow.tvShowAlert,
            tvAlertUrl: userRow.tvAlertUrl,
            tvStreamlabsToken: userRow.tvStreamlabsToken,
          }}
        />
      </section>

      {/* تكامل Streamlabs */}
      {userRow.tvCode && (
        <StreamlabsSetup origin={origin} tvCode={userRow.tvCode} />
      )}

      <section className="bg-navy rounded-2xl p-6 border border-white/10">
        <h2 className="font-bold text-lg mb-1">📢 إعلاناتي الخاصة</h2>
        <p className="text-xs text-white/50 mb-4">
          تظهر فقط على شاشة بثّك وصكاتك (ليست عامة)
        </p>
        <MyAdsSection ads={myAds} />
      </section>
    </div>
  );
}
