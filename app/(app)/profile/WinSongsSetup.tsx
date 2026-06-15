"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WIN_SONGS } from "@/lib/voice-win";
import { uploadVoiceClipAction, removeVoiceClipAction } from "./actions";

const MAX_BYTES = 3 * 1024 * 1024; // ~3MB (تحت حد جسم الطلب)

export default function WinSongsSetup({
  initialKeys,
}: {
  initialKeys: string[];
}) {
  const router = useRouter();
  // المفاتيح الموجودة + رقم نسخة لكسر الكاش بعد إعادة الرفع
  const [present, setPresent] = useState<Record<string, number>>(
    Object.fromEntries(initialKeys.map((k) => [k, 0])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const count = WIN_SONGS.filter((w) => present[w.key] !== undefined).length;

  async function onFile(key: string, file: File) {
    setMsg(null);
    if (file.size > MAX_BYTES) {
      setMsg({ ok: false, text: "الأغنية أكبر من ٣ ميجا — اختر مقطعاً أقصر" });
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
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
      } else {
        setPresent((p) => ({ ...p, [key]: (p[key] ?? 0) + 1 }));
        setMsg({ ok: true, text: "✅ تم الرفع" });
      }
    } catch {
      setMsg({ ok: false, text: "فشل الرفع — جرّب ملفاً أصغر" });
    } finally {
      setBusy(null);
    }
  }

  async function onRemove(key: string) {
    setBusy(key);
    await removeVoiceClipAction(key);
    setPresent((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">تُشغَّل واحدة عشوائياً عند إعلان الفوز · حتى ٣ ميجا</p>
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
        const ver = present[song.key];
        const has = ver !== undefined;
        const isBusy = busy === song.key;
        return (
          <div
            key={song.key}
            className={`border rounded-xl px-3 py-2 flex items-center gap-2 ${
              has ? "bg-green-500/10 border-green-500/30" : "bg-navy-light border-white/10"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-black ${
                has ? "bg-green-500 text-navy-deep" : "bg-white/10 text-white/30"
              }`}
            >
              {has ? "✓" : ""}
            </span>
            <span className="text-sm font-medium shrink-0 w-28 truncate">🎉 {song.label}</span>
            {has ? (
              <>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio
                  src={`/api/voice-clip?key=${song.key}&v=${ver}`}
                  controls
                  preload="none"
                  className="h-8 flex-1 min-w-0"
                />
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
