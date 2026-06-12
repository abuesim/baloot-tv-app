import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { computePointsStandings } from "@/lib/tournament-sync";
import TournamentDetail from "./TournamentDetail";

const teamSelect = {
  id: true,
  name: true,
  player1: { select: { id: true, name: true, imageUrl: true } },
  player2: { select: { id: true, name: true, imageUrl: true } },
} as const;

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const t = await db.tournament.findUnique({
    where: { id },
    include: {
      teams: {
        include: { team: { select: teamSelect } },
        orderBy: { seed: "asc" },
      },
      matches: {
        include: {
          teamA: { select: teamSelect },
          teamB: { select: teamSelect },
          games: { select: { id: true, status: true } },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });
  if (!t || t.userId !== ownerUserId) notFound();

  // الفرق المتاحة للإضافة (وضع الإعداد فقط)
  const participatingIds = new Set(t.teams.map((tt) => tt.teamId));
  const availableTeams =
    t.status === "DRAFT"
      ? (
          await db.team.findMany({
            where: { userId: ownerUserId },
            select: teamSelect,
            orderBy: { createdAt: "desc" },
          })
        ).filter((tm) => !participatingIds.has(tm.id))
      : [];

  const teamById = new Map(t.teams.map((tt) => [tt.teamId, tt.team]));

  // ترتيب نظام النقاط
  const standings =
    t.format === "POINTS"
      ? (await computePointsStandings(id)).map((s) => ({
          ...s,
          team: teamById.get(s.teamId) ?? null,
        }))
      : [];

  const champion = t.championTeamId ? teamById.get(t.championTeamId) ?? null : null;

  const matches = t.matches.map((m) => ({
    id: m.id,
    round: m.round,
    position: m.position,
    teamA: m.teamA,
    teamB: m.teamB,
    teamAWins: m.teamAWins,
    teamBWins: m.teamBWins,
    bestOf: m.bestOf,
    winnerTeamId: m.winnerTeamId,
    status: m.status,
    ongoingGameId: m.games.find((g) => g.status === "IN_PROGRESS")?.id ?? null,
    playedGames: m.games.filter((g) => g.status === "COMPLETED").length,
  }));

  return (
    <TournamentDetail
      tournament={{
        id: t.id,
        name: t.name,
        format: t.format,
        matchBestOf: t.matchBestOf,
        gameMode: t.gameMode,
        status: t.status,
        championTeamId: t.championTeamId,
      }}
      teams={t.teams.map((tt) => ({ seed: tt.seed, team: tt.team }))}
      availableTeams={availableTeams}
      matches={matches}
      standings={standings}
      champion={champion}
    />
  );
}
