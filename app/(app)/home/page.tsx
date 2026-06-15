import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { RecentGamesList } from "./RecentGamesList";

export default async function HomePage() {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const [recentGames, playersCount, monthGames, tournamentsCount] = await Promise.all([
    db.game.findMany({
      where: { userId: ownerUserId },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: {
        participants: { include: { player: true } },
      },
    }),
    db.player.count({ where: { userId: ownerUserId } }),
    db.game.count({
      where: {
        userId: ownerUserId,
        startedAt: { gte: new Date(new Date().setDate(1)) },
        status: "COMPLETED",
      },
    }),
    db.tournament.count({ where: { userId: ownerUserId } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">أهلاً، {user.displayName}</h1>
        <p className="text-white/60">جاهز لصكة جديدة؟</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/games/new"
          className="btn-grad rounded-2xl p-8 text-center shadow-lg shadow-accent/20"
        >
          <div className="text-5xl mb-2">🎴</div>
          <div className="text-xl font-bold">صكة جديدة</div>
        </Link>
        <Link
          href="/players"
          className="bg-navy rounded-2xl p-8 text-center border border-white/10 hover:border-gold/40"
        >
          <div className="text-5xl mb-2">👥</div>
          <div className="text-xl font-bold">اللاعبون ({playersCount})</div>
        </Link>
        <Link
          href="/stats"
          className="bg-navy rounded-2xl p-8 text-center border border-white/10 hover:border-gold/40"
        >
          <div className="text-5xl mb-2">📊</div>
          <div className="text-xl font-bold">إحصائيات الشهر ({monthGames})</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/tournaments"
          className="bg-navy rounded-2xl p-6 text-center border border-white/10 hover:border-gold/40 flex items-center justify-center gap-3"
        >
          <div className="text-4xl">🏆</div>
          <div className="text-lg font-bold">البطولات ({tournamentsCount})</div>
        </Link>
        <Link
          href="/draw"
          className="bg-navy rounded-2xl p-6 text-center border border-white/10 hover:border-gold/40 flex items-center justify-center gap-3"
        >
          <div className="text-4xl">🎲</div>
          <div className="text-lg font-bold">دق الولد</div>
        </Link>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">آخر الصكات</h2>
        <RecentGamesList initialGames={recentGames} canDelete={!user.parentUserId || user.subCanDelete} />
      </div>
    </div>
  );
}
