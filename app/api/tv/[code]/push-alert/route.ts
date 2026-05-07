/**
 * POST /api/tv/[code]/push-alert
 *
 * يُستدعى من كود JavaScript في قالب Streamlabs Custom HTML
 * عند حدوث أي تنبيه (متابع / دونيشن / اشتراك / إلخ).
 *
 * يُرسل الحدث عبر SSE لشاشة TV ليُعرض بشكل نيتيف.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  // CORS مفتوح — الطلب قادم من OBS Browser Source
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const user = await db.user.findUnique({
    where: { tvCode: code },
    select: { id: true },
  });
  if (!user) return new Response("Not found", { status: 404 });

  let body: {
    listener?: string;
    name?: string;
    amount?: string;
    currency?: string;
    message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  publish(`tv:user:${user.id}`, {
    type: "alert",
    listener: String(body.listener ?? "").trim(),
    name: String(body.name ?? "").trim(),
    amount: String(body.amount ?? "").trim(),
    currency: String(body.currency ?? "").trim(),
    message: String(body.message ?? "").trim(),
  });

  return new Response("ok", {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
