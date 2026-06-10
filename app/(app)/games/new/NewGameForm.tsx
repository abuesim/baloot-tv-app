"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { GAME_MODES, type GameMode } from "@/lib/baloot";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { createGameAction } from "./actions";

type Player = { id: string; name: string; imageUrl: string | null };

/* ─── Dropdown مخصص يعرض الصورة + الاسم + بحث ─── */
function PlayerPicker({
  value,
  onChange,
  label,
  options,
  byId,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: Player[];
  byId: Map<string, Player>;
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // إغلاق عند الضغط خارج الـ dropdown
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // فوكس تلقائي على حقل البحث عند الفتح
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  const current = value ? byId.get(value) : null;

  // فلترة حسب النص المكتوب (يبحث في الاسم بتجاهل الحركات)
  const filtered = query.trim()
    ? options.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm mb-2 text-white/80">{label}</label>

      {/* الزر الرئيسي */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full bg-navy-light border rounded-xl flex items-center gap-2 px-3 py-2 text-right transition-colors ${
          open ? "border-accent" : "border-white/10 hover:border-white/30"
        }`}
      >
        {current ? (
          <PlayerAvatar name={current.name} imageUrl={current.imageUrl} size="sm" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10" />
        )}
        <span className={`flex-1 text-sm truncate ${current ? "" : "text-white/40"}`}>
          {current ? current.name : "— اختر —"}
        </span>
        <span className="text-white/30 text-[10px]">{open ? "▲" : "▼"}</span>
      </button>

      {/* قائمة الخيارات */}
      {open && (
        <div className="absolute top-full mt-1 right-0 left-0 z-50 bg-navy-light border border-white/10 rounded-xl overflow-hidden shadow-2xl">

          {/* حقل البحث */}
          <div className="px-3 pt-2.5 pb-2 border-b border-white/5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن لاعب..."
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent placeholder:text-white/30"
            />
          </div>

          {/* الخيارات */}
          <div className="max-h-48 overflow-y-auto">
            {/* إلغاء الاختيار */}
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 text-white/40 text-sm border-b border-white/5"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 shrink-0" />
              <span>— اختر —</span>
            </button>

            {filtered.length === 0 && (
              <p className="text-center text-white/30 text-sm py-4">ما في نتائج</p>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  value === p.id ? "bg-gold/10 text-gold" : "hover:bg-white/5"
                }`}
              >
                <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="sm" />
                <span className="flex-1 text-right truncate">{p.name}</span>
                {value === p.id && <span className="text-gold text-xs shrink-0">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── الفورم الرئيسي ─── */
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
  const allChosen  = selected.length === 4;
  const noneChosen = selected.length === 0;
  const partial    = !allChosen && !noneChosen;

  // اللاعبون المتاحون لكل picker (يخفي المختارين في الـ pickers الأخرى)
  function opts(self: string) {
    return players.filter((p) => !selected.includes(p.id) || p.id === self);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (partial) {
      setError("إما اختر الأربعة كاملين أو اتركهم فاضي وأضفهم بعدين من الحاسبة");
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
            const cfg    = GAME_MODES[m];
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

      {/* اللاعبون */}
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
              <PlayerPicker value={t1p1} onChange={setT1p1} label="اللاعب الأول" options={opts(t1p1)} byId={byId} />
              <PlayerPicker value={t1p2} onChange={setT1p2} label="اللاعب الثاني" options={opts(t1p2)} byId={byId} />
            </div>
          </div>

          <div className="bg-navy rounded-2xl p-5 border border-white/10">
            <h3 className="text-lg font-bold mb-3">لهم (الفريق ٢)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PlayerPicker value={t2p1} onChange={setT2p1} label="اللاعب الأول" options={opts(t2p1)} byId={byId} />
              <PlayerPicker value={t2p2} onChange={setT2p2} label="اللاعب الثاني" options={opts(t2p2)} byId={byId} />
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
