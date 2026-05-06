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
  const game = await db.game.findFirst({
    where: { id, userId: me.id },
    include: {
      participants: { include: { player: true } },
      rounds: { orderBy: { number: "desc" } },
    },
  });
  if (!game) notFound();

  const userRow = await db.user.findUnique({
    where: { id: me.id },
    select: { tvCode: true, calculatorStyle: true },
  });

  const allPlayers = await db.player.findMany({
    where: { userId: me.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, imageUrl: true },
  });

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
