import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export default async function HomePage() {
  const user = await requireUser();

  const [recentGames, playersCount, monthGames] = await Promise.all([
    db.game.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: {
        participants: { include: { player: true } },
      },
    }),
    db.player.count({ where: { userId: user.id } }),
    db.game.count({
      where: {
        userId: user.id,
        startedAt: { gte: new Date(new Date().setDate(1)) },
        status: "COMPLETED",
      },
    }),
  ]);

  function teamPlayers(game: (typeof recentGames)[number], team: 1 | 2) {
    return game.participants.filter((p) => p.team === team).map((p) => p.player);
  }

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

      <div>
        <h2 className="text-xl font-bold mb-4">آخر الصكات</h2>
        {recentGames.length === 0 ? (
          <div className="bg-navy rounded-2xl p-12 text-center text-white/40 border border-white/10">
            لا توجد صكات بعد
          </div>
        ) : (
          <div className="space-y-3">
            {recentGames.map((g) => (
              <Link
                key={g.id}
                href={`/games/${g.id}`}
                className="block bg-navy rounded-2xl p-4 border border-white/10 hover:border-gold/40"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-gold font-bold shrink-0">لنا</span>
                      <div className="flex -space-x-2 -space-x-reverse">
                        {teamPlayers(g, 1).map((p) => (
                          <PlayerAvatar
                            key={p.id}
                            name={p.name}
                            imageUrl={p.imageUrl}
                            size="sm"
                            className="ring-2 ring-navy"
                          />
                        ))}
                      </div>
                      <span className="mx-1 text-white/30">vs</span>
                      <div className="flex -space-x-2 -space-x-reverse">
                        {teamPlayers(g, 2).map((p) => (
                          <PlayerAvatar
                            key={p.id}
                            name={p.name}
                            imageUrl={p.imageUrl}
                            size="sm"
                            className="ring-2 ring-navy"
                          />
                        ))}
                      </div>
                      <span className="text-xs text-white/60 font-bold shrink-0">لهم</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span>{new Date(g.startedAt).toLocaleString("ar-SA")}</span>
                      {g.mode === "MASHDOOD" && (
                        <span className="bg-gold/20 text-gold px-2 py-0.5 rounded">
                          مشدود
                        </span>
                      )}
                      {g.status === "IN_PROGRESS" && (
                        <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          جارية
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold flex items-center gap-3 shrink-0">
                    <span className={g.winner === 1 ? "text-gold" : "text-gold/80"}>
                      {g.team1Score}
                    </span>
                    <span className="text-white/30">-</span>
                    <span className={g.winner === 2 ? "text-gold" : "text-white"}>
                      {g.team2Score}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
