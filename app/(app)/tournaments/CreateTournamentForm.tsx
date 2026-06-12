"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTournamentAction } from "./actions";

export default function CreateTournamentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<"KNOCKOUT" | "POINTS">("KNOCKOUT");
  const [bestOf, setBestOf] = useState<1 | 3>(1);
  const [gameMode, setGameMode] = useState<"NORMAL" | "MASHDOOD">("NORMAL");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("اكتب اسم البطولة");
    start(async () => {
      const res = await createTournamentAction({ name, format, matchBestOf: bestOf, gameMode });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/tournaments/${res.id}`);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-grad px-6 py-3 rounded-xl text-lg w-full sm:w-auto"
      >
        ➕ بطولة جديدة
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-navy rounded-2xl p-5 border border-white/10 space-y-5">
      <div>
        <label className="block text-sm mb-2 text-white/80">اسم البطولة</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: بطولة رمضان"
          autoFocus
          className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
      </div>

      {/* نظام البطولة */}
      <Choice
        label="نظام البطولة"
        value={format}
        onChange={(v) => setFormat(v as "KNOCKOUT" | "POINTS")}
        options={[
          { v: "KNOCKOUT", t: "خروج المغلوب", d: "الخاسر يخرج — شجرة إقصاء" },
          { v: "POINTS", t: "تجميع النقاط", d: "دوري — الكل ضد الكل" },
        ]}
      />

      {/* نظام المواجهة */}
      <Choice
        label="نظام المواجهة"
        value={String(bestOf)}
        onChange={(v) => setBestOf(Number(v) as 1 | 3)}
        options={[
          { v: "1", t: "صكة واحدة", d: "المواجهة تُحسم بصكة" },
          { v: "3", t: "أفضل من ٣", d: "أول من يفوز بصكتين (2/0 أو 2/1)" },
        ]}
      />

      {/* نوع اللعب */}
      <Choice
        label="نوع اللعب"
        value={gameMode}
        onChange={(v) => setGameMode(v as "NORMAL" | "MASHDOOD")}
        options={[
          { v: "NORMAL", t: "عادي", d: "٠ → ١٥٢" },
          { v: "MASHDOOD", t: "مشدود", d: "٥٢ → ١٥٢" },
        ]}
      />

      {error && <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn-grad px-6 py-2.5 rounded-xl">
          {isPending ? "..." : "إنشاء"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; t: string; d: string }[];
}) {
  return (
    <div>
      <label className="block text-sm mb-2 text-white/80">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const active = value === o.v;
          return (
            <button
              type="button"
              key={o.v}
              onClick={() => onChange(o.v)}
              className={`text-right p-3 rounded-xl border-2 transition-colors ${
                active ? "border-gold bg-gold/10" : "border-white/10 bg-navy-light hover:border-white/30"
              }`}
            >
              <div className="font-bold text-sm">{o.t}</div>
              <div className="text-[11px] text-white/55">{o.d}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
