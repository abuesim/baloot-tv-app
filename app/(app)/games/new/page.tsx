import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import NewGameForm from "./NewGameForm";

export default async function NewGamePage() {
  const user = await requireUser();
  const players = await db.player.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, imageUrl: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">مباراة جديدة</h1>
        <p className="text-white/60">اختر نوع اللعب وابدأ — اللاعبون اختياريون</p>
      </div>

      <NewGameForm players={players} />
    </div>
  );
}
