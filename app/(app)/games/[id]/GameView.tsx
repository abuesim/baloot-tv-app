"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users as UsersIcon, Pencil } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  recordRoundAction,
  deleteRoundAction,
  abandonGameAction,
  setGamePlayersAction,
} from "./actions";

type Player = { id: string; name: string; imageUrl: string | null };
type Participant = { team: number; player: Player };
type Round = { id: string; number: number; team1Score: number; team2Score: number };
type Game = {
  id: string;
  mode: "NORMAL" | "MASHDOOD";
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  team1Score: number;
  team2Score: number;
  targetScore: number;
  winner: number | null;
  startedAt: Date | string;
  endedAt: Date | string | null;
  participants: Participant[];
  rounds: Round[];
};

export default function GameView({
  game: initial,
  tvCode,
  tvUrl,
  allPlayers,
}: {
  game: Game;
  tvCode: string | null;
  tvUrl: string | null;
  allPlayers: Player[];
}) {
  const router = useRouter();
  const [game, setGame] = useState<Game>(initial);
  const [isPending, startTransition] = useTransition();
  const [showPlayersDialog, setShowPlayersDialog] = useState(false);
  const [flash, setFlash] = useState<{ team1: boolean; team2: boolean }>({
    team1: false,
    team2: false,
  });
  const prevRef = useRef({ t1: initial.team1Score, t2: initial.team2Score });

  // مزامنة الحالة + كشف التغيير لتشغيل المؤثرات
  useEffect(() => {
    const dt1 = initial.team1Score - prevRef.current.t1;
    const dt2 = initial.team2Score - prevRef.current.t2;
    if (dt1 > 0 || dt2 > 0) {
      setFlash({ team1: dt1 > 0, team2: dt2 > 0 });
      setTimeout(() => setFlash({ team1: false, team2: false }), 4000);
    }
    prevRef.current = { t1: initial.team1Score, t2: initial.team2Score };
    setGame(initial);
  }, [initial]);

  const team1 = game.participants.filter((p) => p.team === 1).map((p) => p.player);
  const team2 = game.participants.filter((p) => p.team === 2).map((p) => p.player);

  // عدّاد المدة
  const [elapsed, setElapsed] = useState("00:00");
  useEffect(() => {
    function fmt() {
      const start = new Date(game.startedAt).getTime();
      const end = game.endedAt ? new Date(game.endedAt).getTime() : Date.now();
      const s = Math.floor((end - start) / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      setElapsed(`${mm}:${ss}`);
    }
    fmt();
    if (game.status !== "IN_PROGRESS") return;
    const t = setInterval(fmt, 1000);
    return () => clearInterval(t);
  }, [game.startedAt, game.endedAt, game.status]);

  const isOver = game.status !== "IN_PROGRESS";
  const diff = Math.abs(game.team1Score - game.team2Score);
  const lead =
    game.team1Score === game.team2Score
      ? null
      : game.team1Score > game.team2Score
      ? 1
      : 2;

  return (
    <div className="space-y-5">
      {/* رأس */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {game.mode === "MASHDOOD" && (
            <span className="bg-gold/20 text-gold px-3 py-1 rounded-full text-sm font-bold">
              مشدود
            </span>
          )}
          <span className="text-white/60 text-sm">الهدف: {game.targetScore}</span>
          {!isOver && (
            <button
              onClick={() => setShowPlayersDialog(true)}
              className="bg-white/5 border border-white/10 hover:border-white/30 text-xs px-3 py-1 rounded-full inline-flex items-center gap-1.5"
            >
              {game.participants.length === 0 ? (
                <>
                  <UsersIcon size={12} /> اختر اللاعبين
                </>
              ) : (
                <>
                  <Pencil size={12} /> تعديل اللاعبين
                </>
              )}
            </button>
          )}
        </div>

        {tvCode && tvUrl && !isOver && (
          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-navy border border-gold/40 px-4 py-2 rounded-xl text-sm hover:bg-gold/10"
            title="افتح شاشتك — الكود دائم"
          >
            <span className="text-white/60 ml-2">📺 شاشتي:</span>
            <span className="font-bold text-gold tracking-widest">
              {tvCode}
            </span>
            <span className="text-white/40 mr-2">↗</span>
          </a>
        )}
      </div>

      {/* النتيجة الكبيرة - لنا يمين، لهم يسار */}
      <div className="bg-navy rounded-3xl p-6 border border-white/10">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 md:gap-6 items-center">
          {/* لنا (يمين) */}
          <ScoreSide
            label="لنا"
            players={team1}
            score={game.team1Score}
            isWinner={game.winner === 1}
            isLoser={game.winner === 2}
            colorClass="text-gold"
            flashing={flash.team1}
          />

          {/* مربع الفرق */}
          <DiffBox diff={diff} lead={lead} />

          {/* لهم (يسار) */}
          <ScoreSide
            label="لهم"
            players={team2}
            score={game.team2Score}
            isWinner={game.winner === 2}
            isLoser={game.winner === 1}
            colorClass="text-white"
            flashing={flash.team2}
          />
        </div>

        <div className="text-center mt-4 text-white/50 text-sm">⏱ {elapsed}</div>

        {game.winner !== null && (
          <div className="mt-4 text-center bg-gold/20 text-gold rounded-xl py-3 font-bold text-lg">
            🏆 الفوز للفريق {game.winner === 1 ? "لنا" : "لهم"}
          </div>
        )}
        {game.status === "ABANDONED" && (
          <div className="mt-4 text-center bg-white/10 text-white/60 rounded-xl py-3 text-sm">
            ألغيت الصكة
          </div>
        )}
      </div>

      {!isOver && <RoundEntry game={game} onSubmitted={() => router.refresh()} />}

      {/* زر التراجع عن آخر جولة */}
      {game.rounds.length > 0 && game.status === "IN_PROGRESS" && (
        <UndoLastRound
          gameId={game.id}
          lastRound={game.rounds[0]!}
          onDone={() => router.refresh()}
        />
      )}

      {/* جولات */}
      {game.rounds.length > 0 && (
        <div className="bg-navy rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-bold">الجولات ({game.rounds.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60 text-xs">
              <tr>
                <th className="p-3 text-right">#</th>
                <th className="p-3 text-right">لنا</th>
                <th className="p-3 text-right">لهم</th>
                <th className="p-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {game.rounds.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="p-3 text-white/40">{r.number}</td>
                  <td className="p-3 font-bold text-gold">{r.team1Score}</td>
                  <td className="p-3">{r.team2Score}</td>
                  <td className="p-3 text-left">
                    {!isOver && (
                      <button
                        disabled={isPending}
                        onClick={() => {
                          if (confirm(`حذف الجولة ${r.number}؟`)) {
                            startTransition(async () => {
                              await deleteRoundAction(game.id, r.id);
                              router.refresh();
                            });
                          }
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        حذف
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isOver && (
        <button
          disabled={isPending}
          onClick={() => {
            if (confirm("إلغاء الصكة الحالية؟")) {
              startTransition(async () => {
                await abandonGameAction(game.id);
                router.refresh();
              });
            }
          }}
          className="w-full text-sm text-white/40 hover:text-red-400 py-2"
        >
          إلغاء الصكة
        </button>
      )}

      {showPlayersDialog && (
        <PlayersDialog
          gameId={game.id}
          allPlayers={allPlayers}
          currentParticipants={game.participants}
          onClose={() => setShowPlayersDialog(false)}
          onSaved={() => {
            setShowPlayersDialog(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ScoreSide({
  label,
  players,
  score,
  isWinner,
  isLoser,
  colorClass,
  flashing,
}: {
  label: string;
  players: Player[];
  score: number;
  isWinner: boolean;
  isLoser: boolean;
  colorClass: string;
  flashing: boolean;
}) {
  return (
    <div
      className={`text-center rounded-2xl p-3 transition-all ${
        flashing ? "panel-glow" : ""
      } ${isLoser ? "opacity-50" : ""}`}
    >
      <div
        className={`text-xs mb-2 ${
          colorClass === "text-gold" ? "text-gold" : "text-white/40"
        }`}
      >
        {label}
      </div>
      <div className="flex items-center justify-center gap-2 mb-2 min-h-12">
        {players.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1">
            <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="md" />
            <span className="text-[10px] text-white/60 max-w-16 truncate">
              {p.name}
            </span>
          </div>
        ))}
      </div>
      <div
        key={score}
        className={`text-5xl sm:text-7xl md:text-8xl font-black ${
          isWinner ? "text-gold" : colorClass
        } ${flashing ? "score-flash" : ""}`}
      >
        {score}
      </div>
    </div>
  );
}

function DiffBox({ diff, lead }: { diff: number; lead: 1 | 2 | null }) {
  if (diff === 0) {
    return (
      <div className="bg-navy-light rounded-2xl px-3 py-4 text-center border border-white/10 self-center">
        <div className="text-[10px] text-white/40 mb-1">الفرق</div>
        <div className="text-2xl text-white/50">=</div>
      </div>
    );
  }
  return (
    <div className="bg-gradient-to-b from-gold/20 to-gold/5 rounded-2xl px-3 py-4 text-center border border-gold/30 self-center shadow-lg shadow-gold/10">
      <div className="text-[10px] text-white/40 mb-1">الفرق</div>
      <div className="text-2xl md:text-4xl font-black text-gold">{diff}</div>
      <div className="text-[10px] text-white/60 mt-1">
        {lead === 1 ? "← لنا" : "لهم →"}
      </div>
    </div>
  );
}

function RoundEntry({
  game,
  onSubmitted,
}: {
  game: Game;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [t1, setT1] = useState("");
  const [t2, setT2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sum = (Number(t1) || 0) + (Number(t2) || 0);
  const sumHint = useMemo(() => {
    if (!t1 && !t2) return null;
    if (sum === 162) return "✓ المجموع ١٦٢";
    if (sum === 0) return null;
    return `المجموع: ${sum}`;
  }, [sum, t1, t2]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const team1 = Number(t1);
    const team2 = Number(t2);
    if (Number.isNaN(team1) || Number.isNaN(team2)) {
      setError("أدخل أرقاماً صالحة");
      return;
    }
    startTransition(async () => {
      const res = await recordRoundAction(game.id, team1, team2);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setT1("");
      setT2("");
      setOpen(false);
      onSubmitted();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full btn-grad py-4 rounded-2xl text-lg shadow-lg shadow-accent/30"
      >
        + سجّل جولة
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-navy rounded-2xl p-5 border border-white/10 space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* لنا (يمين في RTL) */}
        <div>
          <label className="block text-sm mb-2 text-gold text-center">لنا</label>
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            value={t1}
            onChange={(e) => setT1(e.target.value)}
            dir="ltr"
            className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-4 text-3xl text-center font-bold text-gold"
            placeholder="0"
          />
        </div>
        {/* لهم (يسار) */}
        <div>
          <label className="block text-sm mb-2 text-white/80 text-center">لهم</label>
          <input
            type="number"
            inputMode="numeric"
            value={t2}
            onChange={(e) => setT2(e.target.value)}
            dir="ltr"
            className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-4 text-3xl text-center font-bold"
            placeholder="0"
          />
        </div>
      </div>

      {sumHint && (
        <div
          className={`text-center text-sm ${
            sum === 162 ? "text-green-400" : "text-white/60"
          }`}
        >
          {sumHint}
        </div>
      )}

      {error && (
        <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="bg-white/10 hover:bg-white/20 py-3 rounded-xl"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="btn-grad py-3 rounded-xl"
        >
          {isPending ? "..." : "سجّل"}
        </button>
      </div>
    </form>
  );
}

function UndoLastRound({
  gameId,
  lastRound,
  onDone,
}: {
  gameId: string;
  lastRound: Round;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function undo() {
    if (
      !confirm(
        `تراجع عن الجولة ${lastRound.number} (لنا ${lastRound.team1Score} / لهم ${lastRound.team2Score})؟`,
      )
    )
      return;
    startTransition(async () => {
      await deleteRoundAction(gameId, lastRound.id);
      onDone();
    });
  }

  return (
    <button
      onClick={undo}
      disabled={isPending}
      className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 disabled:opacity-50 py-3 rounded-2xl text-sm"
    >
      <span className="text-base">↺</span>
      <span>
        تراجع عن آخر جولة
        <span className="text-white/50 mr-2">
          (#{lastRound.number} — لنا{" "}
          <span className="text-gold font-bold">{lastRound.team1Score}</span> / لهم{" "}
          <span className="font-bold">{lastRound.team2Score}</span>)
        </span>
      </span>
    </button>
  );
}

function PlayersDialog({
  gameId,
  allPlayers,
  currentParticipants,
  onClose,
  onSaved,
}: {
  gameId: string;
  allPlayers: Player[];
  currentParticipants: Participant[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const cur = useMemo(() => {
    const t1 = currentParticipants.filter((p) => p.team === 1);
    const t2 = currentParticipants.filter((p) => p.team === 2);
    return {
      t1p1: t1[0]?.player.id ?? "",
      t1p2: t1[1]?.player.id ?? "",
      t2p1: t2[0]?.player.id ?? "",
      t2p2: t2[1]?.player.id ?? "",
    };
  }, [currentParticipants]);

  const [t1p1, setT1p1] = useState(cur.t1p1);
  const [t1p2, setT1p2] = useState(cur.t1p2);
  const [t2p1, setT2p1] = useState(cur.t2p1);
  const [t2p2, setT2p2] = useState(cur.t2p2);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = [t1p1, t1p2, t2p1, t2p2].filter(Boolean);
  const byId = new Map(allPlayers.map((p) => [p.id, p]));

  function PlayerSelect({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (v: string) => void;
    label: string;
  }) {
    const current = value ? byId.get(value) : null;
    return (
      <div>
        <label className="block text-xs mb-1 text-white/70">{label}</label>
        <div className="bg-navy-light border border-white/10 rounded-xl flex items-center gap-2 px-2">
          {current ? (
            <PlayerAvatar
              name={current.name}
              imageUrl={current.imageUrl}
              size="sm"
            />
          ) : (
            <div className="w-8 h-8" />
          )}
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-transparent py-2.5 outline-none text-sm"
          >
            <option value="" className="bg-navy-light">
              — اختر —
            </option>
            {allPlayers.map((p) => (
              <option
                key={p.id}
                value={p.id}
                disabled={selected.includes(p.id) && p.id !== value}
                className="bg-navy-light"
              >
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  function save() {
    setError(null);
    if (!t1p1 || !t1p2 || !t2p1 || !t2p2) {
      setError("اختر كل اللاعبين الأربعة");
      return;
    }
    if (new Set([t1p1, t1p2, t2p1, t2p2]).size !== 4) {
      setError("كل لاعب لازم يكون مختلف");
      return;
    }
    startTransition(async () => {
      const res = await setGamePlayersAction(gameId, {
        team1Player1Id: t1p1,
        team1Player2Id: t1p2,
        team2Player1Id: t2p1,
        team2Player2Id: t2p2,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-navy rounded-3xl border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">اختيار اللاعبين</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <div className="px-5 space-y-4">
          {allPlayers.length < 4 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs rounded-xl p-3">
              تحتاج ٤ لاعبين على الأقل في قائمتك. أضف لاعبين من{" "}
              <a href="/players" className="underline font-bold">
                صفحة اللاعبين
              </a>
              .
            </div>
          )}

          <div className="bg-navy-light rounded-2xl p-4 border border-white/5">
            <h4 className="text-sm font-bold text-gold mb-3">لنا</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PlayerSelect value={t1p1} onChange={setT1p1} label="اللاعب الأول" />
              <PlayerSelect value={t1p2} onChange={setT1p2} label="اللاعب الثاني" />
            </div>
          </div>

          <div className="bg-navy-light rounded-2xl p-4 border border-white/5">
            <h4 className="text-sm font-bold mb-3">لهم</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PlayerSelect value={t2p1} onChange={setT2p1} label="اللاعب الأول" />
              <PlayerSelect value={t2p2} onChange={setT2p2} label="اللاعب الثاني" />
            </div>
          </div>

          {error && (
            <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 py-3 rounded-xl"
          >
            إلغاء
          </button>
          <button
            onClick={save}
            disabled={isPending || allPlayers.length < 4}
            className="btn-grad py-3 rounded-xl"
          >
            {isPending ? "..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
