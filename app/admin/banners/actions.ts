"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/upload";

const baseSchema = z.object({
  text: z.string().max(300).optional(),
  linkUrl: z.string().url("الرابط غير صالح").optional().or(z.literal("")),
  order: z.number().int().min(0).max(1000),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createBannerAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = baseSchema.safeParse({
    text: String(formData.get("text") ?? "").trim() || undefined,
    linkUrl: String(formData.get("linkUrl") ?? "").trim() || "",
    order: Number(formData.get("order") ?? 0),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  // الصورة: إما رابط مكتوب أو ملف مرفوع
  const externalUrl = String(formData.get("imageUrl") ?? "").trim();
  const file = formData.get("imageFile");

  let imageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    const res = await saveUploadedImage(file, "banners");
    if (!res.ok) return res;
    imageUrl = res.url;
  } else if (externalUrl) {
    if (!/^https?:\/\//.test(externalUrl)) {
      return { ok: false, error: "رابط الصورة لازم يبدأ بـ http(s)" };
    }
    imageUrl = externalUrl;
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
  // إذا كانت صورة مرفوعة عندنا، احذفها من القرص
  if (banner.imageUrl?.startsWith("/uploads/")) {
    await deleteUploadedImage(banner.imageUrl);
  }
  revalidatePath("/", "layout");
}
