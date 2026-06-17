"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  Settings,
  Redo2,
  ArrowLeft,
  X,
  Camera,
  Pencil,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { scoreSequence, totalSequence, CLIP_TEXT } from "@/lib/voice-narration";
import { evaluateScoreCues, TIME_CUE_MS } from "@/lib/voice-cues";
import { getWinner } from "@/lib/baloot";
import {
  recordRoundAction,
  deleteRoundAction,
  abandonGameAction,
  setGamePlayersAction,
  changeGameModeAction,
  createPlayerAction,
} from "./actions";

type Player = { id: string; name: string; imageUrl: string | null };
type Participant = { team: number; player: Player };
type Round = {
  id: string;
  number: number;
  team1Score: number;
  team2Score: number;
};
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

const QUICK_CHIPS = [16, 18, 26, 30];

/** صوت احتفال بسيط مُولَّد بـ Web Audio API */
function playCelebration() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // سلم C ماجور تصاعدي ثم وتر مفتوح
    const notes: [number, number, number, number][] = [
      // [تردد Hz, بداية ث, مدة ث, حجم]
      [523.25, 0.00, 0.13, 0.30],  // C5
      [659.25, 0.12, 0.13, 0.30],  // E5
      [783.99, 0.24, 0.13, 0.30],  // G5
      [1046.5, 0.36, 0.75, 0.32],  // C6 — ممتد
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
    /* AudioContext غير مدعوم */
  }
}

export default function AdvancedGameView({
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
  useEffect(() => setGame(initial), [initial]);

  // ── نطق النشرة ──────────────────────────────────────────────
  const [ttsOn, setTtsOn] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("baloot_tts") !== "off";
  });
  const ttsRef = useRef(ttsOn);

  // محتوى النشرة: both = الجولة + المجموع / round = الجولة فقط / total = المجموع فقط
  type NarrationMode = "both" | "round" | "total";
  const [narrationMode, setNarrationMode] = useState<NarrationMode>(() => {
    if (typeof window === "undefined") return "both";
    const v = localStorage.getItem("baloot_narration");
    return v === "round" || v === "total" ? v : "both";
  });
  const narrationModeRef = useRef(narrationMode);
  function changeNarrationMode(m: NarrationMode) {
    narrationModeRef.current = m;
    setNarrationMode(m);
    localStorage.setItem("baloot_narration", m);
  }

  // الباقة الصوتية بصوت صانع المحتوى (تُجلب مرة عند التحميل)
  const voicePackRef = useRef<Record<string, string>>({});
  const winKeysRef = useRef<string[]>([]); // مفاتيح أغاني الفوز الموجودة
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const playTokenRef = useRef(0);
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
    window.speechSynthesis?.cancel();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }

  function toggleTts() {
    const next = !ttsRef.current;
    ttsRef.current = next;
    setTtsOn(next);
    localStorage.setItem("baloot_tts", next ? "on" : "off");
    if (!next) stopNarration();
  }

  // يشغّل لبنة واحدة: صوت مُسجّل إن وُجد، وإلا الصوت الآلي
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
        const u = new SpeechSynthesisUtterance(CLIP_TEXT[key] ?? "");
        u.lang = "ar-SA";
        u.rate = 0.95;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      } else resolve();
    });
  }

  // يشغّل سلسلة لبنات بالتسلسل (يُلغي أي نطق جارٍ)
  async function playSequence(keys: string[]): Promise<void> {
    stopNarration();
    const token = playTokenRef.current;
    for (const key of keys) {
      if (token !== playTokenRef.current) return;
      await playClip(key, token);
    }
  }

  /** ينطق النشرة حسب الإعداد: الجولة و/أو المجموع */
  async function speakRound(t1: number, t2: number, total1: number, total2: number) {
    if (!ttsRef.current) return;
    const mode = narrationModeRef.current;
    const token = ++playTokenRef.current;
    window.speechSynthesis?.cancel();
    currentAudioRef.current?.pause();

    // المرحلة ١: نتيجة الجولة (لنا/لهم) — تُتخطّى في وضع «المجموع فقط»
    if (mode !== "total") {
      for (const key of scoreSequence(t1, t2)) {
        if (token !== playTokenRef.current) return;
        await playClip(key, token);
      }
    }

    // المرحلة ٢: المجموع الكلي — تُتخطّى في وضع «الجولة فقط»
    if (mode !== "round") {
      if (mode === "both") await new Promise((r) => setTimeout(r, 900));
      if (!ttsRef.current || token !== playTokenRef.current) return;
      for (const key of totalSequence(total1, total2)) {
        if (token !== playTokenRef.current) return;
        await playClip(key, token);
      }
    }
  }

  /** إعادة سماع النشرة — ينطق المجموع الحالي عند الطلب */
  function replayTotals() {
    playSequence(scoreSequence(game.team1Score, game.team2Score));
  }

  // ── التوجيهات الصوتية ───────────────────────────────────────
  // كل توجيه يشتغل مرة واحدة لكل صكة
  const firedCuesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    firedCuesRef.current = new Set();
  }, [game.id]);

  /** يشغّل مؤثر التوجيه (صوت مُسجّل فقط — بلا صوت آلي) مستقلاً عن النشرة */
  function playCue(key: string) {
    if (firedCuesRef.current.has(key)) return;
    const uri = voicePackRef.current[key];
    if (!uri) return; // لا مؤثر مرفوع لهذا الشرط
    firedCuesRef.current.add(key);
    const audio = new Audio(uri);
    audio.play().catch(() => {});
  }

  // التوجيه الزمني — بعد ١٠ دقائق
  useEffect(() => {
    if (game.status !== "IN_PROGRESS") return;
    const started = new Date(game.startedAt).getTime();
    const check = () => {
      if (Date.now() - started >= TIME_CUE_MS) playCue("cue_time10");
    };
    check();
    const t = setInterval(check, 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.startedAt, game.status]);

  // أغنية الفوز — تُختار عشوائياً من المرفوعة (تُبَثّ من الخادم)، وإلا النغمة المركّبة
  function playWinCelebration() {
    const keys = winKeysRef.current;
    if (keys.length > 0) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      const audio = new Audio(`/api/voice-clip?key=${key}`);
      currentAudioRef.current = audio;
      audio.play().catch(() => {});
    } else {
      playCelebration(); // النغمة الافتراضية المركّبة
    }
  }

  // كشف لحظة الفوز — أوقف النشرة وشغّل أغنية الفوز
  const prevWinnerRef = useRef<number | null>(initial.winner);
  const [showCelebration, setShowCelebration] = useState(false);
  useEffect(() => {
    if (game.winner !== null && prevWinnerRef.current === null) {
      setShowCelebration(true);
      stopNarration(); // يوقف النطق الجاري (النشرة)
      setTimeout(() => playWinCelebration(), 150);
    }
    prevWinnerRef.current = game.winner;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.winner]);

  const [activeSide, setActiveSide] = useState<"us" | "them" | null>(null);
  const [usInput, setUsInput] = useState("");
  const [themInput, setThemInput] = useState("");
  const usInputRef = useRef<HTMLInputElement>(null);
  const themInputRef = useRef<HTMLInputElement>(null);

  // فوكس تلقائي على الحقل النشط
  useEffect(() => {
    if (activeSide === "us") setTimeout(() => usInputRef.current?.focus(), 30);
    else if (activeSide === "them") setTimeout(() => themInputRef.current?.focus(), 30);
  }, [activeSide]);

  const [showSettings, setShowSettings] = useState(false);
  const [showAllRounds, setShowAllRounds] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // أنيميشن تأكيد التسجيل
  const [flashScore, setFlashScore] = useState<{ us: number; them: number; round: number } | null>(null);

  const isOver = game.status !== "IN_PROGRESS";

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

  // النقاط الحية (مع الإدخال أثناء الكتابة)
  const usScore = game.team1Score + (Number(usInput) || 0);
  const themScore = game.team2Score + (Number(themInput) || 0);

  function clickChip(value: number) {
    if (activeSide === "us")        setUsInput(String(value));
    else if (activeSide === "them") setThemInput(String(value));
  }

  function record() {
    if (!activeSide) return;
    setError(null);
    const t1 = Number(usInput) || 0;
    const t2 = Number(themInput) || 0;
    if (t1 === 0 && t2 === 0) {
      setError("أدخل نقاطاً");
      return;
    }

    // حساب رقم الجولة القادمة (لعرضها في الأنيميشن)
    const regularRounds = game.rounds.filter((r) => r.number > 0);
    const hasBase = game.rounds.some((r) => r.number === 0);
    const nextRound =
      regularRounds.length === 0
        ? hasBase ? 2 : 1
        : Math.max(...regularRounds.map((r) => r.number)) + 1;

    startTransition(async () => {
      const res = await recordRoundAction(game.id, t1, t2);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setUsInput("");
      setThemInput("");
      setActiveSide(null);
      // أنيميشن تأكيد التسجيل — يختفي بعد 3 ثواني
      setFlashScore({ us: t1, them: t2, round: nextRound });
      setTimeout(() => setFlashScore(null), 6000);
      const newTotal1 = game.team1Score + t1;
      const newTotal2 = game.team2Score + t2;
      const isWin = getWinner(newTotal1, newTotal2, game.targetScore) !== null;

      if (isWin) {
        // فوز — لا نشرة ولا توجيهات؛ تتكفّل أغنية الفوز (عبر كشف لحظة الفوز)
        stopNarration();
      } else {
        // النشرة أولاً، ثم التوجيهات الصوتية بعد اكتمال نطق المجموع بـ ١٠ ثوانٍ
        const cues = evaluateScoreCues(
          { t1: game.team1Score, t2: game.team2Score },
          { t1: newTotal1, t2: newTotal2 },
        );
        speakRound(t1, t2, newTotal1, newTotal2).then(() => {
          if (cues.length > 0) {
            setTimeout(() => cues.forEach((c) => playCue(c)), 10000);
          }
        });
      }
      router.refresh();
    });
  }

  function undoLast() {
    // تجاهل جولة البداية (مشدود) عند التراجع
    const regularRounds = game.rounds.filter((r) => r.number > 0);
    const last = [...regularRounds].sort((a, b) => b.number - a.number)[0];
    if (!last) return;
    if (
      !confirm(
        `تراجع عن الجولة ${last.number} (لنا ${last.team1Score} / لهم ${last.team2Score})؟`,
      )
    )
      return;
    startTransition(async () => {
      await deleteRoundAction(game.id, last.id);
      router.refresh();
    });
  }

  function exitGame() {
    if (
      confirm(
        "هل تريد الخروج من الصكة؟\nالصكة محفوظة وتقدر ترجع لها لاحقاً.",
      )
    ) {
      router.push("/home");
    }
  }

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden -m-4 md:-m-6 pb-24 md:pb-6"
      style={{
        background: `
          radial-gradient(ellipse 60% 40% at 0% 35%, rgba(60, 60, 80, 0.55) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 100% 35%, rgba(60, 60, 80, 0.55) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 0% 75%, rgba(50, 50, 70, 0.4) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 100% 75%, rgba(50, 50, 70, 0.4) 0%, transparent 60%),
          #000
        `,
      }}
    >
      {/* Top header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          onClick={exitGame}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5"
          title="خروج"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold">
          {game.mode === "MASHDOOD" ? "بلوت — مشدود" : "حاسبة بلوت"}
        </h1>
        <div className="flex items-center gap-2">
          {/* زر تفعيل/إيقاف النطق */}
          <button
            onClick={toggleTts}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition ${
              ttsOn
                ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                : "border-white/15 bg-white/5 text-white/40"
            }`}
            title={ttsOn ? "إيقاف النطق" : "تفعيل النطق"}
          >
            {ttsOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full border border-white/15 bg-white/5 flex items-center justify-center"
            title="الإعدادات"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Timer + undo */}
      <div className="flex items-center justify-between px-6 mt-6">
        {!isOver ? (
          <button
            onClick={undoLast}
            disabled={isPending || game.rounds.filter((r) => r.number > 0).length === 0}
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
          <span className="text-3xl font-medium tabular-nums tracking-wider">
            {elapsed}
          </span>
        </div>

        <div className="w-11 h-11" />
      </div>

      {/* Score Display */}
      <div className="grid grid-cols-2 items-end gap-4 px-6 mt-12 mb-4">
        <ScoreSide
          label="لنا"
          players={team1}
          score={usScore}
          isWinner={game.winner === 1}
          isOurs
          flashing={!!usInput && activeSide === "us"}
          onReplay={replayTotals}
        />
        <ScoreSide
          label="لهم"
          players={team2}
          score={themScore}
          isWinner={game.winner === 2}
          flashing={!!themInput && activeSide === "them"}
          onReplay={replayTotals}
        />
      </div>

      {/* Winner banner */}
      {game.winner !== null && (
        <div className="mx-5 mt-2 text-center bg-gold/20 text-gold rounded-2xl py-3 font-bold text-lg">
          🏆 الفوز للفريق {game.winner === 1 ? "لنا" : "لهم"}
        </div>
      )}
      {game.status === "ABANDONED" && (
        <div className="mx-5 mt-2 text-center bg-white/10 text-white/60 rounded-2xl py-3 text-sm">
          ألغيت الصكة
        </div>
      )}

      {/* 3 boxes */}
      {!isOver && (
        <>
          <div className="px-5 mt-8 grid grid-cols-[1fr_2.5fr_1fr] gap-2.5">

            {/* لنا */}
            <label
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
              disabled={isPending || (!usInput && !themInput)}
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
                {isPending ? "..." : "سجل"}
              </span>
            </button>

            {/* لهم */}
            <label
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
                  setThemInput(e.target.value.replace(/\D/g, ""));
                  setActiveSide("them");
                }}
                onFocus={() => setActiveSide("them")}
                onKeyDown={(e) => e.key === "Enter" && record()}
                placeholder="لهم"
                className="w-full h-full text-center bg-transparent text-white text-2xl font-bold tabular-nums outline-none placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
              />
            </label>

          </div>

          {/* Quick chips — تظهر فقط عند تنشيط أحد الحقلين */}
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
            <div className="mx-5 mt-3 bg-danger/20 text-red-300 text-sm rounded-xl p-3">
              {error}
            </div>
          )}
        </>
      )}

      {/* Rounds preview at bottom */}
      <RoundsPreview
        rounds={game.rounds}
        onExpand={() => setShowAllRounds(true)}
      />

      {showAllRounds && (
        <RoundsOverlay
          gameId={game.id}
          rounds={game.rounds}
          isOver={isOver}
          onClose={() => setShowAllRounds(false)}
          onChanged={() => router.refresh()}
        />
      )}

      {/* Floating "advanced" tag */}
      <div className="fixed top-3 right-3 bg-gold/20 text-gold text-[10px] font-bold px-2 py-1 rounded-full z-30 border border-gold/30">
        متقدمة
      </div>

      {/* أنيميشن الفوز */}
      {showCelebration && game.winner !== null && (
        <WinCelebration
          winner={game.winner}
          team1={team1}
          team2={team2}
          team1Score={game.team1Score}
          team2Score={game.team2Score}
          onViewRounds={() => { setShowCelebration(false); setShowAllRounds(true); }}
          onSettings={() => { setShowCelebration(false); setShowSettings(true); }}
          onNewGame={() => router.push("/games/new")}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* أنيميشن تأكيد تسجيل الجولة */}
      {flashScore && (
        <ScoreFlash
          us={flashScore.us}
          them={flashScore.them}
          round={flashScore.round}
        />
      )}

      {showSettings && (
        <SettingsModal
          gameId={game.id}
          gameMode={game.mode}
          team1={team1}
          team2={team2}
          allPlayers={allPlayers}
          tvCode={tvCode}
          tvUrl={tvUrl}
          ttsOn={ttsOn}
          onToggleTts={toggleTts}
          narrationMode={narrationMode}
          onNarrationMode={changeNarrationMode}
          onClose={() => setShowSettings(false)}
          onAbandon={() => {
            if (confirm("إلغاء الصكة الحالية؟")) {
              startTransition(async () => {
                await abandonGameAction(game.id);
                router.refresh();
              });
            }
          }}
          onModeChange={(mode) => setGame((g) => ({ ...g, mode }))}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function ScoreSide({
  label,
  players,
  score,
  isWinner,
  isOurs = false,
  flashing,
  onReplay,
}: {
  label: string;
  players: Player[];
  score: number;
  isWinner: boolean;
  isOurs?: boolean;
  flashing: boolean;
  onReplay?: () => void;
}) {
  return (
    <div className={`text-center transition ${flashing ? "scale-105" : ""}`}>
      <div className="flex items-center justify-center gap-4 mb-3 min-h-14">
        {players.map((p) => (
          <PlayerAvatar
            key={p.id}
            name={p.name}
            imageUrl={p.imageUrl}
            size="sm"
            className="scale-[1.45]"
          />
        ))}
      </div>
      <div className={`text-xl font-medium mb-1 ${isOurs ? "text-gold" : "text-white/95"}`}>
        {label}
      </div>
      <button
        type="button"
        onClick={onReplay}
        title="اضغط لإعادة سماع النشرة"
        key={score}
        className={`block w-full text-[6.5rem] sm:text-[7.5rem] leading-none font-black select-none cursor-pointer transition active:scale-95 ${
          isWinner || isOurs ? "text-gold" : "text-white"
        }`}
      >
        {score}
      </button>
    </div>
  );
}

// ============================================================
// أنيميشن الفوز
// ============================================================

const CONFETTI_COLORS = ["#f5b042","#ff5e3a","#4ecdc4","#a29bfe","#fd79a8","#55efc4","#fdcb6e"];
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
  winner, team1, team2, team1Score, team2Score,
  onViewRounds, onSettings, onNewGame, onClose,
}: {
  winner: number;
  team1: Player[];
  team2: Player[];
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

  const winners = winner === 1 ? team1 : team2;
  const label   = winner === 1 ? "لنا" : "لهم";

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

      {/* خلفية */}
      <div className="absolute inset-0 bg-black/88 backdrop-blur-sm" />

      {/* فقاعات الكونفيتي */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {CONFETTI.map(p => (
          <div
            key={p.id}
            className="absolute bottom-0"
            style={{
              left: `${p.left}%`,
              width:  p.size,
              height: p.size,
              background: p.circle ? p.color : undefined,
              border: !p.circle ? `${Math.ceil(p.size/2)}px solid ${p.color}` : undefined,
              borderRadius: p.circle ? "50%" : "2px",
              animation: `cRise ${p.dur}s ease-out ${p.delay}s 3 forwards`,
            }}
          />
        ))}
      </div>

      {/* المحتوى */}
      <div className="relative z-10 text-center px-8" style={{ animation: "cPop 1.8s ease-in-out 4" }}>
        <div className="text-7xl mb-3">🏆</div>
        <div className="text-3xl sm:text-4xl font-black mb-1 text-gold">
          فوز فريق {label}!
        </div>
        <div className="text-white/50 text-xl mb-6 tabular-nums">
          {team1Score} — {team2Score}
        </div>
        <div className="flex justify-center gap-5">
          {winners.map(p => (
            <div key={p.id} className="flex flex-col items-center gap-2">
              <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="xl" />
              <span className="text-white/80 text-sm">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* أزرار الخيارات — تظهر بعد ٣.٥ ثانية */}
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
          <button
            onClick={onNewGame}
            className="w-full h-14 rounded-2xl btn-grad font-bold text-lg"
          >
            🎮 صكة جديدة
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

function RoundsPreview({
  rounds,
  onExpand,
}: {
  rounds: Round[];
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
          <div className="text-center">لنا</div>
          <div className="text-left">لهم</div>
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
  gameId,
  rounds,
  isOver,
  onClose,
  onChanged,
}: {
  gameId: string;
  rounds: Round[];
  isOver: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  // جولة البداية (مشدود) تظهر أولاً، ثم الجولات العادية تصاعدياً
  const ascending = [...rounds].sort((a, b) => a.number - b.number);
  const regularCount = rounds.filter((r) => r.number > 0).length;

  function del(roundId: string, n: number) {
    if (!confirm(`حذف الجولة ${n}؟`)) return;
    startTransition(async () => {
      await deleteRoundAction(gameId, roundId);
      onChanged();
    });
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
          <div className="text-center">لنا</div>
          <div className="text-center">لهم</div>
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
                    disabled={isPending}
                    onClick={() => del(r.id, r.number)}
                    className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition disabled:opacity-30"
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
}: {
  us: number;
  them: number;
  round: number;
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
        {/* رقم الجولة + علامة ✓ */}
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

        {/* النقاط */}
        <div className="flex items-end justify-center gap-8">
          <div className="text-center">
            <div className="text-sm text-white/35 mb-1 tracking-wide">لنا</div>
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
            <div className="text-sm text-white/35 mb-1 tracking-wide">لهم</div>
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

function TimerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect
        x="9"
        y="2"
        width="6"
        height="2"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M16 6l1.5-1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="14" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 10v4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================================
// Settings Modal with tabs
// ============================================================

type SettingsTab = "general" | "us" | "them";

function SettingsModal({
  gameId,
  gameMode,
  team1,
  team2,
  allPlayers,
  tvCode,
  tvUrl,
  ttsOn,
  onToggleTts,
  narrationMode,
  onNarrationMode,
  onClose,
  onAbandon,
  onModeChange,
  onChanged,
}: {
  gameId: string;
  gameMode: "NORMAL" | "MASHDOOD";
  team1: Player[];
  team2: Player[];
  allPlayers: Player[];
  tvCode: string | null;
  tvUrl: string | null;
  ttsOn: boolean;
  onToggleTts: () => void;
  narrationMode: "both" | "round" | "total";
  onNarrationMode: (m: "both" | "round" | "total") => void;
  onClose: () => void;
  onAbandon: () => void;
  onModeChange: (mode: "NORMAL" | "MASHDOOD") => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<SettingsTab>("general");

  // نوع الصكة — قابل للتبديل
  const [localMode, setLocalMode] = useState<"NORMAL" | "MASHDOOD">(gameMode);
  const [modeLoading, setModeLoading] = useState(false);

  // قائمة اللاعبين مع إمكانية إضافة جديد
  const [localPlayers, setLocalPlayers] = useState<Player[]>(allPlayers);

  // اختيار اللاعبين
  const initialPick = useMemo(
    () => ({
      t1p1: team1[0]?.id ?? "",
      t1p2: team1[1]?.id ?? "",
      t2p1: team2[0]?.id ?? "",
      t2p2: team2[1]?.id ?? "",
    }),
    [team1, team2],
  );

  const [t1p1, setT1p1] = useState(initialPick.t1p1);
  const [t1p2, setT1p2] = useState(initialPick.t1p2);
  const [t2p1, setT2p1] = useState(initialPick.t2p1);
  const [t2p2, setT2p2] = useState(initialPick.t2p2);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    t1p1 !== initialPick.t1p1 ||
    t1p2 !== initialPick.t1p2 ||
    t2p1 !== initialPick.t2p1 ||
    t2p2 !== initialPick.t2p2;

  async function toggleMode(mode: "NORMAL" | "MASHDOOD") {
    if (mode === localMode || modeLoading) return;
    setModeLoading(true);
    setError(null);
    try {
      const res = await changeGameModeAction(gameId, mode);
      if (res.ok) {
        setLocalMode(mode);
        onModeChange(mode);
        onChanged(); // تحديث النقاط والجولات بعد تغيير النوع
      } else {
        setError(res.error);
      }
    } catch {
      setError("فشل تغيير نوع الصكة");
    } finally {
      setModeLoading(false);
    }
  }

  function savePlayers() {
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
      if (!res.ok) { setError(res.error); return; }
      onChanged();
      onClose();
    });
  }

  function handleNewPlayer(player: Player) {
    setLocalPlayers((prev) => [...prev, player]);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-3 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#171717] rounded-3xl border border-white/10 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
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

        {/* Tabs */}
        <div className="grid grid-cols-3 mx-5 bg-white/[0.04] rounded-xl p-1 border border-white/5">
          <TabBtn active={tab === "general"} onClick={() => setTab("general")}>عام</TabBtn>
          <TabBtn active={tab === "us"} onClick={() => setTab("us")}>لنا</TabBtn>
          <TabBtn active={tab === "them"} onClick={() => setTab("them")}>لهم</TabBtn>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ===== تاب عام ===== */}
          {tab === "general" && (
            <div className="space-y-4">

              {/* نوع الصكة — toggle */}
              <div>
                <div className="text-xs text-white/60 mb-2">نوع الصكة</div>
                <div className="grid grid-cols-2 bg-white/[0.04] rounded-xl p-1 border border-white/5">
                  <button
                    onClick={() => toggleMode("NORMAL")}
                    disabled={modeLoading}
                    className={`h-10 rounded-lg text-sm font-bold transition ${
                      localMode === "NORMAL"
                        ? "bg-orange-500 text-white shadow"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    عادي
                  </button>
                  <button
                    onClick={() => toggleMode("MASHDOOD")}
                    disabled={modeLoading}
                    className={`h-10 rounded-lg text-sm font-bold transition ${
                      localMode === "MASHDOOD"
                        ? "bg-orange-500 text-white shadow"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    مشدود
                  </button>
                </div>
              </div>

              {/* النشرة الصوتية */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-white/60">النشرة الصوتية</div>
                  <button
                    onClick={onToggleTts}
                    className={`text-xs px-3 py-1 rounded-lg font-bold transition ${
                      ttsOn ? "bg-orange-500 text-white" : "bg-white/10 text-white/50"
                    }`}
                  >
                    {ttsOn ? "🔊 مفعّلة" : "🔇 متوقفة"}
                  </button>
                </div>
                {ttsOn && (
                  <div className="grid grid-cols-3 bg-white/[0.04] rounded-xl p-1 border border-white/5">
                    {([
                      { v: "both", t: "الجولة + المجموع" },
                      { v: "round", t: "الجولة فقط" },
                      { v: "total", t: "المجموع فقط" },
                    ] as const).map((o) => (
                      <button
                        key={o.v}
                        onClick={() => onNarrationMode(o.v)}
                        className={`h-9 rounded-lg text-[11px] font-bold transition px-1 ${
                          narrationMode === o.v
                            ? "bg-orange-500 text-white shadow"
                            : "text-white/50 hover:text-white"
                        }`}
                      >
                        {o.t}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-white/30 mt-1">يُحفظ ويُطبّق على كل النشرات القادمة</p>
              </div>

              {/* كود التلفزيون */}
              {tvCode && tvUrl && (
                <div>
                  <div className="text-xs text-white/60 mb-1">كود شاشة التلفزيون</div>
                  <div className="bg-white/[0.04] rounded-xl px-4 py-3 border border-white/5 flex items-center justify-between gap-3">
                    <span className="text-gold font-black tracking-[0.25em] text-2xl tabular-nums">
                      {tvCode}
                    </span>
                    <a
                      href={tvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/50 hover:text-white border border-white/15 rounded-lg px-2.5 py-1.5 shrink-0"
                    >
                      📺 افتح الشاشة
                    </a>
                  </div>
                  <p className="text-xs text-white/30 mt-1">هذا الكود خاص بك — لا تشاركه مع المشاهدين</p>
                </div>
              )}

              {/* إلغاء الصكة */}
              <button
                onClick={() => { onClose(); onAbandon(); }}
                className="w-full bg-danger/20 hover:bg-danger/30 text-red-300 rounded-xl py-3 font-bold text-sm"
              >
                إلغاء الصكة
              </button>
            </div>
          )}

          {/* ===== تاب لنا / لهم ===== */}
          {(tab === "us" || tab === "them") && (
            <>
              <PlayersTabPanel
                accent={tab === "us" ? "text-blue-400" : "text-orange-400"}
                p1Id={tab === "us" ? t1p1 : t2p1}
                p2Id={tab === "us" ? t1p2 : t2p2}
                setP1={tab === "us" ? setT1p1 : setT2p1}
                setP2={tab === "us" ? setT1p2 : setT2p2}
                allPlayers={localPlayers}
                excluded={tab === "us" ? [t2p1, t2p2] : [t1p1, t1p2]}
              />

              {/* إضافة لاعب جديد */}
              <AddPlayerInline onCreated={handleNewPlayer} />

              {error && (
                <div className="mt-3 bg-danger/20 text-red-300 text-sm rounded-xl p-3">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="h-12 rounded-2xl bg-white/10 hover:bg-white/20 font-medium"
          >
            تم
          </button>
          {(tab === "us" || tab === "them") && (
            <button
              onClick={savePlayers}
              disabled={isPending || !dirty}
              className="h-12 rounded-2xl btn-grad disabled:opacity-50"
            >
              {isPending ? "..." : "حفظ اللاعبين"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-10 rounded-lg text-sm font-bold transition ${
        active
          ? "bg-orange-500 text-white shadow"
          : "text-white/70 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function AddPlayerInline({ onCreated }: { onCreated: (p: Player) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!name.trim()) return;
    setLoading(true);
    setErr(null);
    const res = await createPlayerAction(name.trim());
    setLoading(false);
    if (!res.ok) { setErr(res.error); return; }
    onCreated(res.player);
    setName("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 30); }}
        className="mt-4 w-full h-10 rounded-xl border border-dashed border-white/20 text-white/40 hover:border-white/40 hover:text-white/70 text-sm flex items-center justify-center gap-2 transition"
      >
        <span className="text-lg leading-none">+</span>
        إضافة لاعب جديد
      </button>
    );
  }

  return (
    <div className="mt-4 bg-white/[0.04] rounded-xl p-3 border border-white/10 space-y-2">
      <div className="text-xs text-white/60">اسم اللاعب الجديد</div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="مثال: عبدالله"
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500/60"
        />
        <button
          onClick={submit}
          disabled={loading || !name.trim()}
          className="px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm disabled:opacity-40"
        >
          {loading ? "..." : "إضافة"}
        </button>
        <button
          onClick={() => { setOpen(false); setName(""); setErr(null); }}
          className="w-9 rounded-xl border border-white/10 text-white/40 hover:text-white flex items-center justify-center"
        >
          <X size={15} />
        </button>
      </div>
      {err && <div className="text-red-400 text-xs">{err}</div>}
    </div>
  );
}

function PlayersTabPanel({
  accent,
  p1Id,
  p2Id,
  setP1,
  setP2,
  allPlayers,
  excluded,
}: {
  accent: string;
  p1Id: string;
  p2Id: string;
  setP1: (v: string) => void;
  setP2: (v: string) => void;
  allPlayers: Player[];
  excluded: string[];
}) {
  return (
    <div className="space-y-3">
      <div className={`text-sm font-bold ${accent}`}>اللاعبان</div>
      <PlayerSelect
        value={p1Id}
        onChange={setP1}
        allPlayers={allPlayers}
        disabledIds={[p2Id, ...excluded]}
        label="اللاعب الأول"
      />
      <PlayerSelect
        value={p2Id}
        onChange={setP2}
        allPlayers={allPlayers}
        disabledIds={[p1Id, ...excluded]}
        label="اللاعب الثاني"
      />
      <p className="text-xs text-white/40 pt-2">
        لا يمكن تكرار اللاعب بين الفريقين. لإضافة/تعديل اللاعبين روح لـ{" "}
        <a href="/players" className="underline">صفحة اللاعبين</a>.
      </p>
    </div>
  );
}

function PlayerSelect({
  value,
  onChange,
  allPlayers,
  disabledIds,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  allPlayers: Player[];
  disabledIds: string[];
  label: string;
}) {
  const current = allPlayers.find((p) => p.id === value);
  return (
    <div>
      <label className="block text-xs mb-1 text-white/70">{label}</label>
      <div className="bg-black/40 border border-white/10 rounded-xl flex items-center gap-2 px-2">
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
          <option value="" className="bg-[#1a1a1a]">
            — اختر —
          </option>
          {allPlayers.map((p) => (
            <option
              key={p.id}
              value={p.id}
              disabled={disabledIds.includes(p.id) && p.id !== value}
              className="bg-[#1a1a1a]"
            >
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
