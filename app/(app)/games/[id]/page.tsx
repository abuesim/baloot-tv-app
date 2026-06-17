import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import GameView from "./GameView";
import AdvancedGameView from "./AdvancedGameView";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireUser();
  const ownerUserId = me.parentUserId ?? me.id;
  const game = await db.game.findFirst({
    where: { id, userId: ownerUserId },
    include: {
      participants: { include: { player: true } },
      rounds: { orderBy: { number: "desc" } },
    },
  });
  if (!game) notFound();

  // إعدادات الحاسبة تُقرأ من الحساب الأصل دائماً (صانع المحتوى)
  const userRow = await db.user.findUnique({
    where: { id: ownerUserId },
    select: { tvCode: true, calculatorStyle: true },
  });

  const allPlayers = await db.player.findMany({
    where: { userId: ownerUserId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, imageUrl: true },
  });

  // إعلانات الشريط السفلي (عامة + الخاصة بصانع المحتوى)
  const banners = await db.adBanner.findMany({
    where: { active: true, OR: [{ userId: null }, { userId: ownerUserId }] },
    orderBy: { order: "asc" },
    select: { id: true, text: true },
  });
  const bannerTexts = banners.map((b) => b.text).filter((t): t is string => !!t);

  let tvUrl: string | null = null;
  if (userRow?.tvCode) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    tvUrl = `${proto}://${host}/tv/${userRow.tvCode}`;
  }

  if (userRow?.calculatorStyle === "ADVANCED") {
    return (
      <AdvancedGameView
        game={game}
        tvCode={userRow?.tvCode ?? null}
        tvUrl={tvUrl}
        allPlayers={allPlayers}
        bannerTexts={bannerTexts}
      />
    );
  }

  return (
    <GameView
      game={game}
      tvCode={userRow?.tvCode ?? null}
      tvUrl={tvUrl}
      allPlayers={allPlayers}
    />
  );
}
