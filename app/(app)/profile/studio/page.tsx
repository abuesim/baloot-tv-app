import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { canManageAds, requireUser } from "@/lib/auth";
import TvStudioForm from "../TvStudioForm";
import MyAdsSection from "../MyAdsSection";
import VoiceNarrationSetup from "../VoiceNarrationSetup";
import VoiceCuesSetup from "../VoiceCuesSetup";
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
      tvAlertSound: true,
      tvRefreshSeconds: true,
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

  // النشرة الصوتية — لبنات الصوت المرفوعة
  const voiceRows = await db.voiceClip.findMany({
    where: { userId: me.id },
    select: { key: true, dataUri: true },
  });
  const voiceClips: Record<string, string> = {};
  for (const v of voiceRows) voiceClips[v.key] = v.dataUri;

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
            tvAlertSound: userRow.tvAlertSound,
            tvRefreshSeconds: userRow.tvRefreshSeconds,
          }}
        />
      </section>

      {/* تكامل Streamlabs */}
      {userRow.tvCode && (
        <StreamlabsSetup origin={origin} tvCode={userRow.tvCode} />
      )}

      <section className="bg-navy rounded-2xl p-6 border border-white/10">
        <h2 className="font-bold text-lg mb-1">🎙️ النشرة الصوتية بصوتك</h2>
        <p className="text-xs text-white/50 mb-4">
          ارفع صوتك لنطق النتيجة في الحاسبة بدل الصوت الآلي
        </p>
        <VoiceNarrationSetup initialClips={voiceClips} />
      </section>

      <section className="bg-navy rounded-2xl p-6 border border-white/10">
        <h2 className="font-bold text-lg mb-1">🔔 التوجيهات الصوتية</h2>
        <p className="text-xs text-white/50 mb-4">
          مؤثرات صوتية تشتغل تلقائياً عند شروط معيّنة أثناء الصكة
        </p>
        <VoiceCuesSetup initialClips={voiceClips} />
      </section>

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
