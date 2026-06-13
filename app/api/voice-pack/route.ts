import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** يُرجع باقة النشرة الصوتية لصاحب الحساب (صانع المحتوى) للحاسبة */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ clips: {} }, { status: 401 });

  const ownerUserId = user.parentUserId ?? user.id;
  const rows = await db.voiceClip.findMany({
    where: { userId: ownerUserId },
    select: { key: true, dataUri: true },
  });

  const clips: Record<string, string> = {};
  for (const r of rows) clips[r.key] = r.dataUri;

  return NextResponse.json(
    { clips },
    { headers: { "Cache-Control": "no-store" } },
  );
}
