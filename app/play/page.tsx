"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  Undo2,
  X,
  Pencil,
  RotateCcw,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Trash2,
} from "lucide-react";
import { scoreSequence, totalSequence, CLIP_TEXT } from "@/lib/voice-narration";
import { getWinner } from "@/lib/baloot";

type Round = { n: number; us: number; them: number };

const QUICK_CHIPS = [16, 18, 26, 30];

/** صوت احتفال مبسط مبرمج بـ Web Audio API لتشغيله محلياً */
function playCelebration() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // سلم C ماجور تصاعدي احتفالي
    const notes: [number, number, number, number][] = [
      [523.25, 0.00, 0.13, 0.30],  // C5
      [659.25, 0.12, 0.13, 0.30],  // E5
      [783.99, 0.24, 0.13, 0.30],  // G5
      [1046.5, 0.36, 0.75, 0.32],  // C6 - ممتد
      [783.99, 0.36, 0.75, 0.18],  // G5 هارموني
      [659.25, 0.36, 0.75, 0.12],  // E5 هارموني
      [1046.5, 0.54, 0.50, 0.14],  // C6 صدى
    ];

    notes.forEach(([freq, start, dur, vol]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type           = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(vol, t + start + 0.015);
      gain.gain.setValueAtTime(vol, t + start + dur - 0.06);
      gain.gain.linearRampToValueAtTime(0, t + start + dur);
      osc.start(t + start);
      osc.stop(t  + start + dur + 0.1);
    });
  } catch {
    // AudioContext غير مدعوم
  }
}

/** نافذة تعديل أسماء اللاعبين (لاعب أول وثاني) */
function NameEditModal({
  side,
  p1,
  p2,
  onSave,
  onClose,
}: {
  side: "us" | "them";
  p1: string;
  p2: string;
  onSave: (p1: string, p2: string) => void;
  onClose: () => void;
}) {
  const [localP1, setLocalP1] = useState(p1);
  const [localP2, setLocalP2] = useState(p2);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-[#171717] border border-white/10 rounded-3xl p-6 w-full max-w-xs shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">
            أسماء لاعبي {side === "us" ? "فريقنا (لنا)" : "الفريق الثاني (لهم)"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:text-white"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/40 mb-1 text-right">اسم اللاعب الأول</label>
            <input
              value={localP1}
              onChange={(e) => setLocalP1(e.target.value)}
              maxLength={20}
              placeholder="اللاعب الأول"
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-base text-white outline-none focus:border-amber-500/60 text-right"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1 text-right">اسم اللاعب الثاني</label>
            <input
              value={localP2}
              onChange={(e) => setLocalP2(e.target.value)}
              maxLength={20}
              placeholder="اللاعب الثاني"
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-base text-white outline-none focus:border-amber-500/60 text-right"
            />
          </div>
        </div>

        <button
          onClick={() => onSave(localP1, localP2)}
          className="mt-5 w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-orange-500/20"
        >
          حفظ
        </button>
      </div>
    </div>
  );
}

export default function PlayPage() {
  const [mounted, setMounted] = useState(false);

  // أسماء لاعبي الفريقين (فريقنا لنا / الفريق الثاني لهم)
  const [usP1, setUsP1] = useState("");
  const [usP2, setUsP2] = useState("");
  const [themP1, setThemP1] = useState("");
  const [themP2, setThemP2] = useState("");

  const [rounds, setRounds] = useState<Round[]>([]);

  // إدخال النقاط (المتقدمة)
  const [usInput, setUsInput] = useState("");
  const [themInput, setThemInput] = useState("");
  const [activeSide, setActiveSide] = useState<"us" | "them" | null>(null);

  // إدخال النقاط (الكلاسيكية)
  const [classicOpen, setClassicOpen] = useState(false);
  const [classicUs, setClassicUs] = useState("");
  const [classicThem, setClassicThem] = useState("");

  const [editingName, setEditingName] = useState<"us" | "them" | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [winner, setWinner] = useState<"us" | "them" | null>(null);
  const [roundToDelete, setRoundToDelete] = useState<Round | null>(null);

  // الإعدادات القابلة للتخصيص والمحفوظة محلياً
  const [calcStyle, setCalcStyle] = useState<"CLASSIC" | "ADVANCED">("ADVANCED");
  const [mode, setMode] = useState<"عادي" | "مشدود">("عادي");
  const targetScore = 152;
  const [ttsOn, setTtsOn] = useState<boolean>(true);
  const [narrationMode, setNarrationMode] = useState<"both" | "round" | "total">("both");
  const [showSettings, setShowSettings] = useState(false);
  const [showClassicRoundsOverlay, setShowClassicRoundsOverlay] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);

  const usInputRef = useRef<HTMLInputElement>(null);
  const themInputRef = useRef<HTMLInputElement>(null);
  const classicUsRef = useRef<HTMLInputElement>(null);
  const classicThemRef = useRef<HTMLInputElement>(null);

  const startScore = mode === "مشدود" ? 52 : 0;
  const usTotal = startScore + rounds.reduce((s, r) => s + r.us, 0);
  const themTotal = startScore + rounds.reduce((s, r) => s + r.them, 0);

  // تحميل الإعدادات من التخزين المحلي بعد التثبيت لمنع تعارض الهيدريشن
  useEffect(() => {
    setMounted(true);
    const savedStyle = localStorage.getItem("play_calc_style");
    if (savedStyle === "CLASSIC" || savedStyle === "ADVANCED") {
      setCalcStyle(savedStyle);
    }

    const savedMode = localStorage.getItem("play_mode");
    if (savedMode === "عادي" || savedMode === "مشدود") {
      setMode(savedMode);
    }



    const savedTts = localStorage.getItem("play_tts");
    if (savedTts !== null) {
      setTtsOn(savedTts !== "off");
    }

    const savedNarration = localStorage.getItem("play_narration_mode");
    if (savedNarration === "both" || savedNarration === "round" || savedNarration === "total") {
      setNarrationMode(savedNarration);
    }

    // أسماء اللاعبين
    const cleanName = (val: string | null) => {
      if (!val) return "";
      const t = val.trim();
      if (
        t === "اللاعب الأول" ||
        t === "اللاعب الثاني" ||
        t === "لاعب 1" ||
        t === "لاعب 2" ||
        t === "لاعب 3" ||
        t === "لاعب 4"
      ) {
        return "";
      }
      return t;
    };

    const savedUsP1 = cleanName(localStorage.getItem("play_us_p1"));
    const savedUsP2 = cleanName(localStorage.getItem("play_us_p2"));
    const savedThemP1 = cleanName(localStorage.getItem("play_them_p1"));
    const savedThemP2 = cleanName(localStorage.getItem("play_them_p2"));

    setUsP1(savedUsP1);
    setUsP2(savedUsP2);
    setThemP1(savedThemP1);
    setThemP2(savedThemP2);
  }, []);

  // تعديل الإعدادات وحفظها
  const updateStyle = (style: "CLASSIC" | "ADVANCED") => {
    setCalcStyle(style);
    localStorage.setItem("play_calc_style", style);
    resetGame();
  };

  const updateMode = (m: "عادي" | "مشدود") => {
    setMode(m);
    localStorage.setItem("play_mode", m);
    resetGame();
  };



  const updateTts = (sound: boolean) => {
    setTtsOn(sound);
    localStorage.setItem("play_tts", sound ? "on" : "off");
    if (!sound) stopNarration();
  };

  const updateNarrationMode = (nm: "both" | "round" | "total") => {
    setNarrationMode(nm);
    localStorage.setItem("play_narration_mode", nm);
  };

  // نطق النشرة الصوتية
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const playTokenRef = useRef(0);
  const voicePackRef = useRef<Record<string, string>>({});
  const winKeysRef = useRef<string[]>([]);

  // محاولة جلب الباقة الصوتية الخاصة باليوزر في حال كان مسجلاً دخول مسبقاً
  useEffect(() => {
    fetch("/api/voice-pack")
      .then((r) => r.json())
      .then((d) => {
        voicePackRef.current = d?.clips ?? {};
        winKeysRef.current = Array.isArray(d?.winKeys) ? d.winKeys : [];
      })
      .catch(() => {});
  }, []);

  function stopNarration() {
    playTokenRef.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }

  function playClip(key: string, token: number): Promise<void> {
    return new Promise((resolve) => {
      if (token !== playTokenRef.current) return resolve();
      const uri = voicePackRef.current[key];
      if (uri) {
        const audio = new Audio(uri);
        currentAudioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const text = CLIP_TEXT[key] ?? "";
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ar-SA";
        u.rate = 0.95;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      } else {
        resolve();
      }
    });
  }

  async function speakRound(t1: number, t2: number, total1: number, total2: number) {
    if (!ttsOn) return;
    const token = ++playTokenRef.current;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    // المرحلة ١: نطق الجولة
    if (narrationMode !== "total") {
      const seq = scoreSequence(t1, t2);
      for (const key of seq) {
        if (token !== playTokenRef.current) return;
        await playClip(key, token);
      }
    }

    // المرحلة ٢: نطق المجموع
    if (narrationMode !== "round") {
      if (narrationMode === "both") {
        await new Promise((r) => setTimeout(r, 900));
      }
      if (!ttsOn || token !== playTokenRef.current) return;
      const seq = totalSequence(total1, total2);
      for (const key of seq) {
        if (token !== playTokenRef.current) return;
        await playClip(key, token);
      }
    }
  }

  // تشغيل الاحتفالية عند الفوز
  function playWinCelebration() {
    const keys = winKeysRef.current;
    if (keys.length > 0) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      const audio = new Audio(`/api/voice-clip?key=${key}`);
      currentAudioRef.current = audio;
      audio.play().catch(() => {});
    } else {
      playCelebration();
    }
  }

  useEffect(() => {
    if (winner !== null) {
      stopNarration();
      setTimeout(() => playWinCelebration(), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const selectSide = (side: "us" | "them") => {
    setActiveSide(side);
    if (side === "us") {
      setTimeout(() => usInputRef.current?.focus(), 30);
    } else {
      setTimeout(() => themInputRef.current?.focus(), 30);
    }
  };

  const clickChip = (val: number) => {
    if (activeSide === "us") setUsInput(String(val));
    else if (activeSide === "them") setThemInput(String(val));
  };

  const record = () => {
    const us = Number(usInput) || 0;
    const them = Number(themInput) || 0;
    if (us === 0 && them === 0) return;

    const nextRoundNumber = rounds.length + 1;
    const newRounds = [...rounds, { n: nextRoundNumber, us, them }];
    setRounds(newRounds);
    setUsInput("");
    setThemInput("");
    setActiveSide(null);

    const newUs = startScore + newRounds.reduce((s, r) => s + r.us, 0);
    const newThem = startScore + newRounds.reduce((s, r) => s + r.them, 0);

    const checkWin = getWinner(newUs, newThem, targetScore);
    if (checkWin !== null) {
      setWinner(checkWin === 1 ? "us" : "them");
    } else {
      speakRound(us, them, newUs, newThem);
    }
  };

  const undo = () => {
    if (rounds.length === 0) return;
    setRounds((r) => r.slice(0, -1));
    setWinner(null);
    stopNarration();
  };

  const deleteRound = (roundNum: number) => {
    const filtered = rounds.filter((r) => r.n !== roundNum);
    // إعادة تسلسل أرقام الجولات لتكون متتالية من 1 إلى N
    const updated = filtered.map((r, i) => ({
      n: i + 1,
      us: r.us,
      them: r.them,
    }));
    setRounds(updated);
    setWinner(null);
    stopNarration();

    const newUs = startScore + updated.reduce((s, r) => s + r.us, 0);
    const newThem = startScore + updated.reduce((s, r) => s + r.them, 0);
    const checkWin = getWinner(newUs, newThem, targetScore);
    if (checkWin !== null) {
      setWinner(checkWin === 1 ? "us" : "them");
    }
  };

  const resetGame = () => {
    setRounds([]);
    setUsInput("");
    setThemInput("");
    setClassicUs("");
    setClassicThem("");
    setClassicOpen(false);
    setActiveSide(null);
    setWinner(null);
    stopNarration();
  };

  const openNameEdit = (side: "us" | "them") => {
    setEditingName(side);
  };

  const saveNames = (p1: string, p2: string) => {
    const trimmedP1 = p1.trim();
    const trimmedP2 = p2.trim();

    const clean = (t: string) => {
      if (
        t === "اللاعب الأول" ||
        t === "اللاعب الثاني" ||
        t === "لاعب 1" ||
        t === "لاعب 2" ||
        t === "لاعب 3" ||
        t === "لاعب 4"
      ) {
        return "";
      }
      return t;
    };

    const finalP1 = clean(trimmedP1);
    const finalP2 = clean(trimmedP2);

    if (editingName === "us") {
      setUsP1(finalP1);
      setUsP2(finalP2);
      localStorage.setItem("play_us_p1", finalP1);
      localStorage.setItem("play_us_p2", finalP2);
    } else {
      setThemP1(finalP1);
      setThemP2(finalP2);
      localStorage.setItem("play_them_p1", finalP1);
      localStorage.setItem("play_them_p2", finalP2);
    }
    setEditingName(null);
  };

  const newestFirst = useMemo(() => {
    return [...rounds].sort((a, b) => b.n - a.n);
  }, [rounds]);

  const diff = Math.abs(usTotal - themTotal);
  const lead = usTotal === themTotal ? null : usTotal > themTotal ? 1 : 2;

  if (!mounted) return null;

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
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
        >
          <SettingsIcon size={16} strokeWidth={2.2} />
        </button>
        <h1 className="text-lg font-black tracking-wide">
          {calcStyle === "ADVANCED" ? "حاسبة بلوت متقدمة" : "حاسبة - كلاسيك"}
        </h1>
        <button
          onClick={resetGame}
          className="w-9 h-9 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
        >
          <RotateCcw size={16} strokeWidth={2.2} />
        </button>
      </div>

      {/* ========================================================== */}
      {/* ستايل الحاسبة المتقدمة */}
      {/* ========================================================== */}
      {calcStyle === "ADVANCED" && (
        <div className="max-w-lg mx-auto">
          {/* ===== Scores ===== */}
          <div className="grid grid-cols-2 gap-4 px-6 mt-8 mb-2">
            {/* لنا */}
            <div className="text-center">
              <button
                onClick={() => openNameEdit("us")}
                className="flex flex-col items-center mx-auto text-[#f5b042] transition"
              >
                <span className="text-xl font-bold hover:opacity-80 flex items-center gap-1.5">
                  لنا
                  <Pencil size={13} className="opacity-40" />
                </span>
                {(usP1 || usP2) && (
                  <span className="text-xs text-[#f5b042] mt-1">
                    {[usP1, usP2].filter(Boolean).join(" + ")}
                  </span>
                )}
              </button>
              <div
                className="leading-none font-black text-white mt-1"
                style={{ fontSize: "clamp(5rem,20vw,7rem)" }}
              >
                {usTotal}
              </div>
              {usTotal >= targetScore && (
                <div className="text-[#f5b042] text-sm font-bold mt-1">🏆 فاز!</div>
              )}
            </div>

            {/* لهم */}
            <div className="text-center">
              <button
                onClick={() => openNameEdit("them")}
                className="flex flex-col items-center mx-auto text-white transition"
              >
                <span className="text-xl font-bold hover:opacity-80 flex items-center gap-1.5">
                  لهم
                  <Pencil size={13} className="opacity-40" />
                </span>
                {(themP1 || themP2) && (
                  <span className="text-xs text-white/50 mt-1">
                    {[themP1, themP2].filter(Boolean).join(" + ")}
                  </span>
                )}
              </button>
              <div
                className="leading-none font-black text-white mt-1"
                style={{ fontSize: "clamp(5rem,20vw,7rem)" }}
              >
                {themTotal}
              </div>
              {themTotal >= targetScore && (
                <div className="text-amber-400 text-sm font-bold mt-1">🏆 فاز!</div>
              )}
            </div>
          </div>

          {/* ===== Input Row ===== */}
          <div className="px-5 mt-6 grid grid-cols-[1fr_2.4fr_1fr] gap-2.5">
            {/* لنا */}
            <label
              onClick={() => selectSide("us")}
              className={`h-16 rounded-2xl bg-black flex items-center justify-center transition cursor-text ${
                activeSide === "us"
                  ? "border-2 border-amber-400"
                  : "border border-white/15"
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
                placeholder="لنا"
                className="w-full h-full text-center bg-transparent text-white text-2xl font-bold tabular-nums outline-none placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
              />
            </label>

            {/* سجل */}
            <button
              onClick={record}
              disabled={!usInput && !themInput}
              className="h-16 rounded-2xl border border-white/15 bg-black hover:bg-white/[0.03] disabled:opacity-40 flex items-center justify-center"
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
            <label
              onClick={() => selectSide("them")}
              className={`h-16 rounded-2xl bg-black flex items-center justify-center transition cursor-text ${
                activeSide === "them"
                  ? "border-2 border-amber-400"
                  : "border border-white/15"
              }`}
            >
              <input
                ref={themInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={themInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setThemInput(val);
                  setActiveSide("them");
                }}
                onFocus={() => setActiveSide("them")}
                onKeyDown={(e) => e.key === "Enter" && record()}
                placeholder="لهم"
                className="w-full h-full text-center bg-transparent text-white text-2xl font-bold tabular-nums outline-none placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
              />
            </label>
          </div>

          {/* ===== Chips ===== */}
          <div
            className={`flex items-center justify-center gap-3 mt-5 transition-all duration-300 ${
              activeSide
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden"
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

          {/* ===== Rounds History ===== */}
          {rounds.length > 0 && (
            <div className="px-4 mt-6 mb-4">
              <div className="bg-[#0d0d0d] rounded-2xl border border-white/5 overflow-hidden">
                {/* عناوين */}
                <div className="grid grid-cols-[1fr_2fr_2fr_1fr] px-5 py-2 text-white/50 text-xs items-center">
                  <div className="text-right">#</div>
                  <div className="text-center">لنا</div>
                  <div className="text-center">لهم</div>
                  <div className="text-left">حذف</div>
                </div>

                {/* الجولات */}
                {(showHistory ? newestFirst : newestFirst.slice(0, 2)).map((r) => (
                  <div
                    key={r.n}
                    className="grid grid-cols-[1fr_2fr_2fr_1fr] px-5 py-2.5 text-base border-t border-white/5 items-center"
                  >
                    <div className="text-right tabular-nums text-white/40 text-sm">{r.n}</div>
                    <div className="text-center tabular-nums text-amber-400 font-bold">{r.us}</div>
                    <div className="text-center tabular-nums text-white font-bold">{r.them}</div>
                    <div className="text-left">
                      <button
                        onClick={() => setRoundToDelete(r)}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-white/5 transition inline-flex items-center justify-center"
                        title="حذف الجولة"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
        </div>
      )}

      {/* ========================================================== */}
      {/* ستايل الحاسبة العادية (كلاسيك) */}
      {/* ========================================================== */}
      {calcStyle === "CLASSIC" && (
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="bg-[#15151c] rounded-3xl p-6 border border-white/10 mt-6 shadow-xl">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {/* لنا (يمين) */}
              <div className={`text-center rounded-2xl p-3 ${winner === "them" ? "opacity-50" : ""}`}>
                <button
                  onClick={() => openNameEdit("us")}
                  className="flex flex-col items-center mx-auto text-[#f5b042] transition"
                >
                  <span className="text-sm font-bold hover:opacity-80 flex items-center gap-1">
                    لنا
                    <Pencil size={11} className="opacity-40" />
                  </span>
                  {(usP1 || usP2) && (
                    <span className="text-[10px] text-[#f5b042] mt-1">
                      {[usP1, usP2].filter(Boolean).join(" + ")}
                    </span>
                  )}
                </button>
                <div
                  className={`text-5xl sm:text-7xl font-black mt-2 ${
                    winner === "us" ? "text-gold" : "text-[#f5b042]"
                  }`}
                >
                  {usTotal}
                </div>
              </div>

              {/* مربع الفرق */}
              <div className="flex flex-col items-center justify-center">
                {diff === 0 ? (
                  <div className="bg-[#1f1f29] rounded-2xl px-3 py-4 text-center border border-white/10 self-center">
                    <div className="text-[10px] text-white/40 mb-1">الفرق</div>
                    <div className="text-2xl text-white/50">=</div>
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl px-3 py-4 text-center self-center shadow-lg transition-all ${
                      lead === 1
                        ? "bg-gradient-to-b from-[#f5b042]/20 to-[#f5b042]/5 border border-[#f5b042]/30 shadow-[#f5b042]/10"
                        : "bg-gradient-to-b from-white/10 to-white/5 border border-white/15 shadow-white/5"
                    }`}
                  >
                    <div className="text-[10px] text-white/40 mb-1">الفرق</div>
                    <div
                      className={`text-2xl md:text-3xl font-black ${
                        lead === 1 ? "text-[#f5b042]" : "text-white"
                      }`}
                    >
                      {diff}
                    </div>
                    <div className="text-[10px] text-white/60 mt-1">
                      {lead === 1 ? "لنا →" : "← لهم"}
                    </div>
                  </div>
                )}
              </div>

              {/* لهم (يسار) */}
              <div className={`text-center rounded-2xl p-3 ${winner === "us" ? "opacity-50" : ""}`}>
                <button
                  onClick={() => openNameEdit("them")}
                  className="flex flex-col items-center mx-auto text-white transition"
                >
                  <span className="text-sm font-bold hover:opacity-80 flex items-center gap-1 text-white/80">
                    لهم
                    <Pencil size={11} className="opacity-40" />
                  </span>
                  {(themP1 || themP2) && (
                    <span className="text-[10px] text-white/40 mt-1">
                      {[themP1, themP2].filter(Boolean).join(" + ")}
                    </span>
                  )}
                </button>
                <div
                  className={`text-5xl sm:text-7xl font-black mt-2 ${
                    winner === "them" ? "text-gold" : "text-white"
                  }`}
                >
                  {themTotal}
                </div>
              </div>
            </div>

            {winner !== null && (
              <div className="mt-4 text-center bg-gold/20 text-gold rounded-xl py-3 font-bold text-lg">
                🏆 الفوز للفريق {winner === "us" ? (usP1 || usP2 ? [usP1, usP2].filter(Boolean).join(" و ") : "لنا") : (themP1 || themP2 ? [themP1, themP2].filter(Boolean).join(" و ") : "لهم")}
              </div>
            )}
          </div>

          {/* نموذج إدخال الجولات - كلاسيك - معروض مباشرة وبدون المجموع */}
          {!winner && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const t1 = Number(classicUs) || 0;
                const t2 = Number(classicThem) || 0;
                if (t1 === 0 && t2 === 0) return;

                const nextRoundNumber = rounds.length + 1;
                const newRounds = [...rounds, { n: nextRoundNumber, us: t1, them: t2 }];
                setRounds(newRounds);
                setClassicUs("");
                setClassicThem("");

                const newUs = startScore + newRounds.reduce((s, r) => s + r.us, 0);
                const newThem = startScore + newRounds.reduce((s, r) => s + r.them, 0);

                const checkWin = getWinner(newUs, newThem, targetScore);
                if (checkWin !== null) {
                  setWinner(checkWin === 1 ? "us" : "them");
                } else {
                  speakRound(t1, t2, newUs, newThem);
                }

                // إعادة التركيز لخانة "لنا" مباشرة لتسجيل الجولة التالية
                setTimeout(() => classicUsRef.current?.focus(), 50);
              }}
              className="bg-[#15151c] rounded-2xl p-5 border border-white/10 space-y-4 text-right mt-6"
            >
              <div className="grid grid-cols-2 gap-4">
                {/* لنا */}
                <div>
                  <label className="block text-sm mb-2 text-[#f5b042] text-center">لنا</label>
                  <input
                    ref={classicUsRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={classicUs}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setClassicUs(val);
                      if (val.length >= 2) {
                        setTimeout(() => classicThemRef.current?.focus(), 30);
                      }
                    }}
                    className="w-full bg-[#1f1f29] border border-white/10 rounded-xl px-4 py-4 text-3xl text-center font-bold text-[#f5b042] outline-none focus:border-[#f5b042]/50"
                    placeholder="0"
                  />
                </div>
                {/* لهم */}
                <div>
                  <label className="block text-sm mb-2 text-white/80 text-center">لهم</label>
                  <input
                    ref={classicThemRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={classicThem}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setClassicThem(val);
                    }}
                    className="w-full bg-[#1f1f29] border border-white/10 rounded-xl px-4 py-4 text-3xl text-center font-bold text-white outline-none focus:border-white/30"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-sm font-black shadow-lg shadow-orange-500/10"
                >
                  سجّل الجولة
                </button>
              </div>
            </form>
          )}

          {/* جولات كلاسيكية */}
          {rounds.length > 0 && (
            <div className="space-y-3">
              <div className="bg-[#15151c] rounded-2xl border border-white/10 overflow-hidden mt-6 shadow-md">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-white/60 text-xs">
                    <tr>
                      <th className="py-2 text-right pr-4">#</th>
                      <th className="py-2 text-center">لنا</th>
                      <th className="py-2 text-center">لهم</th>
                      <th className="py-2 text-left pl-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-center text-base">
                    {newestFirst.slice(0, 2).map((r) => (
                      <tr key={r.n} className="hover:bg-white/[0.02] items-center">
                        <td className="py-2.5 text-white/40 text-sm text-right pr-4">{r.n}</td>
                        <td className="py-2.5 font-bold text-[#f5b042] text-center">{r.us}</td>
                        <td className="py-2.5 font-bold text-white text-center">{r.them}</td>
                        <td className="py-2.5 text-left pl-4">
                          <button
                            type="button"
                            onClick={() => setRoundToDelete(r)}
                            className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-white/5 transition inline-flex items-center justify-center"
                            title="حذف الجولة"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* سهم للإظهار بنافذة مستقلة */}
                {rounds.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowClassicRoundsOverlay(true)}
                    className="w-full flex items-center justify-center py-2.5 border-t border-white/5 text-white/40 hover:text-white/70 hover:bg-white/5 transition"
                    title="عرض كل الجولات"
                  >
                    <ChevronDown size={18} strokeWidth={2} />
                  </button>
                )}
              </div>

              {/* تراجع كلاسيكي - أحمر وتأكيدي */}
              {!winner && (
                <button
                  type="button"
                  onClick={() => setShowUndoConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 text-sm font-semibold transition"
                >
                  <Undo2 size={15} strokeWidth={2} />
                  تراجع عن آخر جولة
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== فاز overlay ===== */}
      {winner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#111] border border-amber-500/30 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-2xl font-black text-amber-400 mb-2">
              {winner === "us" ? (usP1 || usP2 ? [usP1, usP2].filter(Boolean).join(" و ") : "لنا") : (themP1 || themP2 ? [themP1, themP2].filter(Boolean).join(" و ") : "لهم")}
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

      {/* ===== تعديل أسماء اللاعبين ===== */}
      {editingName && (
        <NameEditModal
          side={editingName}
          p1={editingName === "us" ? usP1 : themP1}
          p2={editingName === "us" ? usP2 : themP2}
          onSave={saveNames}
          onClose={() => setEditingName(null)}
        />
      )}

      {/* ===== تأكيد حذف جولة ===== */}
      {roundToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setRoundToDelete(null)}
          dir="rtl"
        >
          <div
            className="bg-[#171717] border border-white/10 rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-base font-bold text-white mb-2">تأكيد حذف الجولة</h3>
            <p className="text-xs text-white/60 mb-6 leading-relaxed">
              هل أنت متأكد من حذف الجولة رقم {roundToDelete.n}؟
              <br />
              (لنا: {roundToDelete.us} · لهم: {roundToDelete.them})
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRoundToDelete(null)}
                className="py-3 rounded-xl border border-white/15 text-white/60 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteRound(roundToDelete.n);
                  setRoundToDelete(null);
                }}
                className="py-3 rounded-xl bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== إعدادات الحاسبة (Settings Modal) ===== */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-[#171717] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">إعدادات الحاسبة</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-5 text-right">
              {/* ستايل الحاسبة */}
              <div>
                <label className="block text-xs font-bold text-white/50 mb-2">ستايل الحاسبة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateStyle("ADVANCED")}
                    className={`py-3 rounded-xl font-bold text-sm ${
                      calcStyle === "ADVANCED"
                        ? "border-2 border-amber-500 text-amber-400 bg-amber-500/5"
                        : "border border-white/15 text-white/60"
                    }`}
                  >
                    متقدمة (أزرار ونشرة)
                  </button>
                  <button
                    onClick={() => updateStyle("CLASSIC")}
                    className={`py-3 rounded-xl font-bold text-sm ${
                      calcStyle === "CLASSIC"
                        ? "border-2 border-amber-500 text-amber-400 bg-amber-500/5"
                        : "border border-white/15 text-white/60"
                    }`}
                  >
                    عادية (كلاسيك)
                  </button>
                </div>
              </div>

              {/* نوع اللعب */}
              <div>
                <label className="block text-xs font-bold text-white/50 mb-2">نوع اللعب</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateMode("عادي")}
                    className={`py-3 rounded-xl font-bold text-sm ${
                      mode === "عادي"
                        ? "border-2 border-amber-500 text-amber-400 bg-amber-500/5"
                        : "border border-white/15 text-white/60"
                    }`}
                  >
                    عادي (من 0)
                  </button>
                  <button
                    onClick={() => updateMode("مشدود")}
                    className={`py-3 rounded-xl font-bold text-sm ${
                      mode === "مشدود"
                        ? "border-2 border-amber-500 text-amber-400 bg-amber-500/5"
                        : "border border-white/15 text-white/60"
                    }`}
                  >
                    مشدود (من 52)
                  </button>
                </div>
              </div>



              {/* نطق النشرة */}
              <div className="border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">نطق النشرة الصوتية</span>
                  <button
                    onClick={() => updateTts(!ttsOn)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      ttsOn ? "bg-amber-500" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-black absolute top-0.5 transition-all ${
                        ttsOn ? "right-6" : "right-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* طريقة النطق */}
              {ttsOn && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-white/50">طريقة النطق</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "both", label: "الكل" },
                      { key: "round", label: "الجولة" },
                      { key: "total", label: "المجموع" },
                    ].map((n) => (
                      <button
                        key={n.key}
                        onClick={() => updateNarrationMode(n.key as any)}
                        className={`py-2 rounded-xl text-xs font-bold ${
                          narrationMode === n.key
                            ? "border-2 border-amber-500 text-amber-400 bg-amber-500/5"
                            : "border border-white/15 text-white/60"
                        }`}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-6 w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-orange-500/20"
            >
              تم
            </button>
          </div>
        </div>
      )}
      {/* ===== نافذة عرض جولات كلاسيك المستقلة (RoundsOverlay) ===== */}
      {showClassicRoundsOverlay && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowClassicRoundsOverlay(false)}
          dir="rtl"
        >
          <div
            className="bg-[#171717] border border-white/10 rounded-3xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
              <h3 className="text-base font-bold text-white">سجل الجولات ({rounds.length})</h3>
              <button
                onClick={() => setShowClassicRoundsOverlay(false)}
                className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/60 text-xs text-center">
                  <tr>
                    <th className="py-2 text-right pr-4">#</th>
                    <th className="py-2 text-center">لنا</th>
                    <th className="py-2 text-center">لهم</th>
                    <th className="py-2 text-left pl-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-center text-base">
                  {newestFirst.map((r) => (
                    <tr key={r.n} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 text-white/40 text-sm text-right pr-4">{r.n}</td>
                      <td className="py-2.5 font-bold text-[#f5b042] text-center">{r.us}</td>
                      <td className="py-2.5 font-bold text-white text-center">{r.them}</td>
                      <td className="py-2.5 text-left pl-4">
                        <button
                          type="button"
                          onClick={() => {
                            deleteRound(r.n);
                            if (rounds.length <= 3) setShowClassicRoundsOverlay(false);
                          }}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-white/5 transition inline-flex items-center justify-center"
                          title="حذف الجولة"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== تأكيد التراجع عن الجولة ===== */}
      {showUndoConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowUndoConfirm(false)}
          dir="rtl"
        >
          <div
            className="bg-[#171717] border border-white/10 rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-base font-bold text-white mb-2">تأكيد التراجع</h3>
            <p className="text-xs text-white/60 mb-6 leading-relaxed">
              هل أنت متأكد من التراجع وحذف آخر صكة/جولة مسجلة؟
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowUndoConfirm(false)}
                className="py-3 rounded-xl border border-white/15 text-white/60 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  undo();
                  setShowUndoConfirm(false);
                }}
                className="py-3 rounded-xl bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
