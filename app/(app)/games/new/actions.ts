"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { GAME_MODES, type GameMode } from "@/lib/baloot";
import { publish } from "@/lib/events";

const schema = z.object({
  mode: z.enum(["NORMAL", "MASHDOOD"]),
  team1Player1Id: z.string().optional(),
  team1Player2Id: z.string().optional(),
  team2Player1Id: z.string().optional(),
  team2Player2Id: z.string().optional(),
});

export type ActionResult = { ok: true; gameId: string } | { ok: false; error: string };

export async function createGameAction(input: {
  mode: GameMode;
  team1Player1Id?: string;
  team1Player2Id?: string;
  team2Player1Id?: string;
  team2Player2Id?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة" };

  const ids = [
    parsed.data.team1Player1Id,
    parsed.data.team1Player2Id,
    parsed.data.team2Player1Id,
    parsed.data.team2Player2Id,
  ].filter((id): id is string => Boolean(id));

  // إما أن يختار الكل (٤ لاعبين مختلفين) أو لا أحد
  if (ids.length !== 0 && ids.length !== 4) {
    return {
      ok: false,
      error: "إما اختر كل اللاعبين الأربعة أو لا تختر أحداً (تقدر تضيفهم لاحقاً)",
    };
  }

  if (ids.length === 4 && new Set(ids).size !== 4) {
    return { ok: false, error: "كل لاعب يجب أن يكون مختلفاً عن الآخرين" };
  }

  if (ids.length === 4) {
    const players = await db.player.findMany({
      where: { id: { in: ids }, userId: user.id },
    });
    if (players.length !== 4) {
      return { ok: false, error: "أحد اللاعبين غير موجود في قائمتك" };
    }
  }

  const modeConfig = GAME_MODES[parsed.data.mode];

  const game = await db.game.create({
    data: {
      userId: user.id,
      mode: parsed.data.mode,
      team1Score: modeConfig.startScore,
      team2Score: modeConfig.startScore,
      targetScore: modeConfig.targetScore,
      participants:
        ids.length === 4
          ? {
              create: [
                { playerId: parsed.data.team1Player1Id!, team: 1 },
                { playerId: parsed.data.team1Player2Id!, team: 1 },
                { playerId: parsed.data.team2Player1Id!, team: 2 },
                { playerId: parsed.data.team2Player2Id!, team: 2 },
              ],
            }
          : undefined,
    },
    include: {
      participants: { include: { player: true } },
      rounds: { orderBy: { number: "asc" } },
    },
  });

  publish(`tv:user:${user.id}`, { type: "game", game });
  redirect(`/games/${game.id}`);
}
