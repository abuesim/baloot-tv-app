"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

const createSchema = z.object({
  name: z.string().min(1, "اسم الفريق مطلوب").max(40, "اسم الفريق طويل"),
  player1Id: z.string().min(1, "اختر اللاعب الأول"),
  player2Id: z.string().min(1, "اختر اللاعب الثاني"),
});

export async function createTeamAction(input: {
  name: string;
  player1Id: string;
  player2Id: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }
  const { name, player1Id, player2Id } = parsed.data;

  if (player1Id === player2Id) {
    return { ok: false, error: "لازم تختار لاعبين مختلفين" };
  }

  // تأكد أن اللاعبين من روستر المستخدم
  const players = await db.player.findMany({
    where: { id: { in: [player1Id, player2Id] }, userId: ownerUserId },
    select: { id: true },
  });
  if (players.length !== 2) {
    return { ok: false, error: "أحد اللاعبين غير موجود في قائمتك" };
  }

  await db.team.create({
    data: {
      userId: ownerUserId,
      name: name.trim(),
      player1Id,
      player2Id,
    },
  });

  revalidatePath("/teams");
  return { ok: true };
}

export async function renameTeamAction(
  teamId: string,
  name: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const clean = name.trim();
  if (!clean) return { ok: false, error: "اسم الفريق مطلوب" };
  if (clean.length > 40) return { ok: false, error: "اسم الفريق طويل" };

  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team || team.userId !== ownerUserId) {
    return { ok: false, error: "الفريق غير موجود" };
  }

  await db.team.update({ where: { id: teamId }, data: { name: clean } });
  revalidatePath("/teams");
  return { ok: true };
}

export async function deleteTeamAction(teamId: string): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { _count: { select: { tournamentTeams: true } } },
  });
  if (!team || team.userId !== ownerUserId) {
    return { ok: false, error: "الفريق غير موجود" };
  }
  if (team._count.tournamentTeams > 0) {
    return {
      ok: false,
      error: "لا يمكن حذف فريق مشارك في بطولة — أزِله من البطولة أولاً",
    };
  }

  await db.team.delete({ where: { id: teamId } });
  revalidatePath("/teams");
  return { ok: true };
}
