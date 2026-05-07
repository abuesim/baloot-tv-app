import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type SearchParams = Promise<{ month?: string }>;

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const sp = await searchParams;

  const now = new Date();
  const [yStr, mStr] = (sp.month ?? "").split("-");
  const year = Number(yStr) || now.getFullYear();
  const month = (Number(mStr) || now.getMonth() + 1) - 1;
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const games = await db.game.findMany({
    where: {
      userId: ownerUserId,
      status: "COMPLETED",
      startedAt: { gte: monthStart, lt: monthEnd },
    },
    include: {
      participants: { include: { player: true } },
    },
  });

  // إحصائيات فردية
  type Indi = {
    playerId: string;
    name: string;
    imageUrl: string | null;
    games: number;
    wins: number;
    losses: number;
  };
  const individuals = new Map<string, Indi>();

  for (const g of games) {
    if (g.winner === null) continue;
    for (const p of g.participants) {
      const stat = individuals.get(p.player.id) ?? {
        playerId: p.player.id,
        name: p.player.name,
        imageUrl: p.player.imageUrl,
        games: 0,
        wins: 0,
        losses: 0,
      };
      stat.games++;
      if (p.team === g.winner) stat.wins++;
      else stat.losses++;
      individuals.set(p.player.id, stat);
    }
  }

  const individualsArr = Array.from(individuals.values()).sort(
    (a, b) => b.wins - a.wins || b.games - a.games,
  );

  // إحصائيات جماعية (أزواج)
  type Team = {
    key: string;
    players: { name: string; imageUrl: string | null }[];
    games: number;
    wins: number;
    losses: number;
  };
  const teams = new Map<string, Team>();
  for (const g of games) {
    if (g.winner === null) continue;
    for (const team of [1, 2] as const) {
      const members = g.participants
        .filter((p) => p.team === team)
        .sort((a, b) => a.player.name.localeCompare(b.player.name, "ar"));
      if (members.length !== 2) continue;
      const key = members.map((m) => m.player.id).join("|");
      const stat = teams.get(key) ?? {
        key,
        players: members.map((m) => ({
          name: m.player.name,
          imageUrl: m.player.imageUrl,
        })),
        games: 0,
        wins: 0,
        losses: 0,
      };
      stat.games++;
      if (team === g.winner) stat.wins++;
      else stat.losses++;
      teams.set(key, stat);
    }
  }
  const teamsArr = Array.from(teams.values()).sort(
    (a, b) => b.wins - a.wins || b.games - a.games,
  );

  const champion = individualsArr[0];

  // قائمة الأشهر السابقة (آخر ١٢ شهر)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: `${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">الإحصائيات</h1>
          <p className="text-white/60">{games.length} صكة في هذا الشهر</p>
        </div>
        <div>
          <label className="block text-xs mb-1 text-white/60">الشهر</label>
          <div className="flex flex-wrap gap-1">
            {monthOptions.slice(0, 6).map((opt) => (
              <Link
                key={opt.value}
                href={`/stats?month=${opt.value}`}
                className={`text-xs px-3 py-1 rounded-lg ${
                  `${year}-${month + 1}` === opt.value
                    ? "bg-gold text-navy-deep font-bold"
                    : "bg-navy hover:bg-white/10"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {champion && (
        <div className="bg-gradient-to-l from-gold/30 to-gold/10 rounded-2xl p-6 border border-gold/40 flex items-center gap-4">
          <div className="text-5xl">🏆</div>
          <PlayerAvatar
            name={champion.name}
            imageUrl={champion.imageUrl}
            size="xl"
          />
          <div>
            <div className="text-sm text-gold">بطل الشهر</div>
            <div className="text-2xl font-black">{champion.name}</div>
            <div className="text-sm text-white/70">
              {champion.wins} فوز من {champion.games} صكة
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* إنجاز فردي */}
        <section>
          <h2 className="text-xl font-bold mb-3">الإنجاز الفردي</h2>
          {individualsArr.length === 0 ? (
            <Empty />
          ) : (
            <div className="bg-navy rounded-2xl border border-white/10 overflow-x-auto">
              <table className="w-full text-sm min-w-[320px]">
                <thead className="bg-white/5 text-white/60 text-xs">
                  <tr>
                    <th className="p-3 text-right">اللاعب</th>
                    <th className="p-3 text-right">فوز</th>
                    <th className="p-3 text-right">خسارة</th>
                    <th className="p-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {individualsArr.map((s, i) => {
                    const winRate = Math.round((s.wins / s.games) * 100);
                    return (
                      <tr key={s.playerId} className="border-t border-white/5">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`shrink-0 ${
                                i === 0
                                  ? "text-gold font-bold"
                                  : "text-white/40 text-xs"
                              }`}
                            >
                              #{i + 1}
                            </span>
                            <PlayerAvatar
                              name={s.name}
                              imageUrl={s.imageUrl}
                              size="sm"
                            />
                            <span className="truncate">{s.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-green-400 font-bold">{s.wins}</td>
                        <td className="p-3 text-red-400">{s.losses}</td>
                        <td className="p-3 text-white/60">{winRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* إنجاز جماعي */}
        <section>
          <h2 className="text-xl font-bold mb-3">الإنجاز الجماعي</h2>
          {teamsArr.length === 0 ? (
            <Empty />
          ) : (
            <div className="bg-navy rounded-2xl border border-white/10 overflow-x-auto">
              <table className="w-full text-sm min-w-[360px]">
                <thead className="bg-white/5 text-white/60 text-xs">
                  <tr>
                    <th className="p-3 text-right">الفريق</th>
                    <th className="p-3 text-right">فوز</th>
                    <th className="p-3 text-right">خسارة</th>
                    <th className="p-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {teamsArr.map((t, i) => {
                    const winRate = Math.round((t.wins / t.games) * 100);
                    return (
                      <tr key={t.key} className="border-t border-white/5">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`shrink-0 ${
                                i === 0
                                  ? "text-gold font-bold"
                                  : "text-white/40 text-xs"
                              }`}
                            >
                              #{i + 1}
                            </span>
                            <div className="flex -space-x-2 -space-x-reverse shrink-0">
                              {t.players.map((p, idx) => (
                                <PlayerAvatar
                                  key={idx}
                                  name={p.name}
                                  imageUrl={p.imageUrl}
                                  size="sm"
                                  className="ring-2 ring-navy"
                                />
                              ))}
                            </div>
                            <span className="truncate text-xs">
                              {t.players[0]!.name} و {t.players[1]!.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-green-400 font-bold">{t.wins}</td>
                        <td className="p-3 text-red-400">{t.losses}</td>
                        <td className="p-3 text-white/60">{winRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="bg-navy rounded-2xl p-8 text-center text-white/40 border border-white/10">
      لا توجد بيانات لهذا الشهر
    </div>
  );
}
