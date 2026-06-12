import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import TeamsManager from "./TeamsManager";

export default async function TeamsPage() {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const [players, teams] = await Promise.all([
    db.player.findMany({
      where: { userId: ownerUserId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, imageUrl: true },
    }),
    db.team.findMany({
      where: { userId: ownerUserId },
      orderBy: { createdAt: "desc" },
      include: {
        player1: { select: { id: true, name: true, imageUrl: true } },
        player2: { select: { id: true, name: true, imageUrl: true } },
        _count: { select: { tournamentTeams: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">الفرق</h1>
        <p className="text-white/60">كوّن فرقاً ثابتة (زوج لاعبين) لاستخدامها في البطولات</p>
      </div>

      <TeamsManager
        players={players}
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          player1: t.player1,
          player2: t.player2,
          tournamentsCount: t._count.tournamentTeams,
        }))}
      />
    </div>
  );
}
