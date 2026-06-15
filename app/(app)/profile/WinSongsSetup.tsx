"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WIN_SONGS } from "@/lib/voice-win";
import { uploadVoiceClipAction, removeVoiceClipAction } from "./actions";

const MAX_BYTES = 5 * 1024 * 1024; // ~5MB (أغاني أطول)

export default function WinSongsSetup({
  initialClips,
}: {
  initialClips: Record<string, string>;
}) {
  const router = useRouter();
  const [clips, setClips] = useState<Record<string, string>>(initialClips);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const count = WIN_SONGS.filter((w) => clips[w.key]).length;

  async function onFile(key: string, file: File) {
    setMsg(null);
    if (file.size > MAX_BYTES) {
      setMsg({ ok: false, text: "حجم الملف أكبر من ٥ ميجا" });
      return;
    }
    setBusy(key);
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("فشل القراءة"));
        r.readAsDataURL(file);
      });
      const res = await uploadVoiceClipAction(key, dataUri);
      if (!res.ok) setMsg({ ok: false, text: res.error });
      else {
        setClips((c) => ({ ...c, [key]: dataUri }));
        setMsg({ ok: true, text: "✅ تم الرفع" });
      }
    } catch {
      setMsg({ ok: false, text: "فشل معالجة الملف" });
    } finally {
      setBusy(null);
    }
  }

  async function onRemove(key: string) {
    setBusy(key);
    await removeVoiceClipAction(key);
    setClips((c) => {
      const n = { ...c };
      delete n[key];
      return n;
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">تُشغَّل واحدة عشوائياً عند إعلان الفوز</p>
        <span className="text-xs text-gold shrink-0">
          {count}/{WIN_SONGS.length}
        </span>
      </div>

      {msg && (
        <div
          className={`rounded-xl p-2.5 text-sm ${
            msg.ok ? "bg-green-500/20 text-green-300" : "bg-danger/20 text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      {WIN_SONGS.map((song) => {
        const uri = clips[song.key];
        const isBusy = busy === song.key;
        return (
          <div
            key={song.key}
            className={`border rounded-xl px-3 py-2 flex items-center gap-2 ${
              uri ? "bg-green-500/10 border-green-500/30" : "bg-navy-light border-white/10"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-black ${
                uri ? "bg-green-500 text-navy-deep" : "bg-white/10 text-white/30"
              }`}
            >
              {uri ? "✓" : ""}
            </span>
            <span className="text-sm font-medium shrink-0 w-28 truncate">🎉 {song.label}</span>
            {uri ? (
              <>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio src={uri} controls className="h-8 flex-1 min-w-0" />
                <button
                  type="button"
                  onClick={() => onRemove(song.key)}
                  disabled={isBusy}
                  className="text-red-400/70 hover:text-red-400 text-sm shrink-0"
                  title="حذف"
                >
                  ✕
                </button>
              </>
            ) : (
              <label className="flex-1 text-center cursor-pointer text-xs text-white/60 bg-white/5 hover:bg-white/10 rounded-lg py-1.5 border border-dashed border-white/20">
                {isBusy ? "⏳ جاري الرفع..." : "🎵 رفع أغنية"}
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  disabled={isBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(song.key, f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
