// تجهيز بيانات البطولة لشاشة البث (شكل مُبسّط)

import { db } from "@/lib/db";
import { computePointsStandings } from "@/lib/tournament-sync";

export type TvTeam = {
  id: string;
  name: string;
  p1: string | null;
  p2: string | null;
  seed: number;
};
export type TvMatch = {
  id: string;
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string | null;
  teamBName: string | null;
  teamAWins: number;
  teamBWins: number;
  winnerTeamId: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
};
export type TvChampionTeam = {
  name: string;
  p1: string | null;
  p1img: string | null;
  p2: string | null;
  p2img: string | null;
};
export type TvTournament = {
  id: string;
  name: string;
  format: "KNOCKOUT" | "POINTS";
  status: "DRAWN" | "IN_PROGRESS" | "COMPLETED";
  matchBestOf: number;
  championName: string | null;
  champion: TvChampionTeam | null; // الفريق البطل (بالصور)
  runnerUp: TvChampionTeam | null; // الوصيف
  championAt: number | null; // توقيت التتويج (لبثّ الاحتفال مرة)
  drawAt: number | null; // توقيت آخر بث للقرعة (ms)
  teams: TvTeam[]; // مرتبة حسب seed
  matches: TvMatch[];
  standings: { teamId: string; name: string; wins: number; losses: number }[];
};

const teamSelect = {
  id: true,
  name: true,
  player1: { select: { name: true, imageUrl: true } },
  player2: { select: { name: true, imageUrl: true } },
} as const;

/** أحدث بطولة لعرضها على الشاشة (بعد القرعة — تشمل المنتهية لعرض التتويج) */
export async function getActiveTvTournament(
  userId: string,
): Promise<TvTournament | null> {
  const t = await db.tournament.findFirst({
    where: { userId, status: { in: ["DRAWN", "IN_PROGRESS", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      teams: { include: { team: { select: teamSelect } }, orderBy: { seed: "asc" } },
      matches: {
        include: {
          teamA: { select: teamSelect },
          teamB: { select: teamSelect },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });
  if (!t) return null;

  const teamById = new Map(t.teams.map((tt) => [tt.teamId, tt.team]));
  const nameById = new Map(t.teams.map((tt) => [tt.teamId, tt.team.name]));

  const toChampionTeam = (
    team: { name: string; player1: { name: string; imageUrl: string | null }; player2: { name: string; imageUrl: string | null } } | null | undefined,
  ): TvChampionTeam | null =>
    team
      ? {
          name: team.name,
          p1: team.player1?.name ?? null,
          p1img: team.player1?.imageUrl ?? null,
          p2: team.player2?.name ?? null,
          p2img: team.player2?.imageUrl ?? null,
        }
      : null;

  const standings =
    t.format === "POINTS"
      ? (await computePointsStandings(t.id)).map((s) => ({
          teamId: s.teamId,
          name: nameById.get(s.teamId) ?? "—",
          wins: s.wins,
          losses: s.losses,
        }))
      : [];

  // البطل + الوصيف
  const champion = t.championTeamId ? toChampionTeam(teamById.get(t.championTeamId)) : null;
  let runnerUp: TvChampionTeam | null = null;
  if (t.championTeamId) {
    if (t.format === "KNOCKOUT") {
      const maxRound = Math.max(0, ...t.matches.map((m) => m.round));
      const fin = t.matches.find((m) => m.round === maxRound && m.status === "COMPLETED");
      if (fin) {
        const loser = fin.teamAId === t.championTeamId ? fin.teamB : fin.teamA;
        runnerUp = toChampionTeam(loser);
      }
    } else {
      const second = standings[1]?.teamId;
      runnerUp = second ? toChampionTeam(teamById.get(second)) : null;
    }
  }

  // توقيت التتويج = أحدث وقت حُسمت فيه مواجهة
  const decidedTimes = t.matches
    .map((m) => m.decidedAt?.getTime() ?? 0)
    .filter((n) => n > 0);
  const championAt =
    t.status === "COMPLETED" && decidedTimes.length ? Math.max(...decidedTimes) : null;

  return {
    id: t.id,
    name: t.name,
    format: t.format,
    status: t.status as "DRAWN" | "IN_PROGRESS" | "COMPLETED",
    matchBestOf: t.matchBestOf,
    championName: t.championTeamId ? nameById.get(t.championTeamId) ?? null : null,
    champion,
    runnerUp,
    championAt,
    drawAt: t.drawCeremonyAt ? t.drawCeremonyAt.getTime() : null,
    teams: t.teams.map((tt) => ({
      id: tt.teamId,
      name: tt.team.name,
      p1: tt.team.player1?.name ?? null,
      p2: tt.team.player2?.name ?? null,
      seed: tt.seed,
    })),
    matches: t.matches.map((m) => ({
      id: m.id,
      round: m.round,
      position: m.position,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      teamAName: m.teamA?.name ?? null,
      teamBName: m.teamB?.name ?? null,
      teamAWins: m.teamAWins,
      teamBWins: m.teamBWins,
      winnerTeamId: m.winnerTeamId,
      status: m.status as "PENDING" | "IN_PROGRESS" | "COMPLETED",
    })),
    standings,
  };
}

/** بصمة مختصرة لاكتشاف تغيّر البطولة في الـ SSE */
export function tvTournamentSignature(t: TvTournament | null): string {
  if (!t) return "none";
  const ms = t.matches
    .map((m) => `${m.id}:${m.teamAId ?? "-"}:${m.teamBId ?? "-"}:${m.teamAWins}-${m.teamBWins}:${m.status}`)
    .join("|");
  return `${t.id}:${t.status}:${t.championName ?? "-"}:${ms}`;
}
