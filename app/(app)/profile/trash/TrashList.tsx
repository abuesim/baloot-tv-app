"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreGameAction, restoreTournamentAction } from "./actions";

type DeletedGame = {
  id: string;
  team1: string;
  team2: string;
  score: string;
  deletedAt: string;
};
type DeletedTournament = {
  id: string;
  name: string;
  deletedAt: string;
};

export default function TrashList({
  games,
  tournaments,
}: {
  games: DeletedGame[];
  tournaments: DeletedTournament[];
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function restoreGame(id: string) {
    setError(null);
    setBusy(id);
    start(async () => {
      const res = await restoreGameAction(id);
      setBusy(null);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }
  function restoreTournament(id: string) {
    setError(null);
    setBusy(id);
    start(async () => {
      const res = await restoreTournamentAction(id);
      setBusy(null);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  if (games.length === 0 && tournaments.length === 0) {
    return (
      <div className="bg-navy rounded-2xl p-8 text-center text-white/40 border border-white/10">
        ما في محذوفات — كل شيء سليم 👍
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3">{error}</div>
      )}

      {/* صكات محذوفة */}
      {games.length > 0 && (
        <div>
          <h3 className="font-bold mb-2">🎴 صكات محذوفة ({games.length})</h3>
          <div className="space-y-2">
            {games.map((g) => (
              <div
                key={g.id}
                className="bg-navy rounded-xl border border-white/10 p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {g.team1} <span className="text-gold tabular-nums">{g.score}</span> {g.team2}
                  </div>
                  <div className="text-[11px] text-white/40">حُذفت {g.deletedAt}</div>
                </div>
                <button
                  onClick={() => restoreGame(g.id)}
                  disabled={isPending && busy === g.id}
                  className="text-xs bg-green-500/15 text-green-300 border border-green-500/30 hover:bg-green-500/25 rounded-lg px-3 py-1.5 shrink-0"
                >
                  {isPending && busy === g.id ? "..." : "↩ استرجاع"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* بطولات محذوفة */}
      {tournaments.length > 0 && (
        <div>
          <h3 className="font-bold mb-2">🏆 بطولات محذوفة ({tournaments.length})</h3>
          <div className="space-y-2">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="bg-navy rounded-xl border border-white/10 p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{t.name || "بطولة"}</div>
                  <div className="text-[11px] text-white/40">حُذفت {t.deletedAt}</div>
                </div>
                <button
                  onClick={() => restoreTournament(t.id)}
                  disabled={isPending && busy === t.id}
                  className="text-xs bg-green-500/15 text-green-300 border border-green-500/30 hover:bg-green-500/25 rounded-lg px-3 py-1.5 shrink-0"
                >
                  {isPending && busy === t.id ? "..." : "↩ استرجاع"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
