"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteUploadedImage } from "@/lib/upload";

const baseSchema = z.object({
  text: z.string().max(300).optional(),
  linkUrl: z.string().url("الرابط غير صالح").optional().or(z.literal("")),
  order: z.number().int().min(0).max(1000),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createBannerAction(input: {
  text?: string;
  linkUrl?: string;
  order: number;
  imageBase64?: string;
  imageUrl?: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const parsed = baseSchema.safeParse({
    text: input.text?.trim() || undefined,
    linkUrl: input.linkUrl?.trim() || "",
    order: input.order,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  let imageUrl: string | null = null;

  if (input.imageBase64) {
    if (!input.imageBase64.startsWith("data:image/")) {
      return { ok: false, error: "صورة غير صالحة" };
    }
    // حد أقصى ~600 KB بعد الضغط
    if (input.imageBase64.length > 820_000) {
      return { ok: false, error: "الصورة كبيرة جداً بعد الضغط" };
    }
    imageUrl = input.imageBase64;
  } else if (input.imageUrl?.trim()) {
    const url = input.imageUrl.trim();
    if (!/^https?:\/\//.test(url)) {
      return { ok: false, error: "رابط الصورة لازم يبدأ بـ http(s)" };
    }
    imageUrl = url;
  }

  if (!parsed.data.text && !imageUrl) {
    return { ok: false, error: "أدخل نص أو صورة على الأقل" };
  }

  await db.adBanner.create({
    data: {
      text: parsed.data.text || null,
      imageUrl,
      linkUrl: parsed.data.linkUrl || null,
      order: parsed.data.order,
      active: true,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleBannerAction(id: string): Promise<void> {
  await requireAdmin();
  const banner = await db.adBanner.findUnique({ where: { id } });
  if (!banner) return;
  await db.adBanner.update({
    where: { id },
    data: { active: !banner.active },
  });
  revalidatePath("/", "layout");
}

export async function deleteBannerAction(id: string): Promise<void> {
  await requireAdmin();
  const banner = await db.adBanner.findUnique({ where: { id } });
  if (!banner) return;
  await db.adBanner.delete({ where: { id } });
  // إذا كانت صورة مرفوعة قديمة من القرص، احذفها
  if (banner.imageUrl?.startsWith("/uploads/")) {
    await deleteUploadedImage(banner.imageUrl);
  }
  revalidatePath("/", "layout");
}
