"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deletePlayerImage } from "@/lib/upload";

const nameSchema = z.string().min(1, "الاسم مطلوب").max(40, "أقصى ٤٠ حرف").trim();

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createPlayerAction(name: string): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

  const exists = await db.player.findUnique({
    where: { userId_name: { userId: ownerUserId, name: parsed.data } },
  });
  if (exists) return { ok: false, error: "اسم اللاعب موجود مسبقاً" };

  await db.player.create({
    data: { userId: ownerUserId, name: parsed.data },
  });
  revalidatePath("/players");
  revalidatePath("/games/new");
  return { ok: true };
}

export async function renamePlayerAction(
  id: string,
  newName: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const parsed = nameSchema.safeParse(newName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

  const player = await db.player.findFirst({
    where: { id, userId: ownerUserId },
  });
  if (!player) return { ok: false, error: "اللاعب غير موجود" };

  const exists = await db.player.findUnique({
    where: { userId_name: { userId: ownerUserId, name: parsed.data } },
  });
  if (exists && exists.id !== id) return { ok: false, error: "الاسم محجوز" };

  await db.player.update({ where: { id }, data: { name: parsed.data } });
  revalidatePath("/players");
  return { ok: true };
}

export async function deletePlayerAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const player = await db.player.findFirst({
    where: { id, userId: ownerUserId },
    include: { _count: { select: { participants: true } } },
  });
  if (!player) return { ok: false, error: "اللاعب غير موجود" };
  if (player._count.participants > 0) {
    return { ok: false, error: "لا يمكن حذف لاعب شارك في صكات سابقة" };
  }
  await db.player.delete({ where: { id } });
  await deletePlayerImage(player.imageUrl);
  revalidatePath("/players");
  return { ok: true };
}

export async function uploadPlayerImageAction(
  playerId: string,
  base64: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const player = await db.player.findFirst({
    where: { id: playerId, userId: ownerUserId },
  });
  if (!player) return { ok: false, error: "اللاعب غير موجود" };

  if (!base64.startsWith("data:image/")) {
    return { ok: false, error: "صورة غير صالحة" };
  }
  if (base64.length > 280_000) {
    return { ok: false, error: "الصورة كبيرة جداً بعد الضغط" };
  }

  if (player.imageUrl?.startsWith("/uploads/")) {
    await deletePlayerImage(player.imageUrl);
  }

  await db.player.update({
    where: { id: playerId },
    data: { imageUrl: base64 },
  });

  revalidatePath("/players");
  revalidatePath("/games", "layout");
  return { ok: true };
}

export async function removePlayerImageAction(
  playerId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const player = await db.player.findFirst({
    where: { id: playerId, userId: ownerUserId },
  });
  if (!player) return { ok: false, error: "اللاعب غير موجود" };
  if (!player.imageUrl) return { ok: true };

  const oldUrl = player.imageUrl;
  await db.player.update({
    where: { id: playerId },
    data: { imageUrl: null },
  });
  await deletePlayerImage(oldUrl);
  revalidatePath("/players");
  return { ok: true };
}
