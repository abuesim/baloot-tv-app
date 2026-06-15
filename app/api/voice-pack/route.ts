import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { WIN_KEYS } from "@/lib/voice-win";

export const dynamic = "force-dynamic";

/**
 * باقة الصوت للحاسبة:
 * - clips: لبنات النشرة + التوجيهات (صغيرة، تُحمَّل كاملة)
 * - winKeys: مفاتيح أغاني الفوز الموجودة فقط (تُبَثّ عند الحاجة عبر /api/voice-clip)
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ clips: {}, winKeys: [] }, { status: 401 });

  const ownerUserId = user.parentUserId ?? user.id;
  const rows = await db.voiceClip.findMany({
    where: { userId: ownerUserId },
    select: { key: true, dataUri: true },
  });

  const clips: Record<string, string> = {};
  const winKeys: string[] = [];
  for (const r of rows) {
    if (WIN_KEYS.includes(r.key)) winKeys.push(r.key);
    else clips[r.key] = r.dataUri; // الأغاني لا تُحمّل هنا (كبيرة)
  }

  return NextResponse.json(
    { clips, winKeys },
    { headers: { "Cache-Control": "no-store" } },
  );
}
