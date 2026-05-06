"use client";

import { useState, useTransition } from "react";
import { GAME_MODES, type GameMode } from "@/lib/baloot";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { createGameAction } from "./actions";

type Player = { id: string; name: string; imageUrl: string | null };

export default function NewGameForm({ players }: { players: Player[] }) {
  const [mode, setMode] = useState<GameMode>("NORMAL");
  const [t1p1, setT1p1] = useState("");
  const [t1p2, setT1p2] = useState("");
  const [t2p1, setT2p1] = useState("");
  const [t2p2, setT2p2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = [t1p1, t1p2, t2p1, t2p2].filter(Boolean);
  const byId = new Map(players.map((p) => [p.id, p]));
  const allChosen = selected.length === 4;
  const noneChosen = selected.length === 0;
  const partial = !allChosen && !noneChosen;

  function PlayerPicker({
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
        <label className="block text-sm mb-2 text-white/80">{label}</label>
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
            className="flex-1 bg-transparent py-3 outline-none"
          >
            <option value="" className="bg-navy-light">
              — اختر —
            </option>
            {players.map((p) => (
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (partial) {
      setError(
        "إما اختر الأربعة كاملين أو اتركهم فاضي وأضفهم بعدين من الحاسبة",
      );
      return;
    }
    startTransition(async () => {
      const res = await createGameAction({
        mode,
        team1Player1Id: t1p1 || undefined,
        team1Player2Id: t1p2 || undefined,
        team2Player1Id: t2p1 || undefined,
        team2Player2Id: t2p2 || undefined,
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* اختيار نوع اللعب */}
      <div>
        <label className="block text-sm mb-3 text-white/80">نوع اللعب</label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(GAME_MODES) as GameMode[]).map((m) => {
            const cfg = GAME_MODES[m];
            const active = mode === m;
            return (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={`text-right p-4 rounded-2xl border-2 ${
                  active
                    ? "border-gold bg-gold/10"
                    : "border-white/10 bg-navy hover:border-white/30"
                }`}
              >
                <div className="text-xl font-bold mb-1">{cfg.label}</div>
                <div className="text-xs text-white/60">{cfg.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* اللاعبون - اختياري */}
      {players.length >= 4 ? (
        <>
          <div className="flex items-center gap-2 text-xs text-white/60 -mb-2">
            <span>👥 اللاعبون</span>
            <span className="bg-white/10 px-2 py-0.5 rounded-full">اختياري</span>
            <span className="text-white/40">— تقدر تضيفهم بعدين من الحاسبة</span>
          </div>

          <div className="bg-navy rounded-2xl p-5 border border-white/10">
            <h3 className="text-lg font-bold mb-3 text-gold">لنا (الفريق ١)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PlayerPicker value={t1p1} onChange={setT1p1} label="اللاعب الأول" />
              <PlayerPicker value={t1p2} onChange={setT1p2} label="اللاعب الثاني" />
            </div>
          </div>

          <div className="bg-navy rounded-2xl p-5 border border-white/10">
            <h3 className="text-lg font-bold mb-3">لهم (الفريق ٢)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PlayerPicker value={t2p1} onChange={setT2p1} label="اللاعب الأول" />
              <PlayerPicker value={t2p2} onChange={setT2p2} label="اللاعب الثاني" />
            </div>
          </div>
        </>
      ) : (
        <div className="bg-navy/60 rounded-2xl p-4 border border-white/10 text-sm text-white/70">
          ما عندك ما يكفي من اللاعبين بعد. ابدأ الصكة الآن وأضفهم من الحاسبة لاحقاً.
        </div>
      )}

      {error && (
        <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3">{error}</div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full btn-grad py-4 rounded-xl text-lg shadow-lg shadow-accent/30"
      >
        {isPending
          ? "جاري الإنشاء..."
          : noneChosen
          ? "ابدأ الصكة (بدون لاعبين)"
          : "ابدأ الصكة"}
      </button>
    </form>
  );
}
