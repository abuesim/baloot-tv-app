"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getWinner } from "@/lib/baloot";
import { publish } from "@/lib/events";
import { syncMatchForGame, syncMatch } from "@/lib/tournament-sync";

const roundSchema = z.object({
  team1Score: z.number().int().min(0).max(300),
  team2Score: z.number().int().min(0).max(300),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

async function broadcastGame(gameId: string, userId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      participants: { include: { player: true } },
      rounds: { orderBy: { number: "asc" } },
    },
  });
  if (!game) return;
  publish(`tv:user:${userId}`, { type: "game", game });
}

// الرقم التالي للجولة
// - لعب عادي: يبدأ من 1
// - لعب مشدود: جولة البداية (رقم 0) تُعرض كـ #1، فالجولات العادية تبدأ من 2
function nextRoundNumber(rounds: { number: number }[]): number {
  const regular = rounds.filter((r) => r.number > 0);
  const hasBase = rounds.some((r) => r.number === 0); // جولة البداية مشدود
  if (regular.length === 0) return hasBase ? 2 : 1;
  return Math.max(...regular.map((r) => r.number)) + 1;
}

export async function recordRoundAction(
  gameId: string,
  team1: number,
  team2: number,
): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const parsed = roundSchema.safeParse({ team1Score: team1, team2Score: team2 });
  if (!parsed.success) return { ok: false, error: "نقاط غير صالحة" };

  const game = await db.game.findFirst({
    where: { id: gameId, userId: ownerUserId },
    include: { rounds: true },
  });
  if (!game) return { ok: false, error: "الصكة غير موجودة" };
  if (game.status !== "IN_PROGRESS")
    return { ok: false, error: "الصكة منتهية" };

  const newTeam1 = game.team1Score + parsed.data.team1Score;
  const newTeam2 = game.team2Score + parsed.data.team2Score;
  const winner = getWinner(newTeam1, newTeam2, game.targetScore);

  await db.$transaction([
    db.round.create({
      data: {
        gameId: game.id,
        number: nextRoundNumber(game.rounds),
        team1Score: parsed.data.team1Score,
        team2Score: parsed.data.team2Score,
      },
    }),
    db.game.update({
      where: { id: game.id },
      data: {
        team1Score: newTeam1,
        team2Score: newTeam2,
        winner,
        status: winner !== null ? "COMPLETED" : "IN_PROGRESS",
        endedAt: winner !== null ? new Date() : null,
      },
    }),
  ]);

  await broadcastGame(game.id, ownerUserId);
  await syncMatchForGame(game.id);
  revalidatePath(`/games/${game.id}`);
  return { ok: true };
}

export async function deleteRoundAction(
  gameId: string,
  roundId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const game = await db.game.findFirst({
    where: { id: gameId, userId: ownerUserId },
    include: { rounds: true },
  });
  if (!game) return { ok: false, error: "الصكة غير موجودة" };

  const round = game.rounds.find((r) => r.id === roundId);
  if (!round) return { ok: false, error: "الجولة غير موجودة" };

  // منع حذف جولة البداية (مشدود)
  if (round.number === 0) {
    return { ok: false, error: "لا يمكن حذف جولة البداية — غيّر نوع اللعب إلى عادي أولاً" };
  }

  const remaining = game.rounds.filter((r) => r.id !== roundId);
  const startBase =
    game.team1Score - game.rounds.reduce((s, r) => s + r.team1Score, 0);
  const startBase2 =
    game.team2Score - game.rounds.reduce((s, r) => s + r.team2Score, 0);

  const newTeam1 = startBase + remaining.reduce((s, r) => s + r.team1Score, 0);
  const newTeam2 = startBase2 + remaining.reduce((s, r) => s + r.team2Score, 0);
  const winner = getWinner(newTeam1, newTeam2, game.targetScore);

  // إعادة ترقيم الجولات العادية فقط (تجاهل الجولة 0)
  const regularRemaining = remaining
    .filter((r) => r.number > 0)
    .sort((a, b) => a.number - b.number);

  await db.$transaction([
    db.round.delete({ where: { id: roundId } }),
    ...regularRemaining.map((r, i) =>
      db.round.update({ where: { id: r.id }, data: { number: i + 1 } }),
    ),
    db.game.update({
      where: { id: game.id },
      data: {
        team1Score: newTeam1,
        team2Score: newTeam2,
        winner,
        status: winner !== null ? "COMPLETED" : "IN_PROGRESS",
        endedAt: winner !== null ? new Date() : null,
      },
    }),
  ]);

  await broadcastGame(game.id, ownerUserId);
  await syncMatchForGame(game.id);
  revalidatePath(`/games/${game.id}`);
  return { ok: true };
}

export async function abandonGameAction(gameId: string): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const game = await db.game.findFirst({
    where: { id: gameId, userId: ownerUserId },
  });
  if (!game) return { ok: false, error: "الصكة غير موجودة" };

  await db.game.update({
    where: { id: gameId },
    data: { status: "ABANDONED", endedAt: new Date() },
  });
  await broadcastGame(gameId, ownerUserId);
  await syncMatchForGame(gameId);
  revalidatePath(`/games/${gameId}`);
  return { ok: true };
}

export async function changeGameModeAction(
  gameId: string,
  mode: "NORMAL" | "MASHDOOD",
): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const game = await db.game.findFirst({
    where: { id: gameId, userId: ownerUserId },
    include: { rounds: true },
  });
  if (!game) return { ok: false, error: "الصكة غير موجودة" };
  if (game.status !== "IN_PROGRESS")
    return { ok: false, error: "الصكة منتهية" };
  if (game.mode === mode) return { ok: true }; // بدون تغيير

  const mashdoodBase = game.rounds.find((r) => r.number === 0);

  if (mode === "MASHDOOD" && !mashdoodBase) {
    // التحويل عادي → مشدود: أضف جولة البداية (52-52) وحدّث النقاط
    const newTeam1 = game.team1Score + 52;
    const newTeam2 = game.team2Score + 52;
    const winner = getWinner(newTeam1, newTeam2, game.targetScore);
    await db.$transaction([
      db.round.create({
        data: { gameId, number: 0, team1Score: 52, team2Score: 52 },
      }),
      db.game.update({
        where: { id: gameId },
        data: {
          mode,
          team1Score: newTeam1,
          team2Score: newTeam2,
          winner,
          status: winner !== null ? "COMPLETED" : "IN_PROGRESS",
          endedAt: winner !== null ? new Date() : null,
        },
      }),
    ]);
  } else if (mode === "NORMAL" && mashdoodBase) {
    // التحويل مشدود → عادي: احذف جولة البداية وحدّث النقاط
    const newTeam1 = game.team1Score - 52;
    const newTeam2 = game.team2Score - 52;
    const winner = getWinner(newTeam1, newTeam2, game.targetScore);
    await db.$transaction([
      db.round.delete({ where: { id: mashdoodBase.id } }),
      db.game.update({
        where: { id: gameId },
        data: {
          mode,
          team1Score: Math.max(0, newTeam1),
          team2Score: Math.max(0, newTeam2),
          winner,
          status: winner !== null ? "COMPLETED" : "IN_PROGRESS",
          endedAt: winner !== null ? new Date() : null,
        },
      }),
    ]);
  } else {
    await db.game.update({ where: { id: gameId }, data: { mode } });
  }

  await broadcastGame(gameId, ownerUserId);
  await syncMatchForGame(gameId);
  revalidatePath(`/games/${gameId}`);
  return { ok: true };
}

export async function createPlayerAction(
  name: string,
): Promise<{ ok: true; player: { id: string; name: string; imageUrl: string | null } } | { ok: false; error: string }> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "اسم اللاعب مطلوب" };
  if (trimmed.length > 50) return { ok: false, error: "الاسم طويل جداً (٥٠ حرف بحد أقصى)" };

  try {
    const player = await db.player.create({
      data: { name: trimmed, userId: ownerUserId },
      select: { id: true, name: true, imageUrl: true },
    });
    revalidatePath("/players");
    return { ok: true, player };
  } catch {
    return { ok: false, error: "هذا الاسم موجود مسبقاً" };
  }
}

const playersSchema = z.object({
  team1Player1Id: z.string().min(1),
  team1Player2Id: z.string().min(1),
  team2Player1Id: z.string().min(1),
  team2Player2Id: z.string().min(1),
});

export async function deleteGameAction(
  gameId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  if (user.parentUserId && !user.subCanDelete) {
    return { ok: false, error: "ليس لديك صلاحية حذف الصكات" };
  }
  const game = await db.game.findFirst({
    where: { id: gameId, userId: ownerUserId, deletedAt: null },
  });
  if (!game) return { ok: false, error: "الصكة غير موجودة" };

  // حذف ناعم — تبقى في سجل المحذوفات قابلة للاسترجاع
  await db.game.update({
    where: { id: gameId },
    data: { deletedAt: new Date(), deletedById: user.id },
  });

  // إن كانت الصكة ضمن مواجهة بطولة، أعِد مزامنتها (تتحرر للبدء من جديد)
  if (game.matchId) await syncMatch(game.matchId);

  revalidatePath("/home");
  revalidatePath("/stats");
  revalidatePath("/profile/trash");
  return { ok: true };
}

export async function setGamePlayersAction(
  gameId: string,
  input: {
    team1Player1Id: string;
    team1Player2Id: string;
    team2Player1Id: string;
    team2Player2Id: string;
  },
): Promise<ActionResult> {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const parsed = playersSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة" };

  const ids = [
    parsed.data.team1Player1Id,
    parsed.data.team1Player2Id,
    parsed.data.team2Player1Id,
    parsed.data.team2Player2Id,
  ];
  if (new Set(ids).size !== 4) {
    return { ok: false, error: "كل لاعب يجب أن يكون مختلفاً عن الآخرين" };
  }

  const game = await db.game.findFirst({
    where: { id: gameId, userId: ownerUserId },
  });
  if (!game) return { ok: false, error: "الصكة غير موجودة" };

  const players = await db.player.findMany({
    where: { id: { in: ids }, userId: ownerUserId },
  });
  if (players.length !== 4) {
    return { ok: false, error: "أحد اللاعبين غير موجود في قائمتك" };
  }

  await db.$transaction([
    db.gameParticipant.deleteMany({ where: { gameId } }),
    db.gameParticipant.createMany({
      data: [
        { gameId, playerId: parsed.data.team1Player1Id, team: 1 },
        { gameId, playerId: parsed.data.team1Player2Id, team: 1 },
        { gameId, playerId: parsed.data.team2Player1Id, team: 2 },
        { gameId, playerId: parsed.data.team2Player2Id, team: 2 },
      ],
    }),
  ]);

  await broadcastGame(gameId, ownerUserId);
  await syncMatchForGame(gameId);
  revalidatePath(`/games/${gameId}`);
  return { ok: true };
}
