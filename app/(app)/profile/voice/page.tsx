import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManageAds, requireUser } from "@/lib/auth";
import VoiceNarrationSetup from "../VoiceNarrationSetup";
import VoiceCuesSetup from "../VoiceCuesSetup";
import WinSongsSetup from "../WinSongsSetup";

export default async function VoicePage() {
  const me = await requireUser();
  if (!canManageAds(me.role)) redirect("/profile");

  // لبنات الصوت المرفوعة (النشرة + التوجيهات)
  const voiceRows = await db.voiceClip.findMany({
    where: { userId: me.id },
    select: { key: true, dataUri: true },
  });
  const voiceClips: Record<string, string> = {};
  for (const v of voiceRows) voiceClips[v.key] = v.dataUri;

  return (
    <div className="space-y-6">
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
        <h2 className="font-bold text-lg mb-1">🎉 أغاني الفوز</h2>
        <p className="text-xs text-white/50 mb-4">
          ارفع حتى ٥ أغانٍ — تتوقف النشرة عند الفوز وتشتغل واحدة عشوائياً
        </p>
        <WinSongsSetup initialClips={voiceClips} />
      </section>
    </div>
  );
}
