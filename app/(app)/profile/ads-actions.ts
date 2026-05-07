"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { canManageAds, requireUser } from "@/lib/auth";
import { deleteUploadedImage } from "@/lib/upload";

const baseSchema = z.object({
  text: z.string().max(300).optional(),
  linkUrl: z.string().url("الرابط غير صالح").optional().or(z.literal("")),
  order: z.number().int().min(0).max(1000),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireCC() {
  const user = await requireUser();
  if (!canManageAds(user.role)) {
    throw new Error("غير مصرّح");
  }
  return user;
}

export async function createMyBannerAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCC();
  const parsed = baseSchema.safeParse({
    text: String(formData.get("text") ?? "").trim() || undefined,
    linkUrl: String(formData.get("linkUrl") ?? "").trim() || "",
    order: Number(formData.get("order") ?? 0),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const externalUrl = String(formData.get("imageUrl")    ?? "").trim();
  const base64Input = String(formData.get("imageBase64") ?? "").trim();

  let imageUrl: string | null = null;
  if (base64Input && base64Input.startsWith("data:image/")) {
    // حد أقصى ~800KB بعد الضغط في المتصفح
    if (base64Input.length > 1_100_000) {
      return { ok: false, error: "الصورة كبيرة جداً — حاول صورة أصغر" };
    }
    imageUrl = base64Input;
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
      userId: user.id,
    },
  });
  revalidatePath("/profile");
  return { ok: true };
}

export async function toggleMyBannerAction(id: string): Promise<void> {
  const user = await requireCC();
  const banner = await db.adBanner.findFirst({
    where: { id, userId: user.id },
  });
  if (!banner) return;
  await db.adBanner.update({
    where: { id },
    data: { active: !banner.active },
  });
  revalidatePath("/profile");
}

export async function deleteMyBannerAction(id: string): Promise<void> {
  const user = await requireCC();
  const banner = await db.adBanner.findFirst({
    where: { id, userId: user.id },
  });
  if (!banner) return;
  await db.adBanner.delete({ where: { id } });
  if (banner.imageUrl?.startsWith("/uploads/")) {
    await deleteUploadedImage(banner.imageUrl);
  }
  revalidatePath("/profile");
}
