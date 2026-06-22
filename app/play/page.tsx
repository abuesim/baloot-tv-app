"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown, Undo2, X, Pencil, RotateCcw } from "lucide-react";

const CHIPS = [16, 18, 26, 30];

type Round = { n: number; us: number; them: number };

export default function PlayPage() {
  const [usName, setUsName] = useState("لنا");
  const [themName, setThemName] = useState("لهم");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [usInput, setUsInput] = useState("");
  const [themInput, setThemInput] = useState("");
  const [activeSide, setActiveSide] = useState<"us" | "them" | null>(null);
  const [editingName, setEditingName] = useState<"us" | "them" | null>(null);
  const [tempName, setTempName] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [winner, setWinner] = useState<"us" | "them" | null>(null);
  const [mode, setMode] = useState<"عادي" | "مشدود">("عادي");
  const [showModeSwitch, setShowModeSwitch] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startScore = mode === "مشدود" ? 52 : 0;
  const WIN_SCORE = 152;

  const usTotal = startScore + rounds.reduce((s, r) => s + r.us, 0);
  const themTotal = startScore + rounds.reduce((s, r) => s + r.them, 0);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  function toggleSide(side: "us" | "them") {
    setActiveSide((prev) => (prev === side ? null : side));
  }

  function clickChip(val: number) {
    if (activeSide === "us") setUsInput(String(val));
    else if (activeSide === "them") setThemInput(String(val));
  }

  function record() {
    const us = Number(usInput) || 0;
    const them = Number(themInput) || 0;
    if (us === 0 && them === 0) return;

    const newRounds = [...rounds, { n: rounds.length + 1, us, them }];
    setRounds(newRounds);
    setUsInput("");
    setThemInput("");
    setActiveSide(null);

    const newUs = startScore + newRounds.reduce((s, r) => s + r.us, 0);
    const newThem = startScore + newRounds.reduce((s, r) => s + r.them, 0);
    if (newUs >= WIN_SCORE) setWinner("us");
    else if (newThem >= WIN_SCORE) setWinner("them");
  }

  function undo() {
    if (rounds.length === 0) return;
    setRounds((r) => r.slice(0, -1));
    setWinner(null);
  }

  function resetGame() {
    setRounds([]);
    setUsInput("");
    setThemInput("");
    setActiveSide(null);
    setWinner(null);
  }

  function openNameEdit(side: "us" | "them") {
    setTempName(side === "us" ? usName : themName);
    setEditingName(side);
  }

  function saveName() {
    const trimmed = tempName.trim();
    if (!trimmed) return;
    if (editingName === "us") setUsName(trimmed);
    else if (editingName === "them") setThemName(trimmed);
    setEditingName(null);
  }

  const newestFirst = [...rounds].sort((a, b) => b.n - a.n);

  return (
    <div
      dir="rtl"
      className="min-h-screen text-white relative overflow-hidden select-none"
      style={{
        background: `
          radial-gradient(ellipse 60% 40% at 0% 35%, rgba(60,60,80,.55) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 100% 35%, rgba(60,60,80,.55) 0%, transparent 60%),
          #000
        `,
        fontFamily: "var(--font-readex), system-ui",
      }}
    >
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <button
          onClick={() => setShowModeSwitch(true)}
          className="px-3 h-9 rounded-full border border-white/15 bg-white/5 text-xs font-bold text-white/70 hover:text-white"
        >
          {mode}
        </button>
        <h1 className="text-lg font-black tracking-wide">حاسبة بلوت</h1>
        <button
          onClick={resetGame}
          className="w-9 h-9 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
        >
          <RotateCcw size={16} strokeWidth={2.2} />
        </button>
      </div>

      {/* ===== Scores ===== */}
      <div className="grid grid-cols-2 gap-4 px-6 mt-10 mb-2">
        {/* لنا */}
        <div className="text-center">
          <button
            onClick={() => openNameEdit("us")}
            className="inline-flex items-center gap-1.5 text-xl font-semibold text-white/90 mb-1 hover:text-amber-400 transition"
          >
            {usName}
            <Pencil size={13} className="opacity-40" />
          </button>
          <div
            className="leading-none font-black text-white"
            style={{ fontSize: "clamp(5rem,22vw,7.5rem)" }}
          >
            {usTotal}
          </div>
          {usTotal >= WIN_SCORE && (
            <div className="text-amber-400 text-sm font-bold mt-1">🏆 فاز!</div>
          )}
        </div>

        {/* لهم */}
        <div className="text-center">
          <button
            onClick={() => openNameEdit("them")}
            className="inline-flex items-center gap-1.5 text-xl font-semibold text-white/90 mb-1 hover:text-amber-400 transition"
          >
            {themName}
            <Pencil size={13} className="opacity-40" />
          </button>
          <div
            className="leading-none font-black text-white"
            style={{ fontSize: "clamp(5rem,22vw,7.5rem)" }}
          >
            {themTotal}
          </div>
          {themTotal >= WIN_SCORE && (
            <div className="text-amber-400 text-sm font-bold mt-1">🏆 فاز!</div>
          )}
        </div>
      </div>

      {/* ===== Input Row ===== */}
      <div className="px-5 mt-8 grid grid-cols-[1fr_2.4fr_1fr] gap-2.5">
        {/* لنا */}
        <button
          onClick={() => toggleSide("us")}
          className={`h-16 rounded-2xl bg-black flex items-center justify-center transition ${
            activeSide === "us"
              ? "border-2 border-amber-400"
              : "border border-white/15"
          }`}
        >
          {activeSide === "us" ? (
            <span className="text-2xl font-bold tabular-nums text-white">
              {usInput || <span className="text-white/30">|</span>}
            </span>
          ) : (
            <span className="text-white/40 text-xs">{usName}</span>
          )}
        </button>

        {/* سجل */}
        <button
          onClick={record}
          className="h-16 rounded-2xl border border-white/15 bg-black hover:bg-white/[0.03] flex items-center justify-center"
        >
          <span
            className="font-black text-3xl tracking-wide"
            style={{
              background: "linear-gradient(180deg,#ffb547 0%,#ff7e2e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            سجل
          </span>
        </button>

        {/* لهم */}
        <button
          onClick={() => toggleSide("them")}
          className={`h-16 rounded-2xl bg-black flex items-center justify-center transition ${
            activeSide === "them"
              ? "border-2 border-amber-400"
              : "border border-white/15"
          }`}
        >
          {activeSide === "them" ? (
            <span className="text-2xl font-bold tabular-nums text-white">
              {themInput || <span className="text-white/30">|</span>}
            </span>
          ) : (
            <span className="text-white/40 text-xs">{themName}</span>
          )}
        </button>
      </div>

      {/* ===== Chips ===== */}
      <div
        className={`flex items-center justify-center gap-3 mt-5 transition-all duration-300 ${
          activeSide
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden"
        }`}
      >
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => clickChip(c)}
            className="w-12 h-12 rounded-full border border-amber-700/60 bg-stone-800/70 hover:bg-stone-700 flex items-center justify-center text-amber-100/90 font-medium tabular-nums"
          >
            {c}
          </button>
        ))}
      </div>

      {/* ===== Rounds History ===== */}
      {rounds.length > 0 && (
        <div className="px-4 mt-6 mb-4">
          <div className="bg-[#0d0d0d] rounded-2xl border border-white/5 overflow-hidden">
            {/* عناوين */}
            <div className="grid grid-cols-3 px-5 py-2 text-white/50 text-xs">
              <div className="text-right">{themName}</div>
              <div className="text-center">{usName}</div>
              <div className="text-left">#</div>
            </div>

            {/* آخر 2 أو كل الجولات */}
            {(showHistory ? newestFirst : newestFirst.slice(0, 2)).map((r) => (
              <div
                key={r.n}
                className="grid grid-cols-3 px-5 py-2.5 text-base border-t border-white/5"
              >
                <div className="text-right tabular-nums">{r.them}</div>
                <div className="text-center tabular-nums">{r.us}</div>
                <div className="text-left tabular-nums text-white/40 text-sm">{r.n}</div>
              </div>
            ))}

            {/* زر التوسيع / الطي */}
            {rounds.length > 2 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="w-full flex items-center justify-center py-2 border-t border-white/5 text-white/40 hover:text-white/70 hover:bg-white/5"
              >
                {showHistory ? (
                  <ChevronDown size={18} strokeWidth={2} />
                ) : (
                  <ChevronUp size={18} strokeWidth={2} />
                )}
              </button>
            )}
          </div>

          {/* زر تراجع */}
          <button
            onClick={undo}
            className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5 text-sm"
          >
            <Undo2 size={15} strokeWidth={2} />
            تراجع عن آخر جولة
          </button>
        </div>
      )}

      {/* ===== فاز overlay ===== */}
      {winner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#111] border border-amber-500/30 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-3xl font-black text-amber-400 mb-2">
              {winner === "us" ? usName : themName}
            </div>
            <div className="text-white/60 mb-8">فاز بالنشرة!</div>
            <button
              onClick={resetGame}
              className="w-full h-13 py-3 rounded-2xl font-bold text-base"
              style={{
                background: "linear-gradient(135deg,#ffb547 0%,#ff7e2e 100%)",
                color: "#000",
              }}
            >
              نشرة جديدة
            </button>
            <button
              onClick={() => setWinner(null)}
              className="mt-3 w-full py-3 rounded-2xl border border-white/15 text-white/60 hover:text-white text-sm"
            >
              متابعة
            </button>
          </div>
        </div>
      )}

      {/* ===== تعديل اسم الفريق ===== */}
      {editingName && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setEditingName(null)}
        >
          <div
            className="bg-[#171717] border border-white/10 rounded-3xl p-6 w-full max-w-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">
                اسم {editingName === "us" ? "فريقنا" : "الفريق الثاني"}
              </h3>
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
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-base text-white placeholder:text-white/30 outline-none focus:border-amber-500/60 text-right"
            />

            <button
              onClick={saveName}
              className="mt-4 w-full py-3 rounded-xl font-bold text-sm"
              style={{
                background: "linear-gradient(135deg,#ffb547 0%,#ff7e2e 100%)",
                color: "#000",
              }}
            >
              حفظ
            </button>
          </div>
        </div>
      )}

      {/* ===== تبديل النوع ===== */}
      {showModeSwitch && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowModeSwitch(false)}
        >
          <div
            className="bg-[#171717] border border-white/10 rounded-3xl p-6 w-full max-w-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold mb-4 text-center">نوع اللعب</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["عادي", "مشدود"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setShowModeSwitch(false); resetGame(); }}
                  className={`py-4 rounded-2xl font-bold text-base transition ${
                    mode === m
                      ? "border-2 border-amber-500 text-amber-400"
                      : "border border-white/15 text-white/60"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/40 text-center mt-3">
              {mode === "عادي" ? "من ٠ وتفوز بـ ١٥٢" : "من ٥٢ وتفوز بـ ١٥٢"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
