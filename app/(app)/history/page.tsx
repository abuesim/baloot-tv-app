import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { HistoryList } from "./HistoryList";

type SearchParams = Promise<{ filter?: string }>;

const FILTERS = [
  { key: "today", label: "اليوم" },
  { key: "week", label: "الأسبوع" },
  { key: "month", label: "الشهر" },
  { key: "all", label: "الكل" },
] as const;

function getDateRange(filter: string): { gte?: Date } {
  const now = new Date();
  if (filter === "today") {
    return { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
  }
  if (filter === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return { gte: d };
  }
  if (filter === "month") {
    return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  return {};
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.filter)?.key ?? "week";
  const dateRange = getDateRange(filter);

  const games = await db.game.findMany({
    where: {
      userId: ownerUserId,
      deletedAt: null,
      ...(dateRange.gte ? { startedAt: dateRange } : {}),
    },
    orderBy: { startedAt: "desc" },
    take: filter === "all" ? 200 : undefined,
    include: {
      participants: { include: { player: true } },
      createdBy: { select: { displayName: true } },
    },
  });

  const showActor = user.role === "CONTENT_CREATOR" && !user.parentUserId;

  // البطولات المنتهية ضمن نفس النطاق الزمني
  const teamSel = {
    id: true,
    name: true,
    player1: { select: { name: true, imageUrl: true } },
    player2: { select: { name: true, imageUrl: true } },
  } as const;
  const tournaments = await db.tournament.findMany({
    where: {
      userId: ownerUserId,
      status: "COMPLETED",
      deletedAt: null,
      ...(dateRange.gte ? { createdAt: dateRange } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filter === "all" ? 100 : undefined,
    include: {
      teams: { include: { team: { select: teamSel } } },
      createdBy: { select: { displayName: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">سجل الصكات</h1>
          <p className="text-white/50 text-sm">{games.length} صكة</p>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/history?filter=${f.key}`}
              className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                filter === f.key
                  ? "bg-gold text-navy-deep"
                  : "bg-navy border border-white/10 text-white/70 hover:border-gold/40 hover:text-white"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <HistoryList initialGames={games} canDelete={!user.parentUserId || user.subCanDelete} showActor={showActor} />

      {/* سجل البطولات — البطل (جماعي) ولاعباه (فردي) */}
      {tournaments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            🏆 سجل البطولات
            <span className="text-sm font-normal text-white/40">({tournaments.length})</span>
          </h2>
          {tournaments.map((t) => {
            const champ = t.teams.find((tt) => tt.teamId === t.championTeamId)?.team ?? null;
            const date = new Date(t.createdAt).toLocaleDateString("ar", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            return (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="block bg-gradient-to-l from-gold/15 to-transparent rounded-2xl p-4 border border-gold/25 hover:border-gold/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-3xl">🏆</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{t.name || "بطولة"}</div>
                    <div className="text-xs text-white/50">
                      {t.format === "KNOCKOUT" ? "خروج المغلوب" : "تجميع النقاط"} · {t.teams.length} فريق · {date}
                      {showActor && t.createdBy && (
                        <span className="text-white/40"> · أنشأها: {t.createdBy.displayName}</span>
                      )}
                    </div>
                  </div>

                  {champ ? (
                    <div className="flex items-center gap-2 bg-gold/10 rounded-xl px-3 py-2 border border-gold/20">
                      <span className="text-xs text-gold font-bold">البطل</span>
                      <div className="flex -space-x-2 -space-x-reverse">
                        <PlayerAvatar name={champ.player1.name} imageUrl={champ.player1.imageUrl} size="sm" className="ring-2 ring-navy" />
                        <PlayerAvatar name={champ.player2.name} imageUrl={champ.player2.imageUrl} size="sm" className="ring-2 ring-navy" />
                      </div>
                      <span className="text-sm font-bold">{champ.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-white/40">بدون بطل</span>
                  )}
                </div>

                {/* الإنجاز الفردي — لاعبا الفريق البطل */}
                {champ && (
                  <div className="text-xs text-white/50 mt-2 pr-12">
                    🥇 {champ.player1.name} · {champ.player2.name}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
