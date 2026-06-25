import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type SearchParams = Promise<{ period?: string }>;

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

/** حوّل قيمة الـ period إلى نطاق تاريخ ووصف */
function resolvePeriod(period: string | undefined, now: Date) {
  if (period === "24h") {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { start, end: now, label: "آخر ٢٤ ساعة", championLabel: "بطل اليوم" };
  }
  if (period === "72h") {
    const start = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    return { start, end: now, label: "آخر ٧٢ ساعة", championLabel: "بطل آخر ٣ أيام" };
  }
  if (period === "7d") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start, end: now, label: "آخر أسبوع", championLabel: "بطل الأسبوع" };
  }

  // شهر محدد أو الشهر الحالي افتراضياً
  const [yStr, mStr] = (period ?? "").split("-");
  const year  = Number(yStr)  || now.getFullYear();
  const month = (Number(mStr) || now.getMonth() + 1) - 1;
  const start = new Date(year, month, 1);
  const end   = new Date(year, month + 1, 1);
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();
  const label = `${MONTHS_AR[month]} ${year}`;
  return {
    start,
    end,
    label,
    championLabel: isCurrentMonth ? "بطل الشهر" : `بطل ${label}`,
    monthKey: `${year}-${month + 1}`,
  };
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const sp   = await searchParams;
  const now  = new Date();

  const { start, end, label, championLabel, monthKey } = resolvePeriod(
    sp.period,
    now,
  );
  const activePeriod = sp.period ?? `${now.getFullYear()}-${now.getMonth() + 1}`;

  const games = await db.game.findMany({
    where: {
      userId: ownerUserId,
      status: "COMPLETED",
      deletedAt: null,
      startedAt: { gte: start, lt: end },
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
    lastWinAt: Date | null; // وقت آخر فوز — للفصل عند التعادل التام
  };
  const individuals = new Map<string, Indi>();

  for (const g of games) {
    if (g.winner === null) continue;
    const gameTime = g.endedAt ?? g.startedAt; // وقت انتهاء الصكة
    for (const p of g.participants) {
      const stat = individuals.get(p.player.id) ?? {
        playerId: p.player.id,
        name: p.player.name,
        imageUrl: p.player.imageUrl,
        games: 0,
        wins: 0,
        losses: 0,
        lastWinAt: null,
      };
      stat.games++;
      if (p.team === g.winner) {
        stat.wins++;
        if (!stat.lastWinAt || gameTime > stat.lastWinAt) {
          stat.lastWinAt = gameTime;
        }
      } else {
        stat.losses++;
      }
      individuals.set(p.player.id, stat);
    }
  }

  // معيار التأهيل الديناميكي: لازم اللاعب/الفريق لعب ١٠٪ من إجمالي صكات الفترة
  // (تقريب لأعلى، بحد أدنى صكة واحدة). يتكيّف مع حجم الفترة بدل رقم ثابت.
  const decidedGames = games.filter((g) => g.winner !== null).length;
  const QUALIFY_MIN = Math.max(1, Math.ceil(decidedGames * 0.1));
  const individualsArr = Array.from(individuals.values()).sort((a, b) => {
    // ١. المؤهلون (١٠٪ من الصكات فأكثر) قبل غير المؤهلين
    const qA = a.games >= QUALIFY_MIN ? 1 : 0;
    const qB = b.games >= QUALIFY_MIN ? 1 : 0;
    if (qA !== qB) return qB - qA;
    // ٢. الأكثر فوزاً
    if (b.wins !== a.wins) return b.wins - a.wins;
    // ٣. عند التعادل: الأقل خسارة
    if (a.losses !== b.losses) return a.losses - b.losses;
    // ٤. عند التعادل: آخر من فاز (الأحدث في المقدمة)
    const tA = a.lastWinAt?.getTime() ?? 0;
    const tB = b.lastWinAt?.getTime() ?? 0;
    return tB - tA;
  });

  // إحصائيات جماعية (أزواج)
  type Team = {
    key: string;
    players: { name: string; imageUrl: string | null }[];
    games: number;
    wins: number;
    losses: number;
    lastWinAt: Date | null; // وقت آخر فوز — للفصل عند التساوي
  };
  const teams = new Map<string, Team>();
  for (const g of games) {
    if (g.winner === null) continue;
    const gameTime = g.endedAt ?? g.startedAt; // وقت انتهاء الصكة
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
        lastWinAt: null,
      };
      stat.games++;
      if (team === g.winner) {
        stat.wins++;
        // نحتفظ بتاريخ أحدث فوز
        if (!stat.lastWinAt || gameTime > stat.lastWinAt) {
          stat.lastWinAt = gameTime;
        }
      } else {
        stat.losses++;
      }
      teams.set(key, stat);
    }
  }
  const teamsArr = Array.from(teams.values()).sort((a, b) => {
    // ١. المؤهلون (١٠٪ من الصكات فأكثر) قبل غير المؤهلين
    const qA = a.games >= QUALIFY_MIN ? 1 : 0;
    const qB = b.games >= QUALIFY_MIN ? 1 : 0;
    if (qA !== qB) return qB - qA;
    // ٢. الأكثر فوزاً
    if (b.wins !== a.wins) return b.wins - a.wins;
    // ٣. عند التعادل: الأقل خسارة
    if (a.losses !== b.losses) return a.losses - b.losses;
    // ٤. عند التعادل: آخر من حقق فوزاً (الأحدث في المقدمة)
    const tA = a.lastWinAt?.getTime() ?? 0;
    const tB = b.lastWinAt?.getTime() ?? 0;
    return tB - tA;
  });

  // البطل = أعلى لاعب مؤهّل (١٠٪ من الصكات فأكثر)؛ وإلا لا يُعرض
  const champion =
    individualsArr[0] && individualsArr[0].games >= QUALIFY_MIN
      ? individualsArr[0]
      : null;
  // لاعبون آخرون متعادلون تماماً مع البطل (نفس الفوز ونفس الخسارة)
  const championTies = champion
    ? individualsArr.filter(
        (s) =>
          s.playerId !== champion.playerId &&
          s.games >= QUALIFY_MIN &&
          s.wins === champion.wins &&
          s.losses === champion.losses,
      )
    : [];
  // أفضل فريق = أعلى فريق مؤهّل (١٠٪ من الصكات فأكثر)؛ وإلا لا يُعرض
  const bestTeam =
    teamsArr[0] && teamsArr[0].games >= QUALIFY_MIN ? teamsArr[0] : null;
  // فرق أخرى متعادلة تماماً مع أفضل فريق (نفس الفوز ونفس الخسارة)
  const bestTeamTies = bestTeam
    ? teamsArr.filter(
        (t) =>
          t.key !== bestTeam.key &&
          t.games >= QUALIFY_MIN &&
          t.wins === bestTeam.wins &&
          t.losses === bestTeam.losses,
      )
    : [];

  // قائمة الأشهر السابقة (آخر ١٢ شهر)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: `${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`,
    });
  }

  // فلاتر الفترات القصيرة
  const quickFilters = [
    { value: "24h", label: "٢٤ ساعة" },
    { value: "72h", label: "٧٢ ساعة" },
    { value: "7d",  label: "أسبوع"   },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">الإحصائيات</h1>
          <p className="text-white/60">{games.length} صكة · {label}</p>
        </div>

        {/* ── الفلاتر ── */}
        <div className="flex flex-col gap-2">
          {/* فترات قصيرة */}
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] text-white/40 self-center ml-1">آخر</span>
            {quickFilters.map((f) => (
              <Link
                key={f.value}
                href={`/stats?period=${f.value}`}
                className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                  activePeriod === f.value
                    ? "bg-gold text-navy-deep font-bold"
                    : "bg-navy hover:bg-white/10"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          {/* أشهر */}
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] text-white/40 self-center ml-1">شهر</span>
            {monthOptions.slice(0, 6).map((opt) => (
              <Link
                key={opt.value}
                href={`/stats?period=${opt.value}`}
                className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                  (monthKey ?? activePeriod) === opt.value
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
            <div className="text-sm text-gold">أفضل لاعب · {championLabel}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-black">{champion.name}</span>
              {championTies.length > 0 && (
                <span
                  className="text-[11px] font-bold text-gold bg-gold/15 border border-gold/40 rounded-full px-2 py-0.5"
                  title={`تعادل مع: ${championTies.map((t) => t.name).join("، ")} — حُسم بآخر من فاز`}
                >
                  🤝 تعادل مع {championTies.map((t) => t.name).join("، ")}
                </span>
              )}
            </div>
            <div className="text-sm text-white/70">
              {champion.wins} فوز من {champion.games} صكة
            </div>
          </div>
        </div>
      )}

      {bestTeam && (
        <div className="bg-gradient-to-l from-accent/25 to-accent/5 rounded-2xl p-6 border border-accent/40 flex items-center gap-4">
          <div className="text-5xl">🤝</div>
          <div className="flex -space-x-4 -space-x-reverse shrink-0">
            {bestTeam.players.map((p, i) => (
              <PlayerAvatar
                key={i}
                name={p.name}
                imageUrl={p.imageUrl}
                size="lg"
                className="ring-2 ring-navy"
              />
            ))}
          </div>
          <div>
            <div className="text-sm text-accent">أفضل فريق</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-black">
                {bestTeam.players[0]!.name} و {bestTeam.players[1]!.name}
              </span>
              {bestTeamTies.length > 0 && (
                <span
                  className="text-[11px] font-bold text-accent bg-accent/15 border border-accent/40 rounded-full px-2 py-0.5"
                  title={`تعادل مع: ${bestTeamTies
                    .map((t) => `${t.players[0]!.name} و ${t.players[1]!.name}`)
                    .join("، ")} — حُسم بآخر من فاز`}
                >
                  🤝 تعادل مع{" "}
                  {bestTeamTies
                    .map((t) => `${t.players[0]!.name} و ${t.players[1]!.name}`)
                    .join("، ")}
                </span>
              )}
            </div>
            <div className="text-sm text-white/70">
              {bestTeam.wins} فوز من {bestTeam.games} صكة
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
      لا توجد بيانات لهذه الفترة
    </div>
  );
}
