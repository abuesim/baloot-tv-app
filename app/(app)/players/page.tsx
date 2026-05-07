import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import PlayersManager from "./PlayersManager";

export default async function PlayersPage() {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const players = await db.player.findMany({
    where: { userId: ownerUserId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { participants: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">اللاعبون ({players.length})</h1>
        <p className="text-white/60">قائمة لاعبيك الخاصة</p>
      </div>
      <PlayersManager
        players={players.map((p) => ({
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          gamesPlayed: p._count.participants,
        }))}
      />
    </div>
  );
}
