"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { generateUniqueTvCode } from "@/lib/baloot";

export type ActionResult = { ok: true } | { ok: false; error: string };

const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, "اسم العرض مطلوب")
    .max(60, "أقصى ٦٠ حرف")
    .trim(),
  tvOrientation: z.enum(["LANDSCAPE", "PORTRAIT"]),
  calculatorStyle: z.enum(["CLASSIC", "ADVANCED"]),
});

export async function updateProfileAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    displayName: String(formData.get("displayName") ?? "").trim(),
    tvOrientation: formData.get("tvOrientation") ?? "LANDSCAPE",
    calculatorStyle: formData.get("calculatorStyle") ?? "CLASSIC",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }
  await db.user.update({
    where: { id: user.id },
    data: {
      displayName: parsed.data.displayName,
      tvOrientation: parsed.data.tvOrientation,
      calculatorStyle: parsed.data.calculatorStyle,
    },
  });
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "أدخل كلمة السر الحالية"),
    newPassword: z.string().min(6, "كلمة السر الجديدة ٦ أحرف على الأقل").max(100),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "كلمتا السر غير متطابقتين",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const userRow = await db.user.findUnique({ where: { id: me.id } });
  if (!userRow) return { ok: false, error: "المستخدم غير موجود" };

  const valid = await verifyPassword(parsed.data.currentPassword, userRow.passwordHash);
  if (!valid) return { ok: false, error: "كلمة السر الحالية غير صحيحة" };

  await db.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  return { ok: true };
}

export async function regenerateTvCodeAction(): Promise<ActionResult> {
  const user = await requireUser();
  const code = await generateUniqueTvCode(async (c) => {
    const exists = await db.user.findUnique({ where: { tvCode: c } });
    return exists !== null;
  });
  await db.user.update({
    where: { id: user.id },
    data: { tvCode: code },
  });
  revalidatePath("/profile");
  return { ok: true };
}

// ─── رفع صوت التنبيه ──────────────────────────────────────────
export async function uploadAlertSoundAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { saveUploadedAudio, deleteUploadedAudio } = await import("@/lib/upload");
  const user = await requireUser();
  const file = formData.get("sound") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "لا يوجد ملف" };

  const result = await saveUploadedAudio(file);
  if (!result.ok) return result;

  // احذف الصوت القديم إن وُجد
  const current = await db.user.findUnique({
    where: { id: user.id },
    select: { tvAlertSound: true },
  });
  if (current?.tvAlertSound) await deleteUploadedAudio(current.tvAlertSound);

  await db.user.update({ where: { id: user.id }, data: { tvAlertSound: result.url } });
  revalidatePath("/profile");
  return { ok: true, url: result.url };
}

export async function removeAlertSoundAction(): Promise<ActionResult> {
  const { deleteUploadedAudio } = await import("@/lib/upload");
  const user = await requireUser();
  const current = await db.user.findUnique({
    where: { id: user.id },
    select: { tvAlertSound: true },
  });
  if (current?.tvAlertSound) await deleteUploadedAudio(current.tvAlertSound);
  await db.user.update({ where: { id: user.id }, data: { tvAlertSound: null } });
  revalidatePath("/profile");
  return { ok: true };
}

const studioSchema = z.object({
  tvAccentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "اللون لازم يكون hex مثل #f5b042"),
  tvShowRounds: z.boolean(),
  tvShowChat: z.boolean(),
  tvChatUrl: z
    .string()
    .url("الرابط غير صالح")
    .optional()
    .or(z.literal("")),
  tvShowDonations: z.boolean(),
  tvDonationUrl: z
    .string()
    .url("الرابط غير صالح")
    .optional()
    .or(z.literal("")),
  tvShowAlert: z.boolean(),
  tvAlertUrl: z
    .string()
    .url("الرابط غير صالح")
    .optional()
    .or(z.literal("")),
  tvStreamlabsToken: z.string().max(512).optional().or(z.literal("")),
});

export async function updateTvStudioAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = studioSchema.safeParse({
    tvAccentColor: String(formData.get("tvAccentColor") ?? "#f5b042"),
    tvShowRounds: formData.get("tvShowRounds") === "on",
    tvShowChat: formData.get("tvShowChat") === "on",
    tvChatUrl: String(formData.get("tvChatUrl") ?? "").trim(),
    tvShowDonations: formData.get("tvShowDonations") === "on",
    tvDonationUrl: String(formData.get("tvDonationUrl") ?? "").trim(),
    tvShowAlert: formData.get("tvShowAlert") === "on",
    tvAlertUrl: String(formData.get("tvAlertUrl") ?? "").trim(),
    tvStreamlabsToken: String(formData.get("tvStreamlabsToken") ?? "").trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      tvAccentColor: parsed.data.tvAccentColor,
      tvShowRounds: parsed.data.tvShowRounds,
      tvShowChat: parsed.data.tvShowChat,
      tvChatUrl: parsed.data.tvChatUrl || null,
      tvShowDonations: parsed.data.tvShowDonations,
      tvDonationUrl: parsed.data.tvDonationUrl || null,
      tvShowAlert: parsed.data.tvShowAlert,
      tvAlertUrl: parsed.data.tvAlertUrl || null,
      tvStreamlabsToken: parsed.data.tvStreamlabsToken || null,
    },
  });
  revalidatePath("/profile");
  return { ok: true };
}
