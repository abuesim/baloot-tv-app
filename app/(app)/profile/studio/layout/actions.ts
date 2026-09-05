"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { canManageAds, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publish } from "@/lib/events";
import { normalizeTvLayout } from "@/lib/tv-layout";

export type LayoutActionResult = { ok: true } | { ok: false; error: string };

export async function updateTvLayoutAction(payload: string): Promise<LayoutActionResult> {
  const me = await requireUser();
  if (!canManageAds(me.role)) return { ok: false, error: "ليس لديك صلاحية تعديل شاشة البث" };
  if (payload.length > 50_000) return { ok: false, error: "حجم الإعدادات غير صالح" };

  try {
    const current = await db.user.findUnique({
      where: { id: me.id },
      select: { tvAccentColor: true },
    });
    if (!current) return { ok: false, error: "الحساب غير موجود" };
    const layout = normalizeTvLayout(JSON.parse(payload), current.tvAccentColor);
    await db.user.update({
      where: { id: me.id },
      data: { tvLayout: layout as unknown as Prisma.InputJsonValue },
    });
    publish(`tv:user:${me.id}`, { type: "layout", layout });
    revalidatePath("/profile/studio/layout");
    revalidatePath("/tv", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "تعذر حفظ التصميم. تأكد من القيم وحاول مجددًا" };
  }
}

export async function resetTvLayoutAction(): Promise<LayoutActionResult> {
  const me = await requireUser();
  if (!canManageAds(me.role)) return { ok: false, error: "ليس لديك صلاحية تعديل شاشة البث" };
  const current = await db.user.findUnique({
    where: { id: me.id },
    select: { tvAccentColor: true },
  });
  if (!current) return { ok: false, error: "الحساب غير موجود" };

  await db.user.update({ where: { id: me.id }, data: { tvLayout: Prisma.DbNull } });
  publish(`tv:user:${me.id}`, { type: "layout", layout: null });
  revalidatePath("/profile/studio/layout");
  revalidatePath("/tv", "layout");
  return { ok: true };
}
