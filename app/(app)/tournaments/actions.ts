"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { GAME_MODES } from "@/lib/baloot";
import { publish } from "@/lib/events";
import { buildBracketSeeds, buildRoundRobin } from "@/lib/tournament";
import { syncMatch } from "@/lib/tournament-sync";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function owner() {
  const user = await requireUser();
  return user.parentUserId ?? user.id;
}

/** سياق الفاعل + صلاحيات المستخدم الفرعي */
async function actorCtx() {
  const user = await requireUser();
  const isSub = !!user.parentUserId;
  return {
    ownerUserId: user.parentUserId ?? user.id,
    canManage: !isSub || user.subCanManageTournaments,
    canDelete: !isSub || user.subCanDelete,
  };
}
const NO_MANAGE = "ليس لديك صلاحية إدارة البطولات";
const NO_DELETE = "ليس لديك صلاحية الحذف";

// ─── إنشاء بطولة ───
const createSchema = z.object({
  name: z.string().min(1, "اسم البطولة مطلوب").max(60),
  format: z.enum(["KNOCKOUT", "POINTS"]),
  matchBestOf: z.union([z.literal(1), z.literal(3)]),
  gameMode: z.enum(["NORMAL", "MASHDOOD"]),
  doubleRoundRobin: z.boolean().optional(),
});

export async function createTournamentAction(input: {
  name: string;
  format: "KNOCKOUT" | "POINTS";
  matchBestOf: 1 | 3;
  gameMode: "NORMAL" | "MASHDOOD";
  doubleRoundRobin?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { ownerUserId, canManage } = await actorCtx();
  if (!canManage) return { ok: false, error: NO_MANAGE };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }
  const t = await db.tournament.create({
    data: {
      userId: ownerUserId,
      name: parsed.data.name.trim(),
      format: parsed.data.format,
      matchBestOf: parsed.data.matchBestOf,
      gameMode: parsed.data.gameMode,
      doubleRoundRobin: parsed.data.format === "POINTS" ? !!parsed.data.doubleRoundRobin : false,
      status: "DRAFT",
    },
  });
  revalidatePath("/tournaments");
  return { ok: true, id: t.id };
}

// ─── تعديل إعدادات البطولة (قبل القرعة فقط) ───
const editSchema = z.object({
  name: z.string().min(1, "اسم البطولة مطلوب").max(60),
  format: z.enum(["KNOCKOUT", "POINTS"]),
  matchBestOf: z.union([z.literal(1), z.literal(3)]),
  gameMode: z.enum(["NORMAL", "MASHDOOD"]),
  doubleRoundRobin: z.boolean().optional(),
});

export async function updateTournamentAction(
  tournamentId: string,
  input: {
    name: string;
    format: "KNOCKOUT" | "POINTS";
    matchBestOf: 1 | 3;
    gameMode: "NORMAL" | "MASHDOOD";
    doubleRoundRobin?: boolean;
  },
): Promise<ActionResult> {
  const { ownerUserId, canManage } = await actorCtx();
  if (!canManage) return { ok: false, error: NO_MANAGE };
  const t = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };
  if (t.status !== "DRAFT") return { ok: false, error: "لا يمكن التعديل بعد القرعة" };

  const parsed = editSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  await db.tournament.update({
    where: { id: tournamentId },
    data: {
      name: parsed.data.name.trim(),
      format: parsed.data.format,
      matchBestOf: parsed.data.matchBestOf,
      gameMode: parsed.data.gameMode,
      doubleRoundRobin: parsed.data.format === "POINTS" ? !!parsed.data.doubleRoundRobin : false,
    },
  });
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function deleteTournamentAction(tournamentId: string): Promise<ActionResult> {
  const { ownerUserId, canDelete } = await actorCtx();
  if (!canDelete) return { ok: false, error: NO_DELETE };
  const t = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };

  // حذف ناعم — تبقى مع فرقها ومبارياتها قابلة للاسترجاع
  await db.tournament.update({
    where: { id: tournamentId },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/tournaments");
  revalidatePath("/profile/trash");
  return { ok: true };
}

// ─── اللاعبون المستخدَمون في فرق هذه البطولة ───
async function usedPlayerIds(tournamentId: string): Promise<Set<string>> {
  const teams = await db.team.findMany({
    where: { tournamentId },
    select: { player1Id: true, player2Id: true },
  });
  const used = new Set<string>();
  for (const t of teams) {
    used.add(t.player1Id);
    used.add(t.player2Id);
  }
  return used;
}

// ─── إنشاء فريق داخل البطولة ───
const teamSchema = z.object({
  name: z.string().min(1, "اسم الفريق مطلوب").max(40, "اسم الفريق طويل"),
  player1Id: z.string().min(1, "اختر اللاعب الأول"),
  player2Id: z.string().min(1, "اختر اللاعب الثاني"),
});

export async function createTournamentTeamAction(
  tournamentId: string,
  input: { name: string; player1Id: string; player2Id: string },
): Promise<ActionResult> {
  const { ownerUserId, canManage } = await actorCtx();
  if (!canManage) return { ok: false, error: NO_MANAGE };
  const t = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };
  if (t.status !== "DRAFT") return { ok: false, error: "لا يمكن تعديل الفرق بعد القرعة" };

  const parsed = teamSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }
  const { name, player1Id, player2Id } = parsed.data;
  if (player1Id === player2Id) return { ok: false, error: "لازم تختار لاعبين مختلفين" };

  // اللاعبان من روستر المستخدم
  const players = await db.player.findMany({
    where: { id: { in: [player1Id, player2Id] }, userId: ownerUserId },
    select: { id: true },
  });
  if (players.length !== 2) return { ok: false, error: "أحد اللاعبين غير موجود في قائمتك" };

  // قاعدة: اللاعب لا يتكرر داخل نفس البطولة
  const used = await usedPlayerIds(tournamentId);
  if (used.has(player1Id) || used.has(player2Id)) {
    return { ok: false, error: "أحد اللاعبين موجود في فريق آخر بهذه البطولة" };
  }

  const team = await db.team.create({
    data: {
      userId: ownerUserId,
      tournamentId,
      name: name.trim(),
      player1Id,
      player2Id,
    },
  });
  await db.tournamentTeam.create({ data: { tournamentId, teamId: team.id } });

  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

// ─── فرق عشوائية: اختر اللاعبين والقرعة تكوّن الفرق ───
export async function randomTeamsAction(
  tournamentId: string,
  playerIds: string[],
): Promise<{ ok: true; teams: string[] } | { ok: false; error: string }> {
  const { ownerUserId, canManage } = await actorCtx();
  if (!canManage) return { ok: false, error: NO_MANAGE };
  const t = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };
  if (t.status !== "DRAFT") return { ok: false, error: "لا يمكن تعديل الفرق بعد القرعة" };

  const ids = [...new Set(playerIds)];
  if (ids.length < 4) return { ok: false, error: "اختر ٤ لاعبين على الأقل" };
  if (ids.length % 2 !== 0)
    return { ok: false, error: "عدد اللاعبين لازم يكون زوجياً — أزِل لاعباً أو أضِف آخر" };

  // اللاعبون من روستر المستخدم
  const players = await db.player.findMany({
    where: { id: { in: ids }, userId: ownerUserId },
    select: { id: true, name: true },
  });
  if (players.length !== ids.length) {
    return { ok: false, error: "أحد اللاعبين غير موجود في قائمتك" };
  }

  // قاعدة: اللاعب لا يتكرر داخل نفس البطولة
  const used = await usedPlayerIds(tournamentId);
  const conflict = ids.find((id) => used.has(id));
  if (conflict) {
    return { ok: false, error: "أحد اللاعبين موجود في فريق آخر بهذه البطولة" };
  }

  // خلط عشوائي ثم أزواج متتالية
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const created: string[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1];
    const team = await db.team.create({
      data: {
        userId: ownerUserId,
        tournamentId,
        name: `${a.name} و ${b.name}`,
        player1Id: a.id,
        player2Id: b.id,
      },
    });
    await db.tournamentTeam.create({
      data: { tournamentId, teamId: team.id },
    });
    created.push(team.id);
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, teams: created };
}

export async function removeTournamentTeamAction(
  tournamentId: string,
  teamId: string,
): Promise<ActionResult> {
  const { ownerUserId, canManage } = await actorCtx();
  if (!canManage) return { ok: false, error: NO_MANAGE };
  const t = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };
  if (t.status !== "DRAFT") return { ok: false, error: "لا يمكن تعديل الفرق بعد القرعة" };

  await db.tournamentTeam.deleteMany({ where: { tournamentId, teamId } });
  // الفريق ملك هذه البطولة → نحذفه نهائياً ليتحرر لاعباه
  await db.team.deleteMany({ where: { id: teamId, tournamentId, userId: ownerUserId } });
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

// ─── القرعة: توليد المواجهات ───
export async function runDrawAction(
  tournamentId: string,
): Promise<{ ok: true; order: string[] } | { ok: false; error: string }> {
  const { ownerUserId, canManage } = await actorCtx();
  if (!canManage) return { ok: false, error: NO_MANAGE };
  const t = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true },
  });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };
  if (t.status !== "DRAFT") return { ok: false, error: "تمت القرعة مسبقاً" };
  if (t.teams.length < 2) return { ok: false, error: "تحتاج فريقين على الأقل" };

  // قرعة عشوائية
  const shuffled = [...t.teams].sort(() => Math.random() - 0.5).map((tt) => tt.teamId);

  // احذف أي مواجهات سابقة (احتياط)
  await db.match.deleteMany({ where: { tournamentId } });

  if (t.format === "KNOCKOUT") {
    const seeds = buildBracketSeeds(shuffled);
    // أدرج من النهائي للأسفل حتى تتوفّر nextMatchId
    const byKey = new Map<string, string>(); // "round:position" -> dbId
    const sortedDesc = [...seeds].sort((a, b) => b.round - a.round || a.position - b.position);
    for (const s of sortedDesc) {
      const nextId =
        s.parentPosition !== null
          ? byKey.get(`${s.round + 1}:${s.parentPosition}`) ?? null
          : null;
      const created = await db.match.create({
        data: {
          tournamentId,
          round: s.round,
          position: s.position,
          teamAId: s.teamAId,
          teamBId: s.teamBId,
          bestOf: t.matchBestOf,
          nextMatchId: nextId,
          nextSlot: s.parentSlot,
          status: "PENDING",
        },
      });
      byKey.set(`${s.round}:${s.position}`, created.id);
    }

    // معالجة «الباي»: مواجهات الدور الأول بفريق واحد → تأهل تلقائي
    const round1Byes = seeds.filter((s) => s.round === 1 && s.teamAId && !s.teamBId);
    for (const s of round1Byes) {
      const id = byKey.get(`1:${s.position}`)!;
      await db.match.update({
        where: { id },
        data: {
          winnerTeamId: s.teamAId,
          status: "COMPLETED",
          decidedAt: new Date(),
        },
      });
      if (s.parentPosition !== null && s.parentSlot) {
        const parentId = byKey.get(`2:${s.parentPosition}`)!;
        await db.match.update({
          where: { id: parentId },
          data: s.parentSlot === 1 ? { teamAId: s.teamAId } : { teamBId: s.teamAId },
        });
      }
    }
  } else {
    // POINTS — دوري كامل (أو ذهاب وإياب)
    const pairs = buildRoundRobin(shuffled, t.doubleRoundRobin);
    for (const p of pairs) {
      await db.match.create({
        data: {
          tournamentId,
          round: p.round,
          position: p.position,
          teamAId: p.teamAId,
          teamBId: p.teamBId,
          bestOf: t.matchBestOf,
          status: "PENDING",
        },
      });
    }
  }

  // ثبّت ترتيب القرعة (seed) + غيّر الحالة
  for (let i = 0; i < shuffled.length; i++) {
    await db.tournamentTeam.updateMany({
      where: { tournamentId, teamId: shuffled[i] },
      data: { seed: i + 1 },
    });
  }
  await db.tournament.update({
    where: { id: tournamentId },
    data: { status: "DRAWN", drawCeremonyAt: new Date() },
  });

  publish(`tv:user:${ownerUserId}`, { type: "tournament" });
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, order: shuffled };
}

// ─── بثّ القرعة على شاشة البث (إعادة العرض) ───
export async function broadcastDrawAction(tournamentId: string): Promise<ActionResult> {
  const { ownerUserId, canManage } = await actorCtx();
  if (!canManage) return { ok: false, error: NO_MANAGE };
  const t = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };
  if (t.status === "DRAFT") return { ok: false, error: "أجرِ القرعة أولاً" };

  await db.tournament.update({
    where: { id: tournamentId },
    data: { drawCeremonyAt: new Date() },
  });
  publish(`tv:user:${ownerUserId}`, { type: "tournament" });
  return { ok: true };
}

// ─── إعادة القرعة (قبل بدء أي صكة) ───
export async function resetDrawAction(tournamentId: string): Promise<ActionResult> {
  const { ownerUserId, canManage } = await actorCtx();
  if (!canManage) return { ok: false, error: NO_MANAGE };
  const t = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: { matches: { include: { games: { select: { id: true } } } } },
  });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };

  const anyStarted = t.matches.some((m) => m.games.length > 0);
  if (anyStarted) return { ok: false, error: "بدأت بعض الصكات — لا يمكن إعادة القرعة" };

  await db.match.deleteMany({ where: { tournamentId } });
  await db.tournament.update({
    where: { id: tournamentId },
    data: { status: "DRAFT", championTeamId: null },
  });
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

// ─── بدء صكة لمواجهة (يربطها بالحاسبة) ───
export async function startMatchGameAction(
  matchId: string,
): Promise<{ ok: true; gameId: string } | { ok: false; error: string }> {
  const ownerUserId = await owner();
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      teamA: true,
      teamB: true,
      games: { select: { id: true, status: true } },
    },
  });
  if (!match || match.tournament.userId !== ownerUserId) {
    return { ok: false, error: "المواجهة غير موجودة" };
  }
  if (match.status === "COMPLETED") return { ok: false, error: "المواجهة محسومة" };
  if (!match.teamA || !match.teamB) {
    return { ok: false, error: "لم يتأهل الفريقان بعد" };
  }
  // صكة جارية بالفعل؟ ادخل عليها
  const ongoing = match.games.find((g) => g.status === "IN_PROGRESS");
  if (ongoing) redirect(`/games/${ongoing.id}`);

  const cfg = GAME_MODES[match.tournament.gameMode];
  const game = await db.game.create({
    data: {
      userId: ownerUserId,
      matchId,
      mode: match.tournament.gameMode,
      team1Score: cfg.startScore,
      team2Score: cfg.startScore,
      targetScore: cfg.targetScore,
      participants: {
        create: [
          { playerId: match.teamA.player1Id, team: 1 },
          { playerId: match.teamA.player2Id, team: 1 },
          { playerId: match.teamB.player1Id, team: 2 },
          { playerId: match.teamB.player2Id, team: 2 },
        ],
      },
    },
  });

  // مشدود: جولة البداية 52-52
  if (match.tournament.gameMode === "MASHDOOD") {
    await db.round.create({
      data: { gameId: game.id, number: 0, team1Score: 52, team2Score: 52 },
    });
  }

  await db.match.update({ where: { id: matchId }, data: { status: "IN_PROGRESS" } });
  await syncMatch(matchId);

  redirect(`/games/${game.id}`);
}
