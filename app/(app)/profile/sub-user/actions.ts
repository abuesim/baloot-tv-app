"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireUser } from "@/lib/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** يتحقق أن المستخدم الحالي صانع محتوى (وليس أدمن أو مستخدم فرعي) */
async function requireContentCreatorOwner() {
  const user = await requireUser();
  if (user.role !== "CONTENT_CREATOR") throw new Error("غير مصرح");
  if (user.parentUserId) throw new Error("المستخدم الفرعي لا يستطيع إنشاء مستخدمين فرعيين");
  return user;
}

// ============================================================
// إنشاء المستخدم الفرعي
// ============================================================

const createSchema = z.object({
  password: z
    .string()
    .min(6, "كلمة السر ٦ أحرف على الأقل")
    .max(100),
});

export async function createSubUserAction(
  password: string,
): Promise<ActionResult> {
  const me = await requireContentCreatorOwner();

  const parsed = createSchema.safeParse({ password });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  // تأكّد ما في مستخدم فرعي مسبقاً
  const existing = await db.user.findFirst({
    where: { parentUserId: me.id },
  });
  if (existing) return { ok: false, error: "يوجد مستخدم فرعي بالفعل" };

  const subUsername = `${me.username}-`;

  // تأكد من أن اسم المستخدم الفرعي غير مأخوذ
  const taken = await db.user.findUnique({ where: { username: subUsername } });
  if (taken) return { ok: false, error: `اسم "${subUsername}" مستخدم مسبقاً` };

  await db.user.create({
    data: {
      username: subUsername,
      displayName: `مساعد ${me.displayName}`,
      passwordHash: await hashPassword(parsed.data.password),
      role: "USER",
      parentUserId: me.id,
      active: true,
    },
  });

  revalidatePath("/profile/sub-user");
  return { ok: true };
}

// ============================================================
// تغيير كلمة سر المستخدم الفرعي
// ============================================================

const passwordSchema = z.object({
  password: z.string().min(6, "كلمة السر ٦ أحرف على الأقل").max(100),
});

export async function changeSubUserPasswordAction(
  password: string,
): Promise<ActionResult> {
  const me = await requireContentCreatorOwner();

  const parsed = passwordSchema.safeParse({ password });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const sub = await db.user.findFirst({ where: { parentUserId: me.id } });
  if (!sub) return { ok: false, error: "لا يوجد مستخدم فرعي" };

  await db.user.update({
    where: { id: sub.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  return { ok: true };
}

// ============================================================
// تحديث صلاحيات المستخدم الفرعي
// ============================================================

export async function updateSubUserPermissionsAction(perms: {
  subCanStartGame: boolean;
  subCanAddPlayers: boolean;
  subCanViewHistory: boolean;
  subCanViewStats: boolean;
}): Promise<ActionResult> {
  const me = await requireContentCreatorOwner();

  const sub = await db.user.findFirst({ where: { parentUserId: me.id } });
  if (!sub) return { ok: false, error: "لا يوجد مستخدم فرعي" };

  await db.user.update({
    where: { id: sub.id },
    data: perms,
  });

  revalidatePath("/profile/sub-user");
  return { ok: true };
}

// ============================================================
// تفعيل / تعطيل المستخدم الفرعي
// ============================================================

export async function toggleSubUserAction(): Promise<ActionResult> {
  const me = await requireContentCreatorOwner();

  const sub = await db.user.findFirst({ where: { parentUserId: me.id } });
  if (!sub) return { ok: false, error: "لا يوجد مستخدم فرعي" };

  await db.user.update({
    where: { id: sub.id },
    data: { active: !sub.active },
  });

  revalidatePath("/profile/sub-user");
  return { ok: true };
}

// ============================================================
// حذف المستخدم الفرعي
// ============================================================

export async function deleteSubUserAction(): Promise<ActionResult> {
  const me = await requireContentCreatorOwner();

  const sub = await db.user.findFirst({ where: { parentUserId: me.id } });
  if (!sub) return { ok: false, error: "لا يوجد مستخدم فرعي" };

  await db.user.delete({ where: { id: sub.id } });

  revalidatePath("/profile/sub-user");
  return { ok: true };
}
