// مزامنة حالة المواجهة من نتائج صكاتها + تقدّم الشجرة/البطل
// (وحدة خادم عادية — تُستدعى من actions الصكة والبطولة)

import { db } from "@/lib/db";
import { publish } from "@/lib/events";

/** يُستدعى بعد أي تغيّر في صكة — يزامن مواجهتها إن كانت ضمن بطولة */
export async function syncMatchForGame(gameId: string): Promise<void> {
  const game = await db.game.findUnique({
    where: { id: gameId },
    select: { matchId: true },
  });
  if (game?.matchId) await syncMatch(game.matchId);
}

export async function syncMatch(matchId: string): Promise<void> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { games: { select: { status: true, winner: true } }, tournament: true },
  });
  if (!match) return;

  // عدّ الصكات الفائزة لكل فريق
  let aWins = 0;
  let bWins = 0;
  for (const g of match.games) {
    if (g.status === "COMPLETED" && g.winner != null) {
      if (g.winner === 1) aWins++;
      else if (g.winner === 2) bWins++;
    }
  }

  const need = match.bestOf === 3 ? 2 : 1;
  let winnerTeamId: string | null = null;
  if (match.teamAId && aWins >= need) winnerTeamId = match.teamAId;
  else if (match.teamBId && bWins >= need) winnerTeamId = match.teamBId;

  const hasActiveGame = match.games.some((g) => g.status !== "ABANDONED");
  const status: "PENDING" | "IN_PROGRESS" | "COMPLETED" = winnerTeamId
    ? "COMPLETED"
    : hasActiveGame
      ? "IN_PROGRESS"
      : "PENDING";

  await db.match.update({
    where: { id: matchId },
    data: {
      teamAWins: aWins,
      teamBWins: bWins,
      winnerTeamId,
      status,
      decidedAt: winnerTeamId ? (match.decidedAt ?? new Date()) : null,
    },
  });

  // تقدّم الفائز إلى المواجهة التالية (خروج المغلوب)
  if (winnerTeamId) {
    if (match.nextMatchId && match.nextSlot) {
      await db.match.update({
        where: { id: match.nextMatchId },
        data: match.nextSlot === 1 ? { teamAId: winnerTeamId } : { teamBId: winnerTeamId },
      });
    } else if (!match.nextMatchId && match.tournament.format === "KNOCKOUT") {
      // النهائي → البطل
      await db.tournament.update({
        where: { id: match.tournamentId },
        data: { championTeamId: winnerTeamId, status: "COMPLETED" },
      });
    }
  } else if (match.nextMatchId && match.nextSlot) {
    // تراجعت النتيجة — أفرغ خانة المواجهة التالية إن لم تبدأ بعد
    const nm = await db.match.findUnique({
      where: { id: match.nextMatchId },
      include: { games: { select: { id: true } } },
    });
    if (nm && nm.games.length === 0) {
      await db.match.update({
        where: { id: match.nextMatchId },
        data: match.nextSlot === 1 ? { teamAId: null } : { teamBId: null },
      });
    }
  }

  // نظام تجميع النقاط: إذا اكتملت كل المواجهات → البطل = متصدّر الترتيب
  if (match.tournament.format === "POINTS") {
    await maybeFinishPoints(match.tournamentId);
  }

  // أبلغ شاشة البث بتغيّر البطولة
  publish(`tv:user:${match.tournament.userId}`, { type: "tournament" });
}

async function maybeFinishPoints(tournamentId: string): Promise<void> {
  const matches = await db.match.findMany({
    where: { tournamentId },
    select: { status: true },
  });
  const allDone = matches.length > 0 && matches.every((m) => m.status === "COMPLETED");

  if (!allDone) {
    // ما زالت جارية — تأكد أنها ليست مُعلّمة منتهية
    await db.tournament.update({
      where: { id: tournamentId },
      data: { championTeamId: null, status: "DRAWN" },
    }).catch(() => {});
    return;
  }

  const standings = await computePointsStandings(tournamentId);
  const champion = standings[0]?.teamId ?? null;
  await db.tournament.update({
    where: { id: tournamentId },
    data: { championTeamId: champion, status: "COMPLETED" },
  });
}

export type PointsStanding = {
  teamId: string;
  wins: number;
  losses: number;
  abnat: number; // مجموع نقاط الفريق في كل صكاته (للعرض يُقسم ÷٢)
  lastWinAt: Date | null;
};

/** ترتيب نظام النقاط — محسوب من نتائج المواجهات + الأبناط */
export async function computePointsStandings(
  tournamentId: string,
): Promise<PointsStanding[]> {
  const [teams, matches, games] = await Promise.all([
    db.tournamentTeam.findMany({
      where: { tournamentId },
      select: { teamId: true },
    }),
    db.match.findMany({
      where: { tournamentId, status: "COMPLETED" },
      select: { teamAId: true, teamBId: true, winnerTeamId: true, decidedAt: true },
    }),
    // كل الصكات المنتهية في البطولة — لحساب الأبناط
    db.game.findMany({
      where: { match: { tournamentId }, status: "COMPLETED" },
      select: {
        team1Score: true,
        team2Score: true,
        match: { select: { teamAId: true, teamBId: true } },
      },
    }),
  ]);

  // مجموع أبناط كل فريق (الفريق أ يأخذ team1Score، الفريق ب يأخذ team2Score)
  const abnatById = new Map<string, number>();
  for (const g of games) {
    const a = g.match?.teamAId;
    const b = g.match?.teamBId;
    if (a) abnatById.set(a, (abnatById.get(a) ?? 0) + g.team1Score);
    if (b) abnatById.set(b, (abnatById.get(b) ?? 0) + g.team2Score);
  }

  const rows = teams.map((t) => {
    let wins = 0;
    let losses = 0;
    let lastWinAt: Date | null = null;
    for (const m of matches) {
      const inMatch = m.teamAId === t.teamId || m.teamBId === t.teamId;
      if (!inMatch) continue;
      if (m.winnerTeamId === t.teamId) {
        wins++;
        if (m.decidedAt && (!lastWinAt || m.decidedAt > lastWinAt)) lastWinAt = m.decidedAt;
      } else {
        losses++;
      }
    }
    return { teamId: t.teamId, wins, losses, abnat: abnatById.get(t.teamId) ?? 0, lastWinAt };
  });

  // الترتيب: الأكثر فوزاً ← عند التعادل الأعلى أبناطاً ← الأقل خسارة ← آخر فوز
  return rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.abnat !== a.abnat) return b.abnat - a.abnat;
    if (a.losses !== b.losses) return a.losses - b.losses;
    const ta = a.lastWinAt ? a.lastWinAt.getTime() : 0;
    const tb = b.lastWinAt ? b.lastWinAt.getTime() : 0;
    return tb - ta;
  });
}
