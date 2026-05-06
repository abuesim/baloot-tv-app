"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { generateUniqueTvCode } from "@/lib/baloot";

const createSchema = z.object({
  username: z
    .string()
    .min(3, "اسم المستخدم ٣ أحرف على الأقل")
    .max(30)
    .regex(/^[a-z0-9_]+$/, "حروف إنجليزية صغيرة وأرقام و _ فقط"),
  displayName: z.string().min(1, "اسم العرض مطلوب").max(60),
  password: z.string().min(6, "كلمة السر ٦ أحرف على الأقل").max(100),
  role: z.enum(["ADMIN", "SUPPORT", "CONTENT_CREATOR", "USER"]),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createSchema.safeParse({
    username: String(formData.get("username") ?? "").toLowerCase().trim(),
    displayName: String(formData.get("displayName") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    role: formData.get("role") ?? "USER",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const exists = await db.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (exists) return { ok: false, error: "اسم المستخدم محجوز" };

  const tvCode = await generateUniqueTvCode(async (c) => {
    const exists = await db.user.findUnique({ where: { tvCode: c } });
    return exists !== null;
  });

  await db.user.create({
    data: {
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
      tvCode,
    },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleUserActiveAction(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (admin.id === userId) return; // ما يعطّل نفسه

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await db.user.update({
    where: { id: userId },
    data: { active: !user.active },
  });
  revalidatePath("/admin/users");
}

export async function resetPasswordAction(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (newPassword.length < 6)
    return { ok: false, error: "كلمة السر ٦ أحرف على الأقل" };

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserAction(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (admin.id === userId) return; // ما يحذف نفسه
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

const roleSchema = z.enum(["ADMIN", "SUPPORT", "CONTENT_CREATOR", "USER"]);

export async function setUserRoleAction(
  userId: string,
  role: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    return { ok: false, error: "لا تقدر تغيّر دورك بنفسك" };
  }
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: "دور غير صالح" };

  await db.user.update({
    where: { id: userId },
    data: { role: parsed.data },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}
