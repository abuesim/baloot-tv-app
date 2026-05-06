"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getWinner } from "@/lib/baloot";
import { publish } from "@/lib/events";

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

export async function recordRoundAction(
  gameId: string,
  team1: number,
  team2: number,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = roundSchema.safeParse({ team1Score: team1, team2Score: team2 });
  if (!parsed.success) return { ok: false, error: "نقاط غير صالحة" };

  const game = await db.game.findFirst({
    where: { id: gameId, userId: user.id },
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
        number: game.rounds.length + 1,
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

  await broadcastGame(game.id, user.id);
  revalidatePath(`/games/${game.id}`);
  return { ok: true };
}

export async function deleteRoundAction(
  gameId: string,
  roundId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const game = await db.game.findFirst({
    where: { id: gameId, userId: user.id },
    include: { rounds: true },
  });
  if (!game) return { ok: false, error: "الصكة غير موجودة" };

  const round = game.rounds.find((r) => r.id === roundId);
  if (!round) return { ok: false, error: "الجولة غير موجودة" };

  const remaining = game.rounds.filter((r) => r.id !== roundId);
  const startBase =
    game.team1Score - game.rounds.reduce((s, r) => s + r.team1Score, 0);
  const startBase2 =
    game.team2Score - game.rounds.reduce((s, r) => s + r.team2Score, 0);

  const newTeam1 = startBase + remaining.reduce((s, r) => s + r.team1Score, 0);
  const newTeam2 = startBase2 + remaining.reduce((s, r) => s + r.team2Score, 0);
  const winner = getWinner(newTeam1, newTeam2, game.targetScore);

  const sortedRemaining = remaining.sort((a, b) => a.number - b.number);
  await db.$transaction([
    db.round.delete({ where: { id: roundId } }),
    ...sortedRemaining.map((r, i) =>
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

  await broadcastGame(game.id, user.id);
  revalidatePath(`/games/${game.id}`);
  return { ok: true };
}

export async function abandonGameAction(gameId: string): Promise<ActionResult> {
  const user = await requireUser();
  const game = await db.game.findFirst({
    where: { id: gameId, userId: user.id },
  });
  if (!game) return { ok: false, error: "الصكة غير موجودة" };

  await db.game.update({
    where: { id: gameId },
    data: { status: "ABANDONED", endedAt: new Date() },
  });
  await broadcastGame(gameId, user.id);
  revalidatePath(`/games/${gameId}`);
  return { ok: true };
}

export async function changeGameModeAction(
  gameId: string,
  mode: "NORMAL" | "MASHDOOD",
): Promise<ActionResult> {
  const user = await requireUser();
  const game = await db.game.findFirst({
    where: { id: gameId, userId: user.id },
  });
  if (!game) return { ok: false, error: "الصكة غير موجودة" };
  if (game.status !== "IN_PROGRESS")
    return { ok: false, error: "الصكة منتهية" };

  await db.game.update({ where: { id: gameId }, data: { mode } });
  await broadcastGame(gameId, user.id);
  revalidatePath(`/games/${gameId}`);
  return { ok: true };
}

export async function createPlayerAction(
  name: string,
): Promise<{ ok: true; player: { id: string; name: string; imageUrl: string | null } } | { ok: false; error: string }> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "اسم اللاعب مطلوب" };
  if (trimmed.length > 50) return { ok: false, error: "الاسم طويل جداً (٥٠ حرف بحد أقصى)" };

  try {
    const player = await db.player.create({
      data: { name: trimmed, userId: user.id },
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
    where: { id: gameId, userId: user.id },
  });
  if (!game) return { ok: false, error: "الصكة غير موجودة" };

  // تحقق أن كل اللاعبين يخصّون المستخدم
  const players = await db.player.findMany({
    where: { id: { in: ids }, userId: user.id },
  });
  if (players.length !== 4) {
    return { ok: false, error: "أحد اللاعبين غير موجود في قائمتك" };
  }

  // استبدل المشاركين الحاليين بدفعة جديدة
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

  await broadcastGame(gameId, user.id);
  revalidatePath(`/games/${gameId}`);
  return { ok: true };
}
