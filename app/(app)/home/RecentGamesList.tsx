"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { deleteGameAction } from "@/app/(app)/games/[id]/actions";

type Player = { id: string; name: string; imageUrl: string | null };
type Participant = { team: number; player: Player };
type Game = {
  id: string;
  team1Score: number;
  team2Score: number;
  winner: number | null;
  status: string;
  mode: string;
  startedAt: Date;
  participants: Participant[];
  createdBy?: { displayName: string } | null;
};

function teamPlayers(game: Game, team: 1 | 2) {
  return game.participants.filter((p) => p.team === team).map((p) => p.player);
}

function GameRow({ game, canDelete, showActor, onDeleted }: { game: Game; canDelete: boolean; showActor: boolean; onDeleted: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteGameAction(game.id);
      if (res.ok) {
        onDeleted(game.id);
      }
    });
  }

  return (
    <div className="relative bg-navy rounded-2xl border border-white/10 hover:border-gold/40 transition-colors">
      <Link href={`/games/${game.id}`} className="block p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-gold font-bold shrink-0">لنا</span>
              <div className="flex -space-x-2 -space-x-reverse">
                {teamPlayers(game, 1).map((p) => (
                  <PlayerAvatar
                    key={p.id}
                    name={p.name}
                    imageUrl={p.imageUrl}
                    size="sm"
                    className="ring-2 ring-navy"
                  />
                ))}
              </div>
              <span className="mx-1 text-white/30">vs</span>
              <div className="flex -space-x-2 -space-x-reverse">
                {teamPlayers(game, 2).map((p) => (
                  <PlayerAvatar
                    key={p.id}
                    name={p.name}
                    imageUrl={p.imageUrl}
                    size="sm"
                    className="ring-2 ring-navy"
                  />
                ))}
              </div>
              <span className="text-xs text-white/60 font-bold shrink-0">لهم</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/50">
              <span>{new Date(game.startedAt).toLocaleString("ar-SA")}</span>
              {game.mode === "MASHDOOD" && (
                <span className="bg-gold/20 text-gold px-2 py-0.5 rounded">مشدود</span>
              )}
              {game.status === "IN_PROGRESS" && (
                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded">جارية</span>
              )}
              {game.status === "ABANDONED" && (
                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded">ملغاة</span>
              )}
              {showActor && game.createdBy && (
                <span className="bg-white/5 text-white/50 px-2 py-0.5 rounded">
                  أنشأها: {game.createdBy.displayName}
                </span>
              )}
            </div>
          </div>
          <div className="text-2xl font-bold flex items-center gap-3 shrink-0">
            <span className={game.winner === 1 ? "text-gold" : "text-gold/80"}>
              {game.team1Score}
            </span>
            <span className="text-white/30">-</span>
            <span className={game.winner === 2 ? "text-gold" : "text-white"}>
              {game.team2Score}
            </span>
          </div>
        </div>
      </Link>

      {/* Delete button — مخفي للمستخدم الفرعي */}
      {canDelete && !confirming ? (
        <button
          onClick={(e) => { e.preventDefault(); setConfirming(true); }}
          className="absolute top-3 left-3 text-white/20 hover:text-red-400 transition-colors p-1 rounded"
          title="حذف الصكة"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      ) : canDelete && confirming ? (
        <div className="absolute inset-0 bg-navy/95 rounded-2xl flex items-center justify-center gap-3 z-10">
          <span className="text-sm text-white/80">حذف الصكة؟</span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg disabled:opacity-50"
          >
            {isPending ? "..." : "حذف"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="bg-white/10 hover:bg-white/20 text-sm px-4 py-1.5 rounded-lg disabled:opacity-50"
          >
            إلغاء
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function RecentGamesList({
  initialGames,
  canDelete = true,
  showActor = false,
}: {
  initialGames: Game[];
  canDelete?: boolean;
  showActor?: boolean;
}) {
  const [games, setGames] = useState(initialGames);
  const router = useRouter();

  function handleDeleted(id: string) {
    setGames((prev) => prev.filter((g) => g.id !== id));
    router.refresh();
  }

  if (games.length === 0) {
    return (
      <div className="bg-navy rounded-2xl p-12 text-center text-white/40 border border-white/10">
        لا توجد صكات بعد
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((g) => (
        <GameRow key={g.id} game={g} canDelete={canDelete} showActor={showActor} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}
