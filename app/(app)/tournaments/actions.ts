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

// ─── إنشاء بطولة ───
const createSchema = z.object({
  name: z.string().min(1, "اسم البطولة مطلوب").max(60),
  format: z.enum(["KNOCKOUT", "POINTS"]),
  matchBestOf: z.union([z.literal(1), z.literal(3)]),
  gameMode: z.enum(["NORMAL", "MASHDOOD"]),
});

export async function createTournamentAction(input: {
  name: string;
  format: "KNOCKOUT" | "POINTS";
  matchBestOf: 1 | 3;
  gameMode: "NORMAL" | "MASHDOOD";
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ownerUserId = await owner();
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
      status: "DRAFT",
    },
  });
  revalidatePath("/tournaments");
  return { ok: true, id: t.id };
}

export async function deleteTournamentAction(tournamentId: string): Promise<ActionResult> {
  const ownerUserId = await owner();
  const t = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };

  // فكّ ربط الصكات ثم احذف
  await db.game.updateMany({
    where: { match: { tournamentId } },
    data: { matchId: null },
  });
  await db.tournament.delete({ where: { id: tournamentId } });
  revalidatePath("/tournaments");
  return { ok: true };
}

// ─── إضافة/إزالة فريق مشارك ───
export async function addTournamentTeamAction(
  tournamentId: string,
  teamId: string,
): Promise<ActionResult> {
  const ownerUserId = await owner();
  const t = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };
  if (t.status !== "DRAFT") return { ok: false, error: "لا يمكن تعديل الفرق بعد القرعة" };

  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team || team.userId !== ownerUserId) return { ok: false, error: "الفريق غير موجود" };

  await db.tournamentTeam.upsert({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    create: { tournamentId, teamId },
    update: {},
  });
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function removeTournamentTeamAction(
  tournamentId: string,
  teamId: string,
): Promise<ActionResult> {
  const ownerUserId = await owner();
  const t = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.userId !== ownerUserId) return { ok: false, error: "البطولة غير موجودة" };
  if (t.status !== "DRAFT") return { ok: false, error: "لا يمكن تعديل الفرق بعد القرعة" };

  await db.tournamentTeam.deleteMany({ where: { tournamentId, teamId } });
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true };
}

// ─── القرعة: توليد المواجهات ───
export async function runDrawAction(
  tournamentId: string,
): Promise<{ ok: true; order: string[] } | { ok: false; error: string }> {
  const ownerUserId = await owner();
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
    // POINTS — دوري كامل
    const pairs = buildRoundRobin(shuffled);
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
  await db.tournament.update({ where: { id: tournamentId }, data: { status: "DRAWN" } });

  publish(`tv:user:${ownerUserId}`, { type: "tournament" });
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, order: shuffled };
}

// ─── إعادة القرعة (قبل بدء أي صكة) ───
export async function resetDrawAction(tournamentId: string): Promise<ActionResult> {
  const ownerUserId = await owner();
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
