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
export type TvTournament = {
  id: string;
  name: string;
  format: "KNOCKOUT" | "POINTS";
  status: "DRAWN" | "IN_PROGRESS" | "COMPLETED";
  matchBestOf: number;
  championName: string | null;
  drawAt: number | null; // توقيت آخر بث للقرعة (ms)
  teams: TvTeam[]; // مرتبة حسب seed
  matches: TvMatch[];
  standings: { teamId: string; name: string; wins: number; losses: number }[];
};

const teamSelect = {
  id: true,
  name: true,
  player1: { select: { name: true } },
  player2: { select: { name: true } },
} as const;

/** أحدث بطولة نشطة لعرضها على الشاشة (بعد القرعة) */
export async function getActiveTvTournament(
  userId: string,
): Promise<TvTournament | null> {
  const t = await db.tournament.findFirst({
    where: { userId, status: { in: ["DRAWN", "IN_PROGRESS"] } },
    orderBy: { createdAt: "desc" },
    include: {
      teams: { include: { team: { select: teamSelect } }, orderBy: { seed: "asc" } },
      matches: {
        include: {
          teamA: { select: { id: true, name: true } },
          teamB: { select: { id: true, name: true } },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });
  if (!t) return null;

  const nameById = new Map(t.teams.map((tt) => [tt.teamId, tt.team.name]));

  const standings =
    t.format === "POINTS"
      ? (await computePointsStandings(t.id)).map((s) => ({
          teamId: s.teamId,
          name: nameById.get(s.teamId) ?? "—",
          wins: s.wins,
          losses: s.losses,
        }))
      : [];

  return {
    id: t.id,
    name: t.name,
    format: t.format,
    status: t.status as "DRAWN" | "IN_PROGRESS",
    matchBestOf: t.matchBestOf,
    championName: t.championTeamId ? nameById.get(t.championTeamId) ?? null : null,
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
