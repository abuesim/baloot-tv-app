"use client";

import { useState, useRef, useEffect } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type Player = { id: string; name: string; imageUrl: string | null };

const T1 = "#ff7c2a"; // لنا — برتقالي
const T2 = "#38bdf8"; // لهم — أزرق
const CONF = ["#f5b042", "#ff5e3a", "#4ecdc4", "#a29bfe", "#fd79a8", "#55efc4", "#74b9ff"];

/**
 * دق الولد لبدء صكة:
 * اختر ٤ لاعبين فأكثر → حركة خلط عشوائي → توزيع على فريقين (لنا/لهم).
 * عند أكثر من ٤ يُختار ٤ عشوائياً للصكة.
 */
export default function DagAlwaladStart({
  players,
  onResult,
  onClose,
}: {
  players: Player[];
  onResult: (team1Ids: [string, string], team2Ids: [string, string]) => void;
  onClose: () => void;
}) {
  const byId = new Map(players.map((p) => [p.id, p]));

  const [selected, setSelected] = useState<string[]>([]);
  const [stage, setStage] = useState<"select" | "shuffling" | "result">("select");
  // الخانات الأربع أثناء الحركة والنتيجة: [لنا١, لنا٢, لهم١, لهم٢]
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ready = selected.length >= 4;

  // تنظيف المؤقّتات عند الإغلاق
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function dag() {
    if (selected.length < 4) return;

    // النتيجة النهائية: ٤ لاعبين عشوائيين من المُختارين بترتيب عشوائي
    const four = [...selected].sort(() => Math.random() - 0.5).slice(0, 4);
    const finalArrange = [...four].sort(() => Math.random() - 0.5);

    setStage("shuffling");

    // حركة الخلط: نُبدّل الأسماء في الخانات بسرعة ثم نستقر
    intervalRef.current = setInterval(() => {
      const r = [...selected].sort(() => Math.random() - 0.5).slice(0, 4);
      setSlots(r);
    }, 90);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSlots(finalArrange);
      setStage("result");
    }, 1700);
  }

  function redag() {
    setStage("select");
    setSlots([null, null, null, null]);
    // إعادة فورية
    setTimeout(dag, 0);
  }

  function confirm() {
    const [a, b, c, d] = slots;
    if (!a || !b || !c || !d) return;
    onResult([a, b], [c, d]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <style>{`
        @keyframes dagConf { 0%{transform:translateY(-10%) rotate(0);opacity:1} 100%{transform:translateY(420px) rotate(560deg);opacity:0} }
        @keyframes dagPop { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
        @keyframes dagShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
      `}</style>

      <div className="relative w-full max-w-lg bg-navy rounded-3xl border border-white/15 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* رأس */}
        <div className="sticky top-0 z-10 bg-navy/95 backdrop-blur px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-black flex items-center gap-2">🎲 دق الولد</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {/* ════ اختيار اللاعبين ════ */}
          {stage === "select" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">👥 اختر اللاعبين</span>
                <span className={`text-xs ${ready ? "text-gold" : "text-white/50"}`}>
                  {selected.length === 0
                    ? "اختر ٤ لاعبين فأكثر"
                    : ready
                      ? `${selected.length} لاعب جاهز`
                      : `${selected.length}/٤ — أضِف المزيد`}
                </span>
              </div>

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
                        borderColor: active ? T1 : "rgba(255,255,255,0.08)",
                        background: active ? `${T1}1f` : "rgba(255,255,255,0.02)",
                        boxShadow: active ? `0 0 16px -4px ${T1}` : undefined,
                      }}
                    >
                      {active && (
                        <span
                          className="absolute top-1 right-1 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-navy-deep"
                          style={{ background: T1 }}
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

              {selected.length > 4 && (
                <p className="text-[11px] text-white/40 text-center">
                  سيُختار ٤ لاعبين عشوائياً من الـ {selected.length} لهذي الصكة
                </p>
              )}

              <button
                onClick={dag}
                disabled={!ready}
                className="w-full btn-grad py-4 rounded-xl text-lg shadow-lg shadow-accent/30 disabled:opacity-40"
              >
                🎲 دق الولد
              </button>
            </div>
          )}

          {/* ════ الحركة / النتيجة ════ */}
          {stage !== "select" && (
            <div className="space-y-5">
              {stage === "result" && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        top: "-5%",
                        left: `${(i * 2.6) % 100}%`,
                        width: 8,
                        height: 12,
                        background: CONF[i % CONF.length],
                        borderRadius: 2,
                        animation: `dagConf ${2 + (i % 5) * 0.5}s linear ${(i % 10) * 0.12}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="relative grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
                <TeamColumn
                  label="لنا"
                  color={T1}
                  members={[slots[0], slots[1]].map((id) => (id ? byId.get(id) ?? null : null))}
                  shuffling={stage === "shuffling"}
                />
                <div className="flex items-center">
                  <span className="text-white/40 font-black text-xl">VS</span>
                </div>
                <TeamColumn
                  label="لهم"
                  color={T2}
                  members={[slots[2], slots[3]].map((id) => (id ? byId.get(id) ?? null : null))}
                  shuffling={stage === "shuffling"}
                />
              </div>

              {stage === "shuffling" ? (
                <div className="text-center text-sm text-white/50 animate-pulse">يدق الولد…</div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={confirm}
                    className="w-full btn-grad py-3.5 rounded-xl text-base font-bold shadow-lg shadow-accent/30"
                  >
                    ✅ اعتمد الفرق
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={redag}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-sm font-bold"
                    >
                      🎲 دق من جديد
                    </button>
                    <button
                      onClick={() => setStage("select")}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-sm text-white/70"
                    >
                      تغيير اللاعبين
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamColumn({
  label,
  color,
  members,
  shuffling,
}: {
  label: string;
  color: string;
  members: (Player | null)[];
  shuffling: boolean;
}) {
  return (
    <div
      className="rounded-2xl border-2 p-3 text-center"
      style={{ borderColor: `${color}66`, background: `${color}12` }}
    >
      <div className="text-sm font-black mb-3" style={{ color }}>
        {label}
      </div>
      <div className="flex flex-col gap-3">
        {members.map((m, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5"
            style={{ animation: shuffling ? "dagShake 0.2s ease-in-out infinite" : "dagPop 0.5s ease-out" }}
          >
            {m ? (
              <>
                <PlayerAvatar name={m.name} imageUrl={m.imageUrl} size="lg" className="ring-2 ring-navy" />
                <span className="text-xs font-bold truncate max-w-[88px]">{m.name}</span>
              </>
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
