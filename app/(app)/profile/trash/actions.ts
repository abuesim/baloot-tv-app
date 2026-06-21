"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, canManageAds } from "@/lib/auth";
import { syncMatch } from "@/lib/tournament-sync";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function ownerOrNull(): Promise<string | null> {
  const user = await requireUser();
  if (!canManageAds(user.role)) return null;
  return user.parentUserId ?? user.id;
}

export async function restoreGameAction(id: string): Promise<ActionResult> {
  const ownerUserId = await ownerOrNull();
  if (!ownerUserId) return { ok: false, error: "غير مصرح" };

  const game = await db.game.findFirst({
    where: { id, userId: ownerUserId, deletedAt: { not: null } },
  });
  if (!game) return { ok: false, error: "غير موجود" };

  await db.game.update({ where: { id }, data: { deletedAt: null } });
  if (game.matchId) await syncMatch(game.matchId);

  revalidatePath("/profile/trash");
  revalidatePath("/home");
  revalidatePath("/history");
  revalidatePath("/stats");
  return { ok: true };
}

export async function restoreTournamentAction(id: string): Promise<ActionResult> {
  const ownerUserId = await ownerOrNull();
  if (!ownerUserId) return { ok: false, error: "غير مصرح" };

  const t = await db.tournament.findFirst({
    where: { id, userId: ownerUserId, deletedAt: { not: null } },
  });
  if (!t) return { ok: false, error: "غير موجود" };

  await db.tournament.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/profile/trash");
  revalidatePath("/tournaments");
  return { ok: true };
}
