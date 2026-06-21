import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import NewGameForm from "./NewGameForm";

export default async function NewGamePage() {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const players = await db.player.findMany({
    where: { userId: ownerUserId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, imageUrl: true },
  });

  // ─── آخر صكة فائزة — لاقتراح "آخر فائزين" ───
  const lastGame = await db.game.findFirst({
    where: { userId: ownerUserId, status: "COMPLETED", winner: { not: null }, deletedAt: null },
    orderBy: { startedAt: "desc" },
    include: { participants: true },
  });

  let lastWinners: string[] = [];
  let lastLosers: string[] = [];
  if (lastGame?.winner) {
    lastWinners = lastGame.participants
      .filter((p) => p.team === lastGame.winner)
      .map((p) => p.playerId);
    lastLosers = lastGame.participants
      .filter((p) => p.team !== lastGame.winner)
      .map((p) => p.playerId);
  }

  // ─── شراكات آخر ٢٤ ساعة — لاقتراح الزميل ───
  const since = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  const recentGames = await db.game.findMany({
    where: { userId: ownerUserId, startedAt: { gte: since }, deletedAt: null },
    include: { participants: true },
  });

  // عدّ المرات التي لعب فيها كل زوج معاً
  const pairCount = new Map<string, number>();
  for (const g of recentGames) {
    for (const team of [1, 2] as const) {
      const members = g.participants
        .filter((p) => p.team === team)
        .map((p) => p.playerId);
      if (members.length === 2) {
        const key = [...members].sort().join("|");
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }

  // لكل لاعب: قائمة زملائه مرتبة حسب عدد المرات (الأكثر أولاً)
  const partnersMap: Record<string, { id: string; count: number }[]> = {};
  for (const [key, count] of pairCount) {
    const [a, b] = key.split("|");
    (partnersMap[a] ??= []).push({ id: b, count });
    (partnersMap[b] ??= []).push({ id: a, count });
  }
  const partners: Record<string, string[]> = {};
  for (const k in partnersMap) {
    partners[k] = partnersMap[k]
      .sort((x, y) => y.count - x.count)
      .map((p) => p.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">صكة جديدة</h1>
        <p className="text-white/60">اختر نوع اللعب وابدأ — اللاعبون اختياريون</p>
      </div>

      <NewGameForm
        players={players}
        lastWinners={lastWinners}
        lastLosers={lastLosers}
        partners={partners}
      />
    </div>
  );
}
