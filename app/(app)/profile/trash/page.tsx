import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManageAds, requireUser } from "@/lib/auth";
import TrashList from "./TrashList";

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("ar", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TrashPage() {
  const me = await requireUser();
  if (!canManageAds(me.role)) redirect("/profile");
  const ownerUserId = me.parentUserId ?? me.id;

  const [games, tournaments] = await Promise.all([
    db.game.findMany({
      where: { userId: ownerUserId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 100,
      include: { participants: { include: { player: true } } },
    }),
    db.tournament.findMany({
      where: { userId: ownerUserId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 100,
      select: { id: true, name: true, deletedAt: true },
    }),
  ]);

  const gameRows = games.map((g) => {
    const t1 = g.participants.filter((p) => p.team === 1).map((p) => p.player.name).join(" و ") || "لنا";
    const t2 = g.participants.filter((p) => p.team === 2).map((p) => p.player.name).join(" و ") || "لهم";
    return {
      id: g.id,
      team1: t1,
      team2: t2,
      score: `${g.team1Score} - ${g.team2Score}`,
      deletedAt: g.deletedAt ? fmt(g.deletedAt) : "",
    };
  });

  const tourRows = tournaments.map((t) => ({
    id: t.id,
    name: t.name,
    deletedAt: t.deletedAt ? fmt(t.deletedAt) : "",
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">🗑️ سجل المحذوفات</h2>
        <p className="text-sm text-white/50">
          الصكات والبطولات المحذوفة — تقدر تسترجعها هنا
        </p>
      </div>
      <TrashList games={gameRows} tournaments={tourRows} />
    </div>
  );
}
