import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export default async function PlayerStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const player = await db.player.findFirst({
    where: { id, userId: ownerUserId },
    select: { id: true, name: true, imageUrl: true },
  });
  if (!player) notFound();

  // كل الصكات المنتهية التي شارك فيها اللاعب
  const games = await db.game.findMany({
    where: {
      userId: ownerUserId,
      status: "COMPLETED",
      winner: { not: null },
      deletedAt: null,
      participants: { some: { playerId: id } },
      // استبعاد صكات البطولات المحذوفة (تبقى الودية بلا مباراة)
      OR: [{ matchId: null }, { match: { tournament: { deletedAt: null } } }],
    },
    include: { participants: { include: { player: true } } },
  });

  // إحصائيات البطولات: شارك فيها + فاز بها (بطل)
  const playerTeams = await db.team.findMany({
    where: {
      OR: [{ player1Id: id }, { player2Id: id }],
      tournamentId: { not: null },
      tournament: { deletedAt: null }, // استبعاد البطولات المحذوفة
    },
    select: {
      id: true,
      tournament: { select: { id: true, name: true, championTeamId: true } },
    },
  });
  const tournamentsPlayed = playerTeams.filter((t) => t.tournament).length;
  const championedTournaments = playerTeams.filter(
    (t) => t.tournament && t.tournament.championTeamId === t.id,
  );
  const titlesCount = championedTournaments.length;

  let wins = 0;
  let losses = 0;

  // إحصائيات الزملاء: مع كل زميل كم لعب وكم فاز
  type Mate = {
    id: string;
    name: string;
    imageUrl: string | null;
    games: number;
    wins: number;
  };
  const mates = new Map<string, Mate>();

  for (const g of games) {
    const mine = g.participants.find((p) => p.playerId === id);
    if (!mine) continue;
    const won = mine.team === g.winner;
    if (won) wins++;
    else losses++;

    // الزميل = اللاعب الآخر في نفس الفريق
    const mate = g.participants.find(
      (p) => p.team === mine.team && p.playerId !== id,
    );
    if (mate) {
      const m = mates.get(mate.playerId) ?? {
        id: mate.playerId,
        name: mate.player.name,
        imageUrl: mate.player.imageUrl,
        games: 0,
        wins: 0,
      };
      m.games++;
      if (won) m.wins++;
      mates.set(mate.playerId, m);
    }
  }

  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  // ترتيب حسب نسبة الفوز معاً (الأعلى أولاً)، ثم الأكثر صكات ثم الأكثر فوزاً
  const matesArr = Array.from(mates.values()).sort((a, b) => {
    const rateA = a.games > 0 ? a.wins / a.games : 0;
    const rateB = b.games > 0 ? b.wins / b.games : 0;
    if (rateB !== rateA) return rateB - rateA;
    if (b.games !== a.games) return b.games - a.games;
    return b.wins - a.wins;
  });

  return (
    <div className="space-y-6">
      <Link href="/players" className="text-xs text-white/40 hover:text-white/70">
        ← كل اللاعبين
      </Link>

      {/* رأس اللاعب */}
      <div className="flex items-center gap-4">
        <PlayerAvatar name={player.name} imageUrl={player.imageUrl} size="xl" />
        <div>
          <h1 className="text-3xl font-bold">{player.name}</h1>
          <p className="text-white/50 text-sm">{total} صكة منتهية</p>
        </div>
      </div>

      {/* البطاقات */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="صكات" value={total} cls="text-white" />
        <StatCard label="فوز" value={wins} cls="text-green-400" />
        <StatCard label="خسارة" value={losses} cls="text-red-400" />
      </div>

      {/* نسبة الفوز */}
      <div className="bg-navy rounded-2xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">نسبة الفوز</span>
          <span className="text-2xl font-black text-gold">{winRate}%</span>
        </div>
        <div className="bg-white/5 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gold transition-all"
            style={{ width: `${winRate}%` }}
          />
        </div>
      </div>

      {/* البطولات */}
      <div>
        <h2 className="text-xl font-bold mb-3">🏆 البطولات</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="بطولات شارك فيها" value={tournamentsPlayed} cls="text-white" />
          <StatCard label="بطولات فاز بها" value={titlesCount} cls="text-gold" />
        </div>
        {championedTournaments.length > 0 && (
          <div className="mt-3 bg-gradient-to-l from-gold/15 to-transparent rounded-2xl border border-gold/25 overflow-hidden">
            {championedTournaments.map((t, i) => (
              <Link
                key={t.tournament!.id}
                href={`/tournaments/${t.tournament!.id}`}
                className={`flex items-center gap-3 p-3 hover:bg-white/5 transition-colors ${
                  i > 0 ? "border-t border-white/5" : ""
                }`}
              >
                <span className="text-2xl">🏆</span>
                <span className="flex-1 font-bold truncate">{t.tournament!.name}</span>
                <span className="text-xs text-gold shrink-0">بطل</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* الزملاء */}
      <div>
        <h2 className="text-xl font-bold mb-3">اللاعبون الذين لعب معهم</h2>
        {matesArr.length === 0 ? (
          <div className="bg-navy rounded-2xl p-8 text-center text-white/40 border border-white/10">
            ما في صكات مكتملة بعد
          </div>
        ) : (
          <div className="bg-navy rounded-2xl border border-white/10 overflow-hidden">
            {matesArr.map((m, i) => {
              const rate = m.games > 0 ? Math.round((m.wins / m.games) * 100) : 0;
              return (
                <Link
                  key={m.id}
                  href={`/players/${m.id}`}
                  className={`flex items-center gap-3 p-3 hover:bg-white/5 transition-colors ${
                    i > 0 ? "border-t border-white/5" : ""
                  }`}
                >
                  <PlayerAvatar name={m.name} imageUrl={m.imageUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{m.name}</div>
                    <div className="text-xs text-white/40">
                      {m.games} صكة · {m.wins} فوز
                    </div>
                  </div>
                  {/* شريط نسبة الفوز معه */}
                  <div className="w-24 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">معاً</span>
                      <span
                        className={`text-sm font-black ${
                          rate >= 50 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {rate}%
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${rate >= 50 ? "bg-green-400" : "bg-red-400"}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="bg-navy rounded-2xl p-4 border border-white/10 text-center">
      <div className={`text-3xl font-black ${cls}`}>{value}</div>
      <div className="text-xs text-white/50 mt-1">{label}</div>
    </div>
  );
}
