import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ALL_CLIP_KEYS } from "@/lib/voice-narration";
import { CUE_KEYS } from "@/lib/voice-cues";
import { WIN_KEYS } from "@/lib/voice-win";

export const dynamic = "force-dynamic";

const PREFIXES = [
  "data:audio/mpeg;base64,",
  "data:audio/mp3;base64,",
  "data:audio/wav;base64,",
  "data:audio/ogg;base64,",
  "data:audio/mp4;base64,",
  "data:audio/webm;base64,",
  "data:audio/x-m4a;base64,",
  "data:audio/aac;base64,",
];

/** رفع مقطع/أغنية صوتية — عبر route handler لتفادي حد جسم الـ Server Action */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  const ownerUserId = user.parentUserId ?? user.id;

  const body = await req.json().catch(() => null);
  const key = String(body?.key ?? "");
  const uri = String(body?.dataUri ?? "").trim();

  if (![...ALL_CLIP_KEYS, ...CUE_KEYS, ...WIN_KEYS].includes(key)) {
    return NextResponse.json({ ok: false, error: "مفتاح غير صالح" }, { status: 400 });
  }
  if (!PREFIXES.some((p) => uri.startsWith(p))) {
    return NextResponse.json({ ok: false, error: "نوع الملف غير مدعوم (MP3 / WAV / OGG)" }, { status: 400 });
  }
  const isWin = WIN_KEYS.includes(key);
  const maxLen = isWin ? 4_300_000 : 2_800_000;
  if (uri.length > maxLen) {
    return NextResponse.json(
      { ok: false, error: isWin ? "الأغنية أكبر من ٣ ميجا — اختر مقطعاً أقصر" : "حجم المقطع أكبر من ٢ ميجا" },
      { status: 400 },
    );
  }

  await db.voiceClip.upsert({
    where: { userId_key: { userId: ownerUserId, key } },
    create: { userId: ownerUserId, key, dataUri: uri },
    update: { dataUri: uri },
  });
  return NextResponse.json({ ok: true });
}

/** يبثّ مقطعاً صوتياً مخزّناً (base64) كصوت فعلي — للأغاني الكبيرة دون تحميلها في الصفحة */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const ownerUserId = user.parentUserId ?? user.id;

  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!key) return new Response("Missing key", { status: 400 });

  const clip = await db.voiceClip.findUnique({
    where: { userId_key: { userId: ownerUserId, key } },
    select: { dataUri: true },
  });
  if (!clip) return new Response("Not found", { status: 404 });

  const m = clip.dataUri.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!m) return new Response("Bad data", { status: 500 });

  const buf = Buffer.from(m[2], "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": m[1],
      "Content-Length": String(buf.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
