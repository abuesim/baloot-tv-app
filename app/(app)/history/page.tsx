import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
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
      ...(dateRange.gte ? { startedAt: dateRange } : {}),
    },
    orderBy: { startedAt: "desc" },
    take: filter === "all" ? 200 : undefined,
    include: {
      participants: { include: { player: true } },
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

      <HistoryList initialGames={games} />
    </div>
  );
}
