import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import DagAlwalad from "./DagAlwalad";

export default async function DrawPage() {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const players = await db.player.findMany({
    where: { userId: ownerUserId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, imageUrl: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">🎲 دق الولد</h1>
        <p className="text-white/60">
          قرعة سريعة للعب الودي — اختر اللاعبين ودق الولد ليكوّن الفرق ويرتّب المباريات
        </p>
      </div>

      <DagAlwalad players={players} />
    </div>
  );
}
