"use client";

import { useState, useRef, useEffect } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export type SelectablePlayer = { id: string; name: string; imageUrl: string | null };

/** منتقي لاعب واحد بقائمة منسدلة فيها صور + بحث */
export default function PlayerSelect({
  value,
  onChange,
  options,
  byId,
  label,
  placeholder = "— اختر —",
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectablePlayer[];
  byId: Map<string, SelectablePlayer>;
  label?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const current = value ? byId.get(value) : null;
  const filtered = query.trim()
    ? options.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-sm mb-2 text-white/80">{label}</label>}

      <button
        type="button"
        onClick={() => { setQuery(""); setOpen((o) => !o); }}
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
          {current ? current.name : placeholder}
        </span>
        <span className="text-white/30 text-[10px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 left-0 z-50 bg-navy-light border border-white/10 rounded-xl overflow-hidden shadow-2xl">
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
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 text-white/40 text-sm border-b border-white/5"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 shrink-0" />
              <span>{placeholder}</span>
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
