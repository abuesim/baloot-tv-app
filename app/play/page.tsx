"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  Settings,
  Redo2,
  ArrowLeft,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { getWinner } from "@/lib/baloot";

const QUICK_CHIPS = [16, 18, 26, 30];
const TARGET = 152;

type Round = { id: string; number: number; team1Score: number; team2Score: number };

/** جولة بداية مشدود (٥٢/٥٢) — تظهر في السجل كأول جولة */
function makeBaseRound(): Round {
  return { id: `base-${Date.now()}`, number: 0, team1Score: 52, team2Score: 52 };
}

/** يعيد ترقيم الجولات العادية (جولة البداية تبقى ٠) */
function renumber(rs: Round[]): Round[] {
  const hasBase = rs.some((r) => r.number === 0);
  let n = hasBase ? 2 : 1;
  return rs.map((r) => (r.number === 0 ? r : { ...r, number: n++ }));
}

/** صوت احتفال بسيط مُولَّد بـ Web Audio API */
function playCelebration() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes: [number, number, number, number][] = [
      [523.25, 0.0, 0.13, 0.3],
      [659.25, 0.12, 0.13, 0.3],
      [783.99, 0.24, 0.13, 0.3],
      [1046.5, 0.36, 0.75, 0.32],
      [783.99, 0.36, 0.75, 0.18],
      [659.25, 0.36, 0.75, 0.12],
      [1046.5, 0.54, 0.5, 0.14],
    ];
    notes.forEach(([freq, start, dur, vol]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(vol, t + start + 0.015);
      gain.gain.setValueAtTime(vol, t + start + dur - 0.06);
      gain.gain.linearRampToValueAtTime(0, t + start + dur);
      osc.start(t + start);
      osc.stop(t + start + dur + 0.1);
    });
  } catch {
    /* غير مدعوم */
  }
}

export default function PlayPage() {
  const [usName, setUsName] = useState("لنا");
  const [themName, setThemName] = useState("لهم");
  const [mode, setMode] = useState<"NORMAL" | "MASHDOOD">("NORMAL");
  const [rounds, setRounds] = useState<Round[]>([]);

  const team1Score = rounds.reduce((s, r) => s + r.team1Score, 0);
  const team2Score = rounds.reduce((s, r) => s + r.team2Score, 0);
  const winner = getWinner(team1Score, team2Score, TARGET);
  const isOver = winner !== null;

  // ── الإدخال ──
  const [activeSide, setActiveSide] = useState<"us" | "them" | null>(null);
  const [usInput, setUsInput] = useState("");
  const [themInput, setThemInput] = useState("");
  const usInputRef = useRef<HTMLInputElement>(null);
  const themInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeSide === "us") setTimeout(() => usInputRef.current?.focus(), 30);
    else if (activeSide === "them") setTimeout(() => themInputRef.current?.focus(), 30);
  }, [activeSide]);

  const [showSettings, setShowSettings] = useState(false);
  const [showAllRounds, setShowAllRounds] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // أنيميشن تأكيد التسجيل
  const [flashScore, setFlashScore] = useState<{ us: number; them: number; round: number } | null>(null);

  // تعديل أسماء الفرق
  const [editingName, setEditingName] = useState<"us" | "them" | null>(null);
  const [tempName, setTempName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editingName) setTimeout(() => nameInputRef.current?.focus(), 30);
  }, [editingName]);

  // ── المؤقت ──
  const [elapsed, setElapsed] = useState("00:00");
  const startTimeRef = useRef(Date.now());
  useEffect(() => {
    function fmt() {
      const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      setElapsed(`${mm}:${ss}`);
    }
    fmt();
    if (isOver) return;
    const t = setInterval(fmt, 1000);
    return () => clearInterval(t);
  }, [isOver]);

  // ── الفوز ──
  const prevWinnerRef = useRef<1 | 2 | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  useEffect(() => {
    if (winner !== null && prevWinnerRef.current === null) {
      setShowCelebration(true);
      setTimeout(() => playCelebration(), 150);
    }
    prevWinnerRef.current = winner;
  }, [winner]);

  // النقاط الحية أثناء الكتابة
  const usLive = team1Score + (Number(usInput) || 0);
  const themLive = team2Score + (Number(themInput) || 0);

  function clickChip(value: number) {
    if (activeSide === "us") setUsInput(String(value));
    else if (activeSide === "them") setThemInput(String(value));
  }

  function record() {
    if (!activeSide && !usInput && !themInput) return;
    setError(null);
    const t1 = Number(usInput) || 0;
    const t2 = Number(themInput) || 0;
    if (t1 === 0 && t2 === 0) {
      setError("أدخل نقاطاً");
      return;
    }
    const regularRounds = rounds.filter((r) => r.number > 0);
    const hasBase = rounds.some((r) => r.number === 0);
    const nextNum =
      regularRounds.length === 0
        ? hasBase
          ? 2
          : 1
        : Math.max(...regularRounds.map((r) => r.number)) + 1;
    setRounds((r) => [
      ...r,
      { id: `${Date.now()}-${nextNum}`, number: nextNum, team1Score: t1, team2Score: t2 },
    ]);
    setUsInput("");
    setThemInput("");
    setActiveSide(null);
    setFlashScore({ us: t1, them: t2, round: nextNum });
    setTimeout(() => setFlashScore(null), 6000);
  }

  function undoLast() {
    const regularRounds = rounds.filter((r) => r.number > 0);
    const last = [...regularRounds].sort((a, b) => b.number - a.number)[0];
    if (!last) return;
    if (!confirm(`تراجع عن الجولة ${last.number} (${usName} ${last.team1Score} / ${themName} ${last.team2Score})؟`))
      return;
    setRounds((r) => renumber(r.filter((x) => x.id !== last.id)));
  }

  function deleteRound(id: string) {
    setRounds((r) => renumber(r.filter((x) => x.id !== id)));
  }

  function newGame(nextMode: "NORMAL" | "MASHDOOD" = mode) {
    setRounds(nextMode === "MASHDOOD" ? [makeBaseRound()] : []);
    setUsInput("");
    setThemInput("");
    setActiveSide(null);
    setShowCelebration(false);
    prevWinnerRef.current = null;
    startTimeRef.current = Date.now();
  }

  function openNameEdit(side: "us" | "them") {
    setTempName(side === "us" ? usName : themName);
    setEditingName(side);
  }
  function saveName() {
    const trimmed = tempName.trim();
    if (!trimmed) return;
    if (editingName === "us") setUsName(trimmed);
    else setThemName(trimmed);
    setEditingName(null);
  }

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden pb-10"
      style={{
        background: `
          radial-gradient(ellipse 60% 40% at 0% 35%, rgba(60, 60, 80, 0.55) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 100% 35%, rgba(60, 60, 80, 0.55) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 0% 75%, rgba(50, 50, 70, 0.4) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 100% 75%, rgba(50, 50, 70, 0.4) 0%, transparent 60%),
          #000
        `,
        fontFamily: "var(--font-readex), system-ui",
      }}
    >
      {/* Top header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <Link
          href="/login"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"
          title="رجوع"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </Link>
        <h1 className="text-xl font-bold">
          {mode === "MASHDOOD" ? "بلوت — مشدود" : "حاسبة بلوت"}
        </h1>
        <button
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-full border border-white/15 bg-white/5 flex items-center justify-center"
          title="الإعدادات"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Timer + undo */}
      <div className="flex items-center justify-between px-6 mt-6">
        {!isOver ? (
          <button
            onClick={undoLast}
            disabled={rounds.filter((r) => r.number > 0).length === 0}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/5 disabled:opacity-30"
            title="تراجع"
          >
            <Redo2 size={22} strokeWidth={2} className="rotate-180" />
          </button>
        ) : (
          <div className="w-11 h-11" />
        )}

        <div className="flex items-center gap-2 text-white/95">
          <TimerIcon />
          <span className="text-3xl font-medium tabular-nums tracking-wider">{elapsed}</span>
        </div>

        <div className="w-11 h-11" />
      </div>

      {/* Score Display */}
      <div className="grid grid-cols-2 items-end gap-4 px-6 mt-12 mb-4">
        <ScoreSide
          name={usName}
          score={usLive}
          isWinner={winner === 1}
          isOurs
          flashing={!!usInput && activeSide === "us"}
          onEditName={() => openNameEdit("us")}
        />
        <ScoreSide
          name={themName}
          score={themLive}
          isWinner={winner === 2}
          flashing={!!themInput && activeSide === "them"}
          onEditName={() => openNameEdit("them")}
        />
      </div>

      {/* Winner banner */}
      {winner !== null && (
        <div className="mx-5 mt-2 text-center bg-gold/20 text-gold rounded-2xl py-3 font-bold text-lg">
          🏆 الفوز لفريق {winner === 1 ? usName : themName}
        </div>
      )}

      {/* 3 boxes */}
      {!isOver && (
        <>
          <div className="px-5 mt-8 grid grid-cols-[1fr_2.5fr_1fr] gap-2.5">
            {/* لنا */}
            <label
              className={`h-16 rounded-2xl bg-black flex items-center justify-center transition cursor-text ${
                activeSide === "us" ? "border-2 border-amber-400" : "border border-white/15"
              }`}
            >
              <input
                ref={usInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={usInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setUsInput(val);
                  setActiveSide("us");
                  if (val.length >= 2) {
                    setActiveSide("them");
                    setTimeout(() => themInputRef.current?.focus(), 30);
                  }
                }}
                onFocus={() => setActiveSide("us")}
                onKeyDown={(e) => e.key === "Enter" && record()}
                placeholder={usName}
                className="w-full h-full text-center bg-transparent text-white text-2xl font-bold tabular-nums outline-none placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
              />
            </label>

            {/* سجل */}
            <button
              onClick={record}
              disabled={!usInput && !themInput}
              className="h-16 rounded-2xl border border-white/15 bg-black flex items-center justify-center hover:bg-white/[0.03] disabled:opacity-50"
            >
              <span
                className="font-black text-3xl tracking-wide"
                style={{
                  background: "linear-gradient(180deg, #ffb547 0%, #ff7e2e 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                سجل
              </span>
            </button>

            {/* لهم */}
            <label
              className={`h-16 rounded-2xl bg-black flex items-center justify-center transition cursor-text ${
                activeSide === "them" ? "border-2 border-amber-400" : "border border-white/15"
              }`}
            >
              <input
                ref={themInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={themInput}
                onChange={(e) => {
                  setThemInput(e.target.value.replace(/\D/g, ""));
                  setActiveSide("them");
                }}
                onFocus={() => setActiveSide("them")}
                onKeyDown={(e) => e.key === "Enter" && record()}
                placeholder={themName}
                className="w-full h-full text-center bg-transparent text-white text-2xl font-bold tabular-nums outline-none placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
              />
            </label>
          </div>

          {/* Quick chips */}
          <div
            className={`flex items-center justify-center gap-3 mt-5 transition-all duration-300 ${
              activeSide
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2 pointer-events-none h-0"
            }`}
          >
            {QUICK_CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => clickChip(c)}
                className="w-12 h-12 rounded-full border border-amber-700/60 bg-stone-800/70 hover:bg-stone-700 flex items-center justify-center text-amber-100/90 font-medium tabular-nums"
              >
                {c}
              </button>
            ))}
          </div>

          {error && (
            <div className="mx-5 mt-3 bg-danger/20 text-red-300 text-sm rounded-xl p-3 text-center">
              {error}
            </div>
          )}
        </>
      )}

      {/* Rounds preview */}
      <RoundsPreview
        rounds={rounds}
        usName={usName}
        themName={themName}
        onExpand={() => setShowAllRounds(true)}
      />

      {showAllRounds && (
        <RoundsOverlay
          rounds={rounds}
          usName={usName}
          themName={themName}
          isOver={isOver}
          onClose={() => setShowAllRounds(false)}
          onDelete={deleteRound}
        />
      )}

      {/* وسم */}
      <div className="fixed top-3 right-3 bg-gold/20 text-gold text-[10px] font-bold px-2 py-1 rounded-full z-30 border border-gold/30">
        بدون تسجيل
      </div>

      {/* أنيميشن الفوز */}
      {showCelebration && winner !== null && (
        <WinCelebration
          winnerName={winner === 1 ? usName : themName}
          team1Score={team1Score}
          team2Score={team2Score}
          onViewRounds={() => {
            setShowCelebration(false);
            setShowAllRounds(true);
          }}
          onSettings={() => {
            setShowCelebration(false);
            setShowSettings(true);
          }}
          onNewGame={() => newGame()}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* أنيميشن تأكيد التسجيل */}
      {flashScore && (
        <ScoreFlash
          us={flashScore.us}
          them={flashScore.them}
          round={flashScore.round}
          usName={usName}
          themName={themName}
        />
      )}

      {/* تعديل اسم الفريق */}
      {editingName && (
        <div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setEditingName(null)}
        >
          <div
            className="bg-[#171717] border border-white/10 rounded-3xl p-6 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">اسم الفريق</h3>
              <button
                onClick={() => setEditingName(null)}
                className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <input
              ref={nameInputRef}
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              maxLength={20}
              placeholder="اكتب الاسم..."
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-base text-white placeholder:text-white/30 outline-none focus:border-amber-500/60 text-center"
            />
            <button
              onClick={saveName}
              className="mt-4 w-full py-3 rounded-xl font-bold text-sm"
              style={{ background: "linear-gradient(135deg,#ffb547 0%,#ff7e2e 100%)", color: "#000" }}
            >
              حفظ
            </button>
          </div>
        </div>
      )}

      {/* الإعدادات */}
      {showSettings && (
        <SettingsModal
          mode={mode}
          usName={usName}
          themName={themName}
          onModeChange={(m) => {
            setMode(m);
            newGame(m);
          }}
          onEditName={openNameEdit}
          onNewGame={() => {
            newGame();
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function ScoreSide({
  name,
  score,
  isWinner,
  isOurs = false,
  flashing,
  onEditName,
}: {
  name: string;
  score: number;
  isWinner: boolean;
  isOurs?: boolean;
  flashing: boolean;
  onEditName: () => void;
}) {
  return (
    <div className={`text-center transition ${flashing ? "scale-105" : ""}`}>
      <button
        onClick={onEditName}
        className={`inline-flex items-center gap-1.5 text-xl font-medium mb-1 transition hover:text-amber-400 ${
          isOurs ? "text-gold" : "text-white/95"
        }`}
      >
        {name}
        <Pencil size={13} className="opacity-30" />
      </button>
      <div
        key={score}
        className={`block w-full text-[6.5rem] sm:text-[7.5rem] leading-none font-black select-none ${
          isWinner || isOurs ? "text-gold" : "text-white"
        }`}
      >
        {score}
      </div>
    </div>
  );
}

function RoundsPreview({
  rounds,
  usName,
  themName,
  onExpand,
}: {
  rounds: Round[];
  usName: string;
  themName: string;
  onExpand: () => void;
}) {
  const regular = rounds.filter((r) => r.number > 0);
  const base = rounds.find((r) => r.number === 0); // جولة البداية (مشدود)

  // إذا في جولات عادية: اعرض آخر جولتين منها
  // إذا ما في جولات بعد وفي جولة بداية: اعرضها (مشدود جديد)
  const visible =
    regular.length > 0
      ? [...regular].sort((a, b) => b.number - a.number).slice(0, 2)
      : base
      ? [base]
      : [];

  if (visible.length === 0) return null;

  return (
    <div className="px-4 mt-6 mb-4">
      <div className="bg-[#0d0d0d] rounded-2xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-3 px-6 py-2 text-white/60 text-sm">
          <div className="text-right">#</div>
          <div className="text-center">{usName}</div>
          <div className="text-left">{themName}</div>
        </div>
        {visible.map((r) => (
          <div
            key={r.id}
            className={`grid grid-cols-3 px-6 py-2.5 text-xl border-t border-white/5 ${
              r.number === 0 ? "bg-gold/5" : ""
            }`}
          >
            <div
              className={`text-right tabular-nums ${
                r.number === 0 ? "text-gold/70 font-bold" : "text-white/50"
              }`}
            >
              {r.number === 0 ? 1 : r.number}
            </div>
            <div className={`text-center tabular-nums ${r.number === 0 ? "text-gold/70" : ""}`}>
              {r.team1Score}
            </div>
            <div className={`text-left tabular-nums ${r.number === 0 ? "text-gold/70" : ""}`}>
              {r.team2Score}
            </div>
          </div>
        ))}
        {regular.length > 2 && (
          <button
            onClick={onExpand}
            className="w-full flex items-center justify-center py-1.5 border-t border-white/5 text-white/40 hover:text-white/70 hover:bg-white/5"
            aria-label="عرض كل الجولات"
          >
            <ChevronUp size={18} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

function RoundsOverlay({
  rounds,
  usName,
  themName,
  isOver,
  onClose,
  onDelete,
}: {
  rounds: Round[];
  usName: string;
  themName: string;
  isOver: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  // جولة البداية (مشدود) تظهر أولاً، ثم الجولات العادية تصاعدياً
  const ascending = [...rounds].sort((a, b) => a.number - b.number);
  const regularCount = rounds.filter((r) => r.number > 0).length;

  function del(id: string, n: number) {
    if (!confirm(`حذف الجولة ${n}؟`)) return;
    onDelete(id);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0d0d] rounded-3xl border border-white/10 w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
          <h3 className="text-lg font-bold">الجولات ({regularCount})</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center hover:bg-white/5"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-3 text-white/60 text-sm bg-white/[0.03]">
          <div>#</div>
          <div className="text-center">{usName}</div>
          <div className="text-center">{themName}</div>
          <div />
        </div>

        <div className="flex-1 overflow-y-auto">
          {ascending.map((r) => (
            <div
              key={r.id}
              className={`grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-3 text-xl items-center border-b border-white/5 ${
                r.number === 0 ? "bg-gold/5" : ""
              }`}
            >
              <div className={`tabular-nums ${r.number === 0 ? "text-gold/70 font-bold" : "text-white/50"}`}>
                {r.number === 0 ? 1 : r.number}
              </div>
              <div className={`text-center tabular-nums ${r.number === 0 ? "text-gold/70" : ""}`}>{r.team1Score}</div>
              <div className={`text-center tabular-nums ${r.number === 0 ? "text-gold/70" : ""}`}>{r.team2Score}</div>
              <div>
                {!isOver && r.number > 0 && (
                  <button
                    onClick={() => del(r.id, r.number)}
                    className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition"
                    title={`حذف الجولة ${r.number}`}
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="border-t border-white/5 py-3 text-white/60 hover:bg-white/5 flex items-center justify-center"
        >
          <ChevronDown size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// أنيميشن تأكيد تسجيل الجولة
// ============================================================

function ScoreFlash({
  us,
  them,
  round,
  usName,
  themName,
}: {
  us: number;
  them: number;
  round: number;
  usName: string;
  themName: string;
}) {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] pointer-events-none flex items-start justify-center pt-10 px-4">
      <style>{`
        @keyframes scoreFlashIn {
          0%   { opacity: 0; transform: scale(0.86) translateY(-18px); }
          14%  { opacity: 1; transform: scale(1.04) translateY(3px); }
          22%  { transform: scale(1) translateY(0); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: scale(0.97) translateY(-8px); }
        }
        @keyframes checkPop {
          0%,100% { transform: scale(1); }
          40%     { transform: scale(1.35); }
        }
      `}</style>

      <div
        className="relative text-center px-16 py-9 rounded-3xl overflow-hidden w-full max-w-xs"
        style={{
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(22px)",
          border: "1px solid rgba(245,176,66,0.30)",
          boxShadow: "0 12px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05) inset",
          animation: "scoreFlashIn 6s cubic-bezier(0.22,1,0.36,1) forwards",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-base text-white/40 tracking-widest">جولة</span>
          <span className="text-base font-black text-white/60 tabular-nums">{round}</span>
          <span
            className="text-gold text-lg font-black"
            style={{ animation: "checkPop 0.5s ease-out 0.15s both" }}
          >
            ✓
          </span>
        </div>

        <div className="flex items-end justify-center gap-8">
          <div className="text-center">
            <div className="text-sm text-white/35 mb-1 tracking-wide truncate max-w-[5rem]">{usName}</div>
            <div
              className="tabular-nums font-black leading-none"
              style={{
                fontSize: "clamp(4.5rem,18vw,7rem)",
                background: "linear-gradient(160deg, #ffca6e 0%, #f5a623 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {us}
            </div>
          </div>

          <div className="text-white/20 text-4xl font-thin mb-4">—</div>

          <div className="text-center">
            <div className="text-sm text-white/35 mb-1 tracking-wide truncate max-w-[5rem]">{themName}</div>
            <div
              className="text-white tabular-nums font-black leading-none"
              style={{ fontSize: "clamp(4.5rem,18vw,7rem)" }}
            >
              {them}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// أنيميشن الفوز
// ============================================================

const CONFETTI_COLORS = ["#f5b042", "#ff5e3a", "#4ecdc4", "#a29bfe", "#fd79a8", "#55efc4", "#fdcb6e"];
const CONFETTI = Array.from({ length: 65 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % 7],
  left: (i * 1.57) % 100,
  size: 5 + (i % 5) * 3,
  dur: 2.2 + (i % 5) * 0.5,
  delay: (i * 0.13) % 3.5,
  circle: i % 3 !== 2,
}));

function WinCelebration({
  winnerName,
  team1Score,
  team2Score,
  onViewRounds,
  onSettings,
  onNewGame,
  onClose,
}: {
  winnerName: string;
  team1Score: number;
  team2Score: number;
  onViewRounds: () => void;
  onSettings: () => void;
  onNewGame: () => void;
  onClose: () => void;
}) {
  const [showButtons, setShowButtons] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowButtons(true), 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden">
      <style>{`
        @keyframes cRise {
          0%   { transform: translateY(105vh) rotate(0deg);   opacity:1 }
          80%  { opacity:1 }
          100% { transform: translateY(-15vh) rotate(600deg); opacity:0 }
        }
        @keyframes cPop {
          0%,100% { transform:scale(1) }
          30%     { transform:scale(1.08) }
          60%     { transform:scale(0.97) }
        }
        @keyframes cUp {
          from { opacity:0; transform:translateY(28px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `}</style>

      <div className="absolute inset-0 bg-black/88 backdrop-blur-sm" />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {CONFETTI.map((p) => (
          <div
            key={p.id}
            className="absolute bottom-0"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: p.circle ? p.color : undefined,
              border: !p.circle ? `${Math.ceil(p.size / 2)}px solid ${p.color}` : undefined,
              borderRadius: p.circle ? "50%" : "2px",
              animation: `cRise ${p.dur}s ease-out ${p.delay}s 3 forwards`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-8" style={{ animation: "cPop 1.8s ease-in-out 4" }}>
        <div className="text-7xl mb-3">🏆</div>
        <div className="text-3xl sm:text-4xl font-black mb-1 text-gold">فوز فريق {winnerName}!</div>
        <div className="text-white/50 text-xl mb-6 tabular-nums">
          {team1Score} — {team2Score}
        </div>
      </div>

      {showButtons && (
        <div
          className="relative z-10 w-full max-w-xs px-5 mt-8 space-y-2.5"
          style={{ animation: "cUp 0.45s ease-out forwards" }}
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onViewRounds}
              className="h-12 rounded-2xl bg-white/10 border border-white/15 text-sm font-bold hover:bg-white/20 transition"
            >
              📋 الجولات
            </button>
            <button
              onClick={onSettings}
              className="h-12 rounded-2xl bg-white/10 border border-white/15 text-sm font-bold hover:bg-white/20 transition"
            >
              ⚙️ الإعدادات
            </button>
          </div>
          <button onClick={onNewGame} className="w-full h-14 rounded-2xl btn-grad font-bold text-lg">
            🎮 نشرة جديدة
          </button>
          <button
            onClick={onClose}
            className="w-full text-white/35 text-sm py-2 hover:text-white/60 transition"
          >
            متابعة المشاهدة
          </button>
        </div>
      )}
    </div>
  );
}

function TimerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 6l1.5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="14" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ============================================================
// الإعدادات
// ============================================================

function SettingsModal({
  mode,
  usName,
  themName,
  onModeChange,
  onEditName,
  onNewGame,
  onClose,
}: {
  mode: "NORMAL" | "MASHDOOD";
  usName: string;
  themName: string;
  onModeChange: (m: "NORMAL" | "MASHDOOD") => void;
  onEditName: (side: "us" | "them") => void;
  onNewGame: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-3 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#171717] rounded-3xl border border-white/10 overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
          <h3 className="text-lg font-bold">الإعدادات</h3>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* نوع الصكة */}
          <div>
            <div className="text-xs text-white/60 mb-2">نوع الصكة</div>
            <div className="grid grid-cols-2 bg-white/[0.04] rounded-xl p-1 border border-white/5">
              <button
                onClick={() => onModeChange("NORMAL")}
                className={`h-10 rounded-lg text-sm font-bold transition ${
                  mode === "NORMAL" ? "bg-orange-500 text-white shadow" : "text-white/50 hover:text-white"
                }`}
              >
                عادي
              </button>
              <button
                onClick={() => onModeChange("MASHDOOD")}
                className={`h-10 rounded-lg text-sm font-bold transition ${
                  mode === "MASHDOOD" ? "bg-orange-500 text-white shadow" : "text-white/50 hover:text-white"
                }`}
              >
                مشدود
              </button>
            </div>
            <p className="text-xs text-white/30 mt-1">
              {mode === "NORMAL" ? "البداية من ٠ والوصول إلى ١٥٢" : "البداية من ٥٢ والوصول إلى ١٥٢"}
            </p>
          </div>

          {/* أسماء الفرق */}
          <div>
            <div className="text-xs text-white/60 mb-2">أسماء الفرق</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onEditName("us")}
                className="bg-white/[0.04] rounded-xl px-4 py-3 border border-white/5 text-right hover:bg-white/[0.07] transition"
              >
                <div className="text-[10px] text-white/40 mb-0.5">فريقنا</div>
                <div className="font-bold text-gold truncate">{usName}</div>
              </button>
              <button
                onClick={() => onEditName("them")}
                className="bg-white/[0.04] rounded-xl px-4 py-3 border border-white/5 text-right hover:bg-white/[0.07] transition"
              >
                <div className="text-[10px] text-white/40 mb-0.5">الفريق الثاني</div>
                <div className="font-bold text-white/90 truncate">{themName}</div>
              </button>
            </div>
          </div>

          {/* نشرة جديدة */}
          <button
            onClick={onNewGame}
            className="w-full bg-danger/20 hover:bg-danger/30 text-red-300 rounded-xl py-3 font-bold text-sm"
          >
            بدء نشرة جديدة
          </button>
        </div>

        <div className="p-4 border-t border-white/5">
          <button onClick={onClose} className="w-full h-12 rounded-2xl bg-white/10 hover:bg-white/20 font-medium">
            تم
          </button>
        </div>
      </div>
    </div>
  );
}
