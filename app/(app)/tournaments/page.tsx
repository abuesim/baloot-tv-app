import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import CreateTournamentForm from "./CreateTournamentForm";
import TournamentsList from "./TournamentsList";

export default async function TournamentsPage() {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const tournaments = await db.tournament.findMany({
    where: { userId: ownerUserId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { teams: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">البطولات</h1>
        <p className="text-white/60">نظّم بطولة بين فرقك</p>
      </div>

      <CreateTournamentForm />

      <TournamentsList
        tournaments={tournaments.map((t) => ({
          id: t.id,
          name: t.name,
          format: t.format,
          matchBestOf: t.matchBestOf,
          status: t.status,
          teamsCount: t._count.teams,
        }))}
      />
    </div>
  );
}
