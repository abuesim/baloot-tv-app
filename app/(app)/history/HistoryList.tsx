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
};

function teamPlayers(game: Game, team: 1 | 2) {
  return game.participants.filter((p) => p.team === team).map((p) => p.player);
}

// تنسيق التاريخ باللغة العربية
function formatGroupLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);

  if (diff === 0) return "اليوم";
  if (diff === 1) return "أمس";
  if (diff < 7) return `منذ ${diff} أيام`;
  return d.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// تجميع الصكات حسب اليوم
function groupByDay(games: Game[]): { label: string; games: Game[] }[] {
  const map = new Map<string, Game[]>();
  for (const g of games) {
    const d = new Date(g.startedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }
  return Array.from(map.entries()).map(([, gs]) => ({
    label: formatGroupLabel(new Date(gs[0]!.startedAt)),
    games: gs,
  }));
}

function statusBadge(game: Game) {
  if (game.status === "IN_PROGRESS")
    return <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">جارية</span>;
  if (game.status === "ABANDONED")
    return <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">ملغاة</span>;
  if (game.winner === 1)
    return <span className="bg-gold/20 text-gold px-2 py-0.5 rounded text-xs">فزنا</span>;
  if (game.winner === 2)
    return <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded text-xs">خسرنا</span>;
  return null;
}

function GameRow({ game, onDeleted }: { game: Game; onDeleted: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteGameAction(game.id);
      if (res.ok) onDeleted(game.id);
    });
  }

  return (
    <div className="relative bg-navy rounded-xl border border-white/10 hover:border-gold/30 transition-colors">
      <Link href={`/games/${game.id}`} className="block p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {/* الفريقين */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-gold font-bold shrink-0">لنا</span>
              <div className="flex -space-x-1.5 -space-x-reverse">
                {teamPlayers(game, 1).map((p) => (
                  <PlayerAvatar key={p.id} name={p.name} imageUrl={p.imageUrl} size="sm" className="ring-2 ring-navy" />
                ))}
              </div>
              <span className="text-white/25 text-xs">vs</span>
              <div className="flex -space-x-1.5 -space-x-reverse">
                {teamPlayers(game, 2).map((p) => (
                  <PlayerAvatar key={p.id} name={p.name} imageUrl={p.imageUrl} size="sm" className="ring-2 ring-navy" />
                ))}
              </div>
              <span className="text-xs text-white/50 font-bold shrink-0">لهم</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/40">
                {new Date(game.startedAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {game.mode === "MASHDOOD" && (
                <span className="bg-gold/20 text-gold px-2 py-0.5 rounded text-xs">مشدود</span>
              )}
              {statusBadge(game)}
            </div>
          </div>

          {/* النتيجة */}
          <div className="text-xl sm:text-2xl font-bold flex items-center gap-2 shrink-0 ml-6">
            <span className={game.winner === 1 ? "text-gold" : "text-gold/70"}>{game.team1Score}</span>
            <span className="text-white/25 text-sm">-</span>
            <span className={game.winner === 2 ? "text-gold" : "text-white/80"}>{game.team2Score}</span>
          </div>
        </div>
      </Link>

      {/* زر الحذف */}
      {!confirming ? (
        <button
          onClick={(e) => { e.preventDefault(); setConfirming(true); }}
          className="absolute top-2.5 left-2.5 text-white/15 hover:text-red-400 transition-colors p-1 rounded"
          title="حذف"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      ) : (
        <div className="absolute inset-0 bg-navy/95 rounded-xl flex items-center justify-center gap-3 z-10">
          <span className="text-sm text-white/80">تحذف الصكة؟</span>
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
            className="bg-white/10 hover:bg-white/20 text-sm px-3 py-1.5 rounded-lg"
          >
            إلغاء
          </button>
        </div>
      )}
    </div>
  );
}

export function HistoryList({ initialGames }: { initialGames: Game[] }) {
  const [games, setGames] = useState(initialGames);
  const router = useRouter();

  function handleDeleted(id: string) {
    setGames((prev) => prev.filter((g) => g.id !== id));
    router.refresh();
  }

  if (games.length === 0) {
    return (
      <div className="bg-navy rounded-2xl p-16 text-center text-white/40 border border-white/10">
        <div className="text-4xl mb-3">🎴</div>
        لا توجد صكات في هذه الفترة
      </div>
    );
  }

  const groups = groupByDay(games);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          {/* عنوان اليوم */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-bold text-white/70">{group.label}</span>
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">{group.games.length} صكة</span>
          </div>
          <div className="space-y-2">
            {group.games.map((g) => (
              <GameRow key={g.id} game={g} onDeleted={handleDeleted} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
