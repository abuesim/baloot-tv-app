"use client";

import { useState, useTransition } from "react";
import { GAME_MODES, type GameMode } from "@/lib/baloot";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { createGameAction } from "./actions";

type Player = { id: string; name: string; imageUrl: string | null };

// ألوان الفريقين (متطابقة مع شاشة البث)
const T1 = "#ff7c2a"; // لنا — برتقالي
const T2 = "#38bdf8"; // لهم — أزرق

export default function NewGameForm({
  players,
  lastWinners = [],
  lastLosers = [],
  partners = {},
}: {
  players: Player[];
  lastWinners?: string[];
  lastLosers?: string[];
  partners?: Record<string, string[]>;
}) {
  const [mode, setMode] = useState<GameMode>("NORMAL");
  const [activeTeam, setActiveTeam] = useState<1 | 2>(1);
  const [team1, setTeam1] = useState<string[]>([]);
  const [team2, setTeam2] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const byId = new Map(players.map((p) => [p.id, p]));
  const selected = [...team1, ...team2];
  const allChosen = selected.length === 4;
  const noneChosen = selected.length === 0;

  // أي فريق ينتمي له اللاعب
  function teamOf(id: string): 1 | 2 | null {
    if (team1.includes(id)) return 1;
    if (team2.includes(id)) return 2;
    return null;
  }

  // اقتراح الزميل: إذا الفريق النشط فيه لاعب واحد، اقترح زميله المعتاد (٢٤ساعة)
  function suggestedPartner(): string | null {
    const team = activeTeam === 1 ? team1 : team2;
    if (team.length !== 1) return null;
    const list = partners[team[0]] ?? [];
    // أول زميل غير مُختار أصلاً
    return list.find((pid) => !selected.includes(pid)) ?? null;
  }
  const suggestId = suggestedPartner();

  // الضغط على لاعب
  function tapPlayer(id: string) {
    setError(null);
    const t = teamOf(id);
    if (t === 1) {
      setTeam1((s) => s.filter((x) => x !== id));
      return;
    }
    if (t === 2) {
      setTeam2((s) => s.filter((x) => x !== id));
      return;
    }
    // غير مُختار → أضفه للفريق النشط إذا فيه مكان
    if (activeTeam === 1) {
      if (team1.length >= 2) {
        setError("فريق «لنا» مكتمل — أزل لاعباً أو اختر فريق «لهم»");
        return;
      }
      const next = [...team1, id];
      setTeam1(next);
      if (next.length === 2 && team2.length < 2) setActiveTeam(2); // تقدّم تلقائي
    } else {
      if (team2.length >= 2) {
        setError("فريق «لهم» مكتمل — أزل لاعباً أو اختر فريق «لنا»");
        return;
      }
      const next = [...team2, id];
      setTeam2(next);
      if (next.length === 2 && team1.length < 2) setActiveTeam(1);
    }
  }

  // أزرار التعبئة السريعة
  function fillLastWinners() {
    setError(null);
    const w = lastWinners.filter((id) => byId.has(id)).slice(0, 2);
    setTeam1(w);
    setActiveTeam(w.length === 2 ? 2 : 1);
  }
  function fillLastGame() {
    setError(null);
    setTeam1(lastWinners.filter((id) => byId.has(id)).slice(0, 2));
    setTeam2(lastLosers.filter((id) => byId.has(id)).slice(0, 2));
    setActiveTeam(2);
  }
  function clearAll() {
    setError(null);
    setTeam1([]);
    setTeam2([]);
    setActiveTeam(1);
  }
  function shuffle() {
    setError(null);
    const pool = [...players].sort(() => Math.random() - 0.5).slice(0, 4);
    setTeam1(pool.slice(0, 2).map((p) => p.id));
    setTeam2(pool.slice(2, 4).map((p) => p.id));
    setActiveTeam(1);
  }

  const hasLastWinners = lastWinners.length === 2 && lastWinners.every((id) => byId.has(id));
  const hasLastGame = hasLastWinners && lastLosers.length === 2 && lastLosers.every((id) => byId.has(id));

  // الشبكة: المقترح أولاً ثم البقية، مع فلتر البحث
  const filtered = players
    .filter((p) => (query.trim() ? p.name.toLowerCase().includes(query.toLowerCase()) : true))
    .sort((a, b) => {
      if (a.id === suggestId) return -1;
      if (b.id === suggestId) return 1;
      return 0;
    });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!noneChosen && !allChosen) {
      setError("إما اختر الأربعة كاملين أو اتركهم فاضي وأضفهم بعدين من الحاسبة");
      return;
    }
    startTransition(async () => {
      const res = await createGameAction({
        mode,
        team1Player1Id: team1[0] || undefined,
        team1Player2Id: team1[1] || undefined,
        team2Player1Id: team2[0] || undefined,
        team2Player2Id: team2[1] || undefined,
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* ── نوع اللعب ── */}
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
                className={`text-right p-4 rounded-2xl border-2 transition-colors ${
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

      {/* ── اللاعبون ── */}
      {players.length >= 4 ? (
        <div className="bg-navy rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">
          {/* رأس + اختياري */}
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="text-sm font-bold text-white/80">👥 اللاعبون</span>
            <span className="bg-white/10 px-2 py-0.5 rounded-full">اختياري</span>
          </div>

          {/* أزرار سريعة */}
          {(hasLastWinners || players.length >= 4) && (
            <div className="flex flex-wrap gap-2">
              {hasLastWinners && (
                <button
                  type="button"
                  onClick={fillLastWinners}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors flex items-center gap-1.5"
                >
                  🏆 آخر فائزين
                </button>
              )}
              {hasLastGame && (
                <button
                  type="button"
                  onClick={fillLastGame}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-1.5"
                >
                  ↺ نفس آخر صكة
                </button>
              )}
              <button
                type="button"
                onClick={shuffle}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-1.5"
              >
                🎲 خلط عشوائي
              </button>
              {!noneChosen && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  مسح
                </button>
              )}
            </div>
          )}

          {/* تبويبات الفريقين */}
          <div className="grid grid-cols-2 gap-2">
            <TeamTab
              label="لنا"
              count={team1.length}
              active={activeTeam === 1}
              color={T1}
              members={team1.map((id) => byId.get(id)!).filter(Boolean)}
              onClick={() => setActiveTeam(1)}
              onRemove={(id) => setTeam1((s) => s.filter((x) => x !== id))}
            />
            <TeamTab
              label="لهم"
              count={team2.length}
              active={activeTeam === 2}
              color={T2}
              members={team2.map((id) => byId.get(id)!).filter(Boolean)}
              onClick={() => setActiveTeam(2)}
              onRemove={(id) => setTeam2((s) => s.filter((x) => x !== id))}
            />
          </div>

          {/* بحث */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 ابحث عن لاعب..."
            className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent placeholder:text-white/30"
          />

          {/* تلميح الفريق النشط */}
          <p className="text-xs text-white/40 -mt-1">
            تختار لـ
            <span
              className="font-bold mx-1"
              style={{ color: activeTeam === 1 ? T1 : T2 }}
            >
              {activeTeam === 1 ? "لنا" : "لهم"}
            </span>
            — اضغط الاسم لإضافته أو إزالته
          </p>

          {/* شبكة اللاعبين */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-white/30 text-sm py-6">
                ما في نتائج
              </p>
            )}
            {filtered.map((p) => {
              const t = teamOf(p.id);
              const isSuggest = p.id === suggestId;
              const teamColor = t === 1 ? T1 : t === 2 ? T2 : null;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => tapPlayer(p.id)}
                  className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: teamColor ?? (isSuggest ? "#f5b04266" : "rgba(255,255,255,0.08)"),
                    background: teamColor ? `${teamColor}1f` : "rgba(255,255,255,0.02)",
                    boxShadow: teamColor ? `0 0 16px -4px ${teamColor}` : undefined,
                  }}
                >
                  {/* شارة الفريق */}
                  {t && (
                    <span
                      className="absolute top-1 right-1 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-navy-deep"
                      style={{ background: teamColor! }}
                    >
                      {t === 1 ? "ل" : "ه"}
                    </span>
                  )}
                  {/* شارة الاقتراح */}
                  {isSuggest && !t && (
                    <span className="absolute top-1 right-1 text-xs" title="يلعب معه عادة">
                      ⭐
                    </span>
                  )}
                  <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="md" />
                  <span className="text-xs truncate max-w-full w-full text-center">
                    {p.name}
                  </span>
                  {isSuggest && !t && (
                    <span className="text-[9px] text-gold/80 leading-none">يلعب معه عادة</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
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

/* ─── تبويب فريق ─── */
function TeamTab({
  label,
  count,
  active,
  color,
  members,
  onClick,
  onRemove,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  members: Player[];
  onClick: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl border-2 p-2.5 cursor-pointer transition-all min-h-[64px]"
      style={{
        borderColor: active ? color : "rgba(255,255,255,0.1)",
        background: active ? `${color}14` : "rgba(255,255,255,0.02)",
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold text-sm" style={{ color }}>
          {label}
        </span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `${color}22`, color }}
        >
          {count}/2
        </span>
      </div>
      <div className="flex flex-col gap-1 min-h-[28px]">
        {members.length === 0 ? (
          <span className="text-[10px] text-white/30">اضغط لاختيار اللاعبين</span>
        ) : (
          members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(m.id);
              }}
              className="w-full flex items-center gap-1.5 bg-white/5 rounded-lg pr-1 pl-2 py-1 hover:bg-white/10"
              title="إزالة"
            >
              <PlayerAvatar name={m.name} imageUrl={m.imageUrl} size="xs" />
              <span className="flex-1 text-right text-xs truncate">{m.name}</span>
              <span className="text-white/40 text-[10px] shrink-0">✕</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
