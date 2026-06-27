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

/** يتحقق أن المساعد المستهدف تابع لي فعلاً */
async function requireOwnedSub(meId: string, subId: string) {
  const sub = await db.user.findFirst({
    where: { id: subId, parentUserId: meId },
  });
  if (!sub) throw new Error("المساعد غير موجود");
  return sub;
}

// ============================================================
// إنشاء مساعد جديد — صانع المحتوى يدخل اسماً ورقماً سرياً
// اسم المستخدم الفعلي = ‹اسم‌صانع‌المحتوى›-‹الاسم›
// ============================================================

const createSchema = z.object({
  name: z
    .string()
    .min(1, "اكتب اسماً للمساعد")
    .max(20, "الاسم طويل جداً")
    .regex(/^[a-z0-9_]+$/, "حروف إنجليزية صغيرة وأرقام و _ فقط"),
  password: z.string().min(6, "كلمة السر ٦ أحرف على الأقل").max(100),
});

export async function createSubUserAction(input: {
  name: string;
  password: string;
}): Promise<ActionResult> {
  const me = await requireContentCreatorOwner();

  const parsed = createSchema.safeParse({
    name: String(input?.name ?? "").toLowerCase().trim(),
    password: String(input?.password ?? ""),
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const subUsername = `${me.username}-${parsed.data.name}`;

  // تأكد من أن اسم المستخدم الفرعي غير مأخوذ
  const taken = await db.user.findUnique({ where: { username: subUsername } });
  if (taken) return { ok: false, error: `اسم "${subUsername}" مستخدم مسبقاً` };

  await db.user.create({
    data: {
      username: subUsername,
      displayName: `مساعد ${me.displayName} (${parsed.data.name})`,
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
// تغيير كلمة سر مساعد محدد
// ============================================================

const passwordSchema = z.object({
  password: z.string().min(6, "كلمة السر ٦ أحرف على الأقل").max(100),
});

export async function changeSubUserPasswordAction(
  subId: string,
  password: string,
): Promise<ActionResult> {
  const me = await requireContentCreatorOwner();

  const parsed = passwordSchema.safeParse({ password });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const sub = await requireOwnedSub(me.id, subId);

  await db.user.update({
    where: { id: sub.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  return { ok: true };
}

// ============================================================
// تحديث صلاحيات مساعد محدد
// ============================================================

export async function updateSubUserPermissionsAction(
  subId: string,
  perms: {
    subCanStartGame: boolean;
    subCanAddPlayers: boolean;
    subCanViewHistory: boolean;
    subCanViewStats: boolean;
    subCanManageTournaments: boolean;
    subCanDelete: boolean;
  },
): Promise<ActionResult> {
  const me = await requireContentCreatorOwner();
  const sub = await requireOwnedSub(me.id, subId);

  await db.user.update({
    where: { id: sub.id },
    data: perms,
  });

  revalidatePath("/profile/sub-user");
  return { ok: true };
}

// ============================================================
// تفعيل / تعطيل مساعد محدد
// ============================================================

export async function toggleSubUserAction(subId: string): Promise<ActionResult> {
  const me = await requireContentCreatorOwner();
  const sub = await requireOwnedSub(me.id, subId);

  await db.user.update({
    where: { id: sub.id },
    data: { active: !sub.active },
  });

  revalidatePath("/profile/sub-user");
  return { ok: true };
}

// ============================================================
// حذف مساعد محدد
// ============================================================

export async function deleteSubUserAction(subId: string): Promise<ActionResult> {
  const me = await requireContentCreatorOwner();
  const sub = await requireOwnedSub(me.id, subId);

  await db.user.delete({ where: { id: sub.id } });

  revalidatePath("/profile/sub-user");
  return { ok: true };
}
