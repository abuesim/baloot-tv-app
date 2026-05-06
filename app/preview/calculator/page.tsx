"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Settings,
  Redo2,
  ArrowLeft,
  X,
  Pencil,
  Camera,
} from "lucide-react";

// ===== بيانات وهمية للمعاينة =====
const MOCK_CHIPS = [16, 18, 26, 30];

// مرتّبة من الأحدث للأقدم (#8 أولاً)
const MOCK_ROUNDS = [
  { n: 8, us: 30, them: 12 },
  { n: 7, us: 25, them: 18 },
  { n: 6, us: 22, them: 30 },
  { n: 5, us: 16, them: 26 },
  { n: 4, us: 30, them: 16 },
  { n: 3, us: 25, them: 20 },
  { n: 2, us: 26, them: 18 },
  { n: 1, us: 20, them: 30 },
];

type PreviewPlayer = { id: string; name: string; imageUrl: string | null };

const INITIAL_US: PreviewPlayer[] = [
  { id: "u1", name: "محمد", imageUrl: null },
  { id: "u2", name: "خالد", imageUrl: null },
];
const INITIAL_THEM: PreviewPlayer[] = [
  { id: "t1", name: "هيمو", imageUrl: null },
  { id: "t2", name: "صالح", imageUrl: null },
];

export default function CalculatorPreviewPage() {
  const [showAllRounds, setShowAllRounds] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // إدخال النقاط
  const [activeSide, setActiveSide] = useState<"us" | "them" | null>(null);
  const [usInput, setUsInput] = useState("");
  const [themInput, setThemInput] = useState("");

  // الإعدادات
  const [mode, setMode] = useState<"عادي" | "مشدود">("عادي");
  const [usPlayers, setUsPlayers] = useState<PreviewPlayer[]>(INITIAL_US);
  const [themPlayers, setThemPlayers] = useState<PreviewPlayer[]>(INITIAL_THEM);

  // النقاط الكبيرة (وهمية: تتغيّر مع الإدخال للمعاينة فقط)
  const usScore = 59 + (Number(usInput) || 0);
  const themScore = 38 + (Number(themInput) || 0);

  function clickChip(value: number) {
    if (activeSide === "us") setUsInput(String(value));
    else if (activeSide === "them") setThemInput(String(value));
  }

  function record() {
    setActiveSide(null);
    setUsInput("");
    setThemInput("");
  }

  function toggleSide(side: "us" | "them") {
    setActiveSide((prev) => (prev === side ? null : side));
  }

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden"
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
      {/* ===== Top Header ===== */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button className="w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold">حاسبة بلوت</h1>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full border border-white/15 bg-white/5 flex items-center justify-center">
            <Plus size={18} strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full border border-white/15 bg-white/5 flex items-center justify-center"
          >
            <ProfileIcon />
          </button>
        </div>
      </div>

      {/* ===== Settings + Timer + Redo ===== */}
      <div className="flex items-center justify-between px-6 mt-12">
        <button className="w-11 h-11 rounded-full flex items-center justify-center">
          <Redo2 size={22} strokeWidth={2} className="rotate-180" />
        </button>

        <div className="flex items-center gap-2 text-white/95">
          <TimerIcon />
          <span className="text-3xl font-medium tabular-nums tracking-wider">
            00:50
          </span>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
        >
          <Settings size={22} strokeWidth={2} />
        </button>
      </div>

      {/* ===== Score Display: لنا (right) | لهم (left) ===== */}
      <div className="grid grid-cols-2 items-center gap-4 px-6 mt-16 mb-4">
        {/* لنا — يمين */}
        <div className="text-center">
          <div className="text-xl font-medium mb-1 text-white/95">لنا</div>
          <div className="text-[7.5rem] leading-none font-black text-white">
            {usScore}
          </div>
        </div>

        {/* لهم — يسار */}
        <div className="text-center">
          <div className="text-xl font-medium mb-1 text-white/95">لهم</div>
          <div className="text-[7.5rem] leading-none font-black text-white">
            {themScore}
          </div>
        </div>
      </div>

      {/* ===== Bottom 3 boxes ===== */}
      <div className="px-5 mt-10 grid grid-cols-[1fr_2.5fr_1fr] gap-2.5">
        {/* صندوق إدخال "لنا" — يمين في RTL = أول عنصر */}
        <button
          onClick={() => toggleSide("us")}
          className={`h-16 rounded-2xl bg-black flex items-center justify-center transition ${
            activeSide === "us"
              ? "border-2 border-amber-400"
              : "border border-white/15"
          }`}
        >
          {activeSide === "us" ? (
            <span className="text-white text-2xl font-bold tabular-nums">
              {usInput || <span className="text-white/40">|</span>}
            </span>
          ) : (
            <span className="text-white/40 text-xs">لنا</span>
          )}
        </button>

        {/* زر "سجل" */}
        <button
          onClick={record}
          className="h-16 rounded-2xl border border-white/15 bg-black flex items-center justify-center hover:bg-white/[0.03]"
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

        {/* صندوق إدخال "لهم" — يسار */}
        <button
          onClick={() => toggleSide("them")}
          className={`h-16 rounded-2xl bg-black flex items-center justify-center transition ${
            activeSide === "them"
              ? "border-2 border-amber-400"
              : "border border-white/15"
          }`}
        >
          {activeSide === "them" ? (
            <span className="text-white text-2xl font-bold tabular-nums">
              {themInput || <span className="text-white/40">|</span>}
            </span>
          ) : (
            <span className="text-white/40 text-xs">لهم</span>
          )}
        </button>
      </div>

      {/* ===== Round chips - تظهر فقط عند تفعيل الإدخال ===== */}
      <div
        className={`flex items-center justify-center gap-3 mt-5 transition-all duration-300 ${
          activeSide
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none h-0"
        }`}
      >
        {MOCK_CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => clickChip(c)}
            className="w-12 h-12 rounded-full border border-amber-700/60 bg-stone-800/70 hover:bg-stone-700 flex items-center justify-center text-amber-100/90 font-medium tabular-nums"
          >
            {c}
          </button>
        ))}
      </div>

      {/* ===== Rounds Preview (آخر جولتين دائماً في الأسفل) ===== */}
      <RoundsPreview
        rounds={MOCK_ROUNDS}
        onExpand={() => setShowAllRounds(true)}
      />

      {/* ===== Rounds Overlay (نافذة عائمة فوق الحاسبة) ===== */}
      {showAllRounds && (
        <RoundsOverlay
          rounds={MOCK_ROUNDS}
          onClose={() => setShowAllRounds(false)}
        />
      )}

      {/* ===== Settings Modal ===== */}
      {showSettings && (
        <SettingsModal
          mode={mode}
          setMode={setMode}
          usPlayers={usPlayers}
          setUsPlayers={setUsPlayers}
          themPlayers={themPlayers}
          setThemPlayers={setThemPlayers}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ===== Floating "preview" tag ===== */}
      <div className="fixed top-3 right-3 bg-yellow-500/90 text-black text-[10px] font-bold px-2 py-1 rounded-full z-50">
        معاينة
      </div>
    </div>
  );
}

// ====================================================
// Rounds Preview - آخر جولتين دائماً في الأسفل
// ====================================================

function RoundsPreview({
  rounds,
  onExpand,
}: {
  rounds: { n: number; us: number; them: number }[];
  onExpand: () => void;
}) {
  if (rounds.length === 0) return null;
  const newestFirst = [...rounds].sort((a, b) => b.n - a.n);
  const visible = newestFirst.slice(0, 2);

  return (
    <div className="px-4 mt-6 mb-4">
      <div className="bg-[#0d0d0d] rounded-2xl border border-white/5 overflow-hidden">
        {/* عناوين الأعمدة */}
        <div className="grid grid-cols-3 px-6 py-2 text-white/60 text-xs">
          <div className="text-right">لهم</div>
          <div className="text-center">لنا</div>
          <div className="text-left">#</div>
        </div>

        {/* صفوف الجولات */}
        {visible.map((r) => (
          <div
            key={r.n}
            className="grid grid-cols-3 px-6 py-2 text-base border-t border-white/5"
          >
            <div className="text-right tabular-nums">{r.them}</div>
            <div className="text-center tabular-nums">{r.us}</div>
            <div className="text-left tabular-nums text-white/50">{r.n}</div>
          </div>
        ))}

        {/* زر فتح القائمة الكاملة */}
        {rounds.length > 2 && (
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

// ====================================================
// Rounds Overlay - نافذة عائمة فوق الحاسبة
// ====================================================

function RoundsOverlay({
  rounds,
  onClose,
}: {
  rounds: { n: number; us: number; them: number }[];
  onClose: () => void;
}) {
  // الترتيب الصحيح: ١، ٢، ٣...
  const ascending = [...rounds].sort((a, b) => a.n - b.n);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0d0d] rounded-3xl border border-white/10 w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* رأس */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
          <h3 className="text-lg font-bold">الجولات ({rounds.length})</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center hover:bg-white/5"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* عناوين الأعمدة */}
        <div className="grid grid-cols-3 px-6 py-3 text-white/60 text-sm bg-white/[0.03]">
          <div className="text-right">لهم</div>
          <div className="text-center">لنا</div>
          <div className="text-left">#</div>
        </div>

        {/* قائمة الجولات (ترتيب تصاعدي) */}
        <div className="flex-1 overflow-y-auto">
          {ascending.map((r) => (
            <div
              key={r.n}
              className="grid grid-cols-3 px-6 py-3 text-lg border-b border-white/5"
            >
              <div className="text-right tabular-nums">{r.them}</div>
              <div className="text-center tabular-nums">{r.us}</div>
              <div className="text-left tabular-nums text-white/50">{r.n}</div>
            </div>
          ))}
        </div>

        {/* زر إغلاق */}
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

// ====================================================
// Settings Modal with Tabs
// ====================================================

type Tab = "general" | "us" | "them";

function SettingsModal({
  mode,
  setMode,
  usPlayers,
  setUsPlayers,
  themPlayers,
  setThemPlayers,
  onClose,
}: {
  mode: "عادي" | "مشدود";
  setMode: (m: "عادي" | "مشدود") => void;
  usPlayers: PreviewPlayer[];
  setUsPlayers: (p: PreviewPlayer[]) => void;
  themPlayers: PreviewPlayer[];
  setThemPlayers: (p: PreviewPlayer[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("general");

  const allNames = new Set(
    [...usPlayers, ...themPlayers].map((p) => p.name.trim().toLowerCase()),
  );

  function updatePlayer(
    side: "us" | "them",
    index: number,
    next: PreviewPlayer,
  ) {
    if (side === "us") {
      const arr = [...usPlayers];
      arr[index] = next;
      setUsPlayers(arr);
    } else {
      const arr = [...themPlayers];
      arr[index] = next;
      setThemPlayers(arr);
    }
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
          <TabButton active={tab === "general"} onClick={() => setTab("general")}>
            عام
          </TabButton>
          <TabButton active={tab === "us"} onClick={() => setTab("us")}>
            لنا
          </TabButton>
          <TabButton active={tab === "them"} onClick={() => setTab("them")}>
            لهم
          </TabButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "general" && (
            <GeneralSettings mode={mode} setMode={setMode} />
          )}
          {tab === "us" && (
            <PlayersTab
              players={usPlayers}
              onChange={(i, p) => updatePlayer("us", i, p)}
              existingNames={allNames}
              accent="text-blue-400"
            />
          )}
          {tab === "them" && (
            <PlayersTab
              players={themPlayers}
              onChange={(i, p) => updatePlayer("them", i, p)}
              existingNames={allNames}
              accent="text-orange-400"
            />
          )}
        </div>

        {/* Save */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl border-2 border-white/30 text-base font-medium hover:bg-white/5"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
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

function GeneralSettings({
  mode,
  setMode,
}: {
  mode: "عادي" | "مشدود";
  setMode: (m: "عادي" | "مشدود") => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-white/60 mb-2">نوع اللعب</label>
        <div className="grid grid-cols-2 bg-white/[0.04] rounded-xl p-1 border border-white/5">
          {(["عادي", "مشدود"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`h-12 rounded-lg text-base font-bold transition ${
                  active
                    ? "bg-orange-500 text-white shadow"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-white/40 mt-2">
          {mode === "عادي"
            ? "البداية من ٠ والوصول إلى ١٥٢"
            : "البداية من ٥٢ والوصول إلى ١٥٢"}
        </p>
      </div>
    </div>
  );
}

function PlayersTab({
  players,
  onChange,
  existingNames,
  accent,
}: {
  players: PreviewPlayer[];
  onChange: (index: number, p: PreviewPlayer) => void;
  existingNames: Set<string>;
  accent: string;
}) {
  return (
    <div className="space-y-3">
      <div className={`text-sm font-bold ${accent}`}>اللاعبان</div>
      {players.map((p, i) => (
        <PlayerEditRow
          key={p.id}
          player={p}
          existingNames={existingNames}
          onChange={(np) => onChange(i, np)}
        />
      ))}
      <p className="text-xs text-white/40 pt-2">
        لا يمكن تكرار الأسماء بين الفريقين، ولا يمكن حذف اللاعب — فقط استبدال
        الاسم أو الصورة.
      </p>
    </div>
  );
}

function PlayerEditRow({
  player,
  existingNames,
  onChange,
}: {
  player: PreviewPlayer;
  existingNames: Set<string>;
  onChange: (p: PreviewPlayer) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [error, setError] = useState<string | null>(null);

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("الاسم مطلوب");
      return;
    }
    const lower = trimmed.toLowerCase();
    if (lower !== player.name.trim().toLowerCase() && existingNames.has(lower)) {
      setError("اسم مكرر — موجود في الفريق الآخر");
      return;
    }
    onChange({ ...player, name: trimmed });
    setError(null);
    setEditing(false);
  }

  function pickImage() {
    // معاينة فقط — صورة وهمية
    const colors = ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ec4899"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const svg = `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${color}"/><text x="50" y="62" font-size="40" text-anchor="middle" fill="white" font-family="sans-serif">${player.name.charAt(0)}</text></svg>`,
    )}`;
    onChange({ ...player, imageUrl: svg });
  }

  return (
    <div className="bg-white/[0.04] rounded-2xl p-3 border border-white/5">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <button
          onClick={pickImage}
          className="relative w-14 h-14 rounded-full border-2 border-white/10 overflow-hidden shrink-0 bg-stone-800 hover:border-white/30 group"
        >
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-amber-400">
              {player.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
            <Camera size={16} />
          </div>
        </button>

        {/* Name */}
        {editing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={save}
              className="text-xs bg-orange-500 px-3 py-2 rounded-lg font-bold"
            >
              حفظ
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setName(player.name);
                setError(null);
              }}
              className="text-xs text-white/60 px-2"
            >
              إلغاء
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 font-bold text-base truncate">{player.name}</div>
            <button
              onClick={() => setEditing(true)}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
            >
              <Pencil size={12} />
              تعديل
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-400 mt-2 mr-1">{error}</div>
      )}
    </div>
  );
}

// ====================================================
// الأيقونات
// ====================================================

function ProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
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
