import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import CreateTournamentForm from "./CreateTournamentForm";
import TournamentsList, { type ChampionLite } from "./TournamentsList";

export default async function TournamentsPage() {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const tournaments = await db.tournament.findMany({
    where: { userId: ownerUserId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { teams: true } },
      createdBy: { select: { displayName: true } },
      teams: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              player1: { select: { name: true, imageUrl: true } },
              player2: { select: { name: true, imageUrl: true } },
            },
          },
        },
      },
    },
  });

  const showActor = user.role === "CONTENT_CREATOR" && !user.parentUserId;

  const rows = tournaments.map((t) => {
    let champion: ChampionLite | null = null;
    if (t.championTeamId) {
      const champ = t.teams.find((tt) => tt.teamId === t.championTeamId)?.team;
      if (champ) {
        champion = {
          name: champ.name,
          p1: champ.player1.name,
          p1img: champ.player1.imageUrl,
          p2: champ.player2.name,
          p2img: champ.player2.imageUrl,
        };
      }
    }
    return {
      id: t.id,
      name: t.name,
      format: t.format,
      matchBestOf: t.matchBestOf,
      status: t.status,
      teamsCount: t._count.teams,
      champion,
      createdBy: showActor ? (t.createdBy?.displayName ?? null) : null,
    };
  });

  const canManage = !user.parentUserId || user.subCanManageTournaments;
  const canDelete = !user.parentUserId || user.subCanDelete;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">البطولات</h1>
        <p className="text-white/60">نظّم بطولة بين فرقك</p>
      </div>

      {canManage && <CreateTournamentForm />}

      <TournamentsList tournaments={rows} canDelete={canDelete} />
    </div>
  );
}
