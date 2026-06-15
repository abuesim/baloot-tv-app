"use client";

import { useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type Player = { id: string; name: string; imageUrl: string | null };
type Team = { id: string; players: [Player, Player] };

const A = "#ff7c2a"; // برتقالي
const B = "#38bdf8"; // أزرق
const CONF = ["#f5b042", "#ff5e3a", "#4ecdc4", "#a29bfe", "#fd79a8", "#55efc4", "#74b9ff"];

export default function DagAlwalad({ players }: { players: Player[] }) {
  const byId = new Map(players.map((p) => [p.id, p]));

  const [selected, setSelected] = useState<string[]>([]);
  const [stage, setStage] = useState<"select" | "ladder">("select");

  // حالة السُّلّم (الفائز يبقى)
  const [teams, setTeams] = useState<Team[]>([]);
  const [curA, setCurA] = useState<Team | null>(null);
  const [curB, setCurB] = useState<Team | null>(null);
  const [nextIdx, setNextIdx] = useState(2);
  const [history, setHistory] = useState<{ a: Team; b: Team; winnerId: string }[]>([]);
  const [champion, setChampion] = useState<Team | null>(null);

  const even = selected.length % 2 === 0;
  const ready = selected.length >= 4 && even;

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function buildTeams(ids: string[]): Team[] {
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    const out: Team[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      const p1 = byId.get(shuffled[i])!;
      const p2 = byId.get(shuffled[i + 1])!;
      out.push({ id: `${p1.id}-${p2.id}`, players: [p1, p2] });
    }
    return out;
  }

  function dag() {
    if (!ready) return;
    const t = buildTeams(selected);
    setTeams(t);
    setCurA(t[0]);
    setCurB(t[1]);
    setNextIdx(2);
    setHistory([]);
    setChampion(null);
    setStage("ladder");
  }

  function redraw() {
    const t = buildTeams(selected);
    setTeams(t);
    setCurA(t[0]);
    setCurB(t[1]);
    setNextIdx(2);
    setHistory([]);
    setChampion(null);
  }

  function pickWinner(winner: Team) {
    if (!curA || !curB) return;
    setHistory((h) => [...h, { a: curA, b: curB, winnerId: winner.id }]);
    if (nextIdx < teams.length) {
      setCurA(winner);
      setCurB(teams[nextIdx]);
      setNextIdx((n) => n + 1);
    } else {
      setCurA(null);
      setCurB(null);
      setChampion(winner);
    }
  }

  // ════════ اختيار اللاعبين ════════
  if (stage === "select") {
    return (
      <div className="space-y-4">
        <div className="bg-navy rounded-2xl p-4 sm:p-5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold">👥 اختر اللاعبين</span>
            <span className={`text-xs ${even ? "text-white/50" : "text-red-300"}`}>
              {selected.length === 0
                ? "اختر ٤ لاعبين فأكثر (عدد زوجي)"
                : even
                  ? `${selected.length} لاعب → ${selected.length / 2} فرق`
                  : `${selected.length} لاعب — أضِف لاعباً ليكتمل الزوج`}
            </span>
          </div>

          {players.length < 4 ? (
            <p className="text-sm text-white/50 py-6 text-center">
              تحتاج ٤ لاعبين على الأقل — أضِفهم من صفحة «اللاعبون».
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {players.map((p) => {
                const active = selected.includes(p.id);
                const order = selected.indexOf(p.id) + 1;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: active ? A : "rgba(255,255,255,0.08)",
                      background: active ? `${A}1f` : "rgba(255,255,255,0.02)",
                      boxShadow: active ? `0 0 16px -4px ${A}` : undefined,
                    }}
                  >
                    {active && (
                      <span
                        className="absolute top-1 right-1 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-navy-deep"
                        style={{ background: A }}
                      >
                        {order}
                      </span>
                    )}
                    <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="md" />
                    <span className="text-xs truncate max-w-full w-full text-center">{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={dag}
          disabled={!ready}
          className="w-full btn-grad py-4 rounded-xl text-lg shadow-lg shadow-accent/30 disabled:opacity-40"
        >
          🎲 دق الولد
        </button>
      </div>
    );
  }

  // ════════ السُّلّم ════════
  const totalMatches = teams.length - 1;
  const matchNo = history.length + 1;

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes dagConf { 0%{transform:translateY(-10%) rotate(0);opacity:1} 100%{transform:translateY(380px) rotate(560deg);opacity:0} }
        @keyframes dagPop { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* الفرق */}
      <div className="bg-navy rounded-2xl p-4 border border-white/10">
        <div className="text-xs text-white/50 mb-2">الفرق ({teams.length})</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {teams.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2 bg-navy-light rounded-xl px-3 py-2 border border-white/5">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white/60 text-xs font-black flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <TeamMini team={t} />
            </div>
          ))}
        </div>
      </div>

      {champion ? (
        /* ── البطل ── */
        <div className="relative overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-b from-gold/20 to-navy p-6 text-center">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: "-5%",
                  left: `${(i * 2.1) % 100}%`,
                  width: 8,
                  height: 12,
                  background: CONF[i % CONF.length],
                  borderRadius: 2,
                  animation: `dagConf ${2 + (i % 5) * 0.5}s linear ${(i % 10) * 0.12}s infinite`,
                }}
              />
            ))}
          </div>
          <div className="relative z-10" style={{ animation: "dagPop 0.6s ease-out" }}>
            <div className="text-6xl mb-2">🏆</div>
            <div className="text-gold font-black text-xl mb-4">الفائز</div>
            <div className="flex items-end justify-center gap-8">
              {champion.players.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-2">
                  <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="2xl" />
                  <span className="font-bold text-gold">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── المباراة الحالية ── */
        curA && curB && (
          <div className="bg-navy rounded-2xl p-4 border border-gold/30">
            <div className="text-center text-xs text-white/50 mb-3">
              المباراة {matchNo} من {totalMatches} — اضغط على الفريق الفائز
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <MatchTeam team={curA} color={A} onWin={() => pickWinner(curA)} />
              <span className="text-white/40 font-black text-lg">VS</span>
              <MatchTeam team={curB} color={B} onWin={() => pickWinner(curB)} />
            </div>
          </div>
        )
      )}

      {/* سجل المباريات */}
      {history.length > 0 && (
        <div className="bg-navy/60 rounded-2xl p-4 border border-white/5">
          <div className="text-xs text-white/40 mb-2">النتائج</div>
          <div className="space-y-1.5">
            {history.map((h, i) => {
              const win = h.winnerId === h.a.id ? h.a : h.b;
              const lose = h.winnerId === h.a.id ? h.b : h.a;
              return (
                <div key={i} className="text-xs flex items-center gap-2">
                  <span className="text-white/30">#{i + 1}</span>
                  <span className="text-gold font-bold">{teamName(win)}</span>
                  <span className="text-white/30">فاز على</span>
                  <span className="text-white/50">{teamName(lose)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* أدوات */}
      <div className="flex gap-2">
        <button
          onClick={redraw}
          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-sm font-bold"
        >
          🎲 دق من جديد
        </button>
        <button
          onClick={() => setStage("select")}
          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-sm text-white/70"
        >
          تغيير اللاعبين
        </button>
      </div>
    </div>
  );
}

function teamName(t: Team) {
  return `${t.players[0].name} و ${t.players[1].name}`;
}

function TeamMini({ team }: { team: Team }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex -space-x-2 -space-x-reverse shrink-0">
        {team.players.map((p) => (
          <PlayerAvatar key={p.id} name={p.name} imageUrl={p.imageUrl} size="xs" className="ring-2 ring-navy" />
        ))}
      </div>
      <span className="text-xs truncate">{teamName(team)}</span>
    </div>
  );
}

function MatchTeam({ team, color, onWin }: { team: Team; color: string; onWin: () => void }) {
  return (
    <button
      type="button"
      onClick={onWin}
      className="rounded-2xl border-2 p-3 transition-all hover:scale-[1.02] text-center"
      style={{ borderColor: `${color}66`, background: `${color}12` }}
    >
      <div className="flex justify-center -space-x-2 -space-x-reverse mb-2">
        {team.players.map((p) => (
          <PlayerAvatar key={p.id} name={p.name} imageUrl={p.imageUrl} size="md" className="ring-2 ring-navy" />
        ))}
      </div>
      <div className="text-xs font-bold truncate" style={{ color }}>
        {teamName(team)}
      </div>
      <div className="mt-2 text-[11px] font-black rounded-lg py-1" style={{ background: `${color}22`, color }}>
        فاز ✓
      </div>
    </button>
  );
}
