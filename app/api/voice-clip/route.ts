import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
