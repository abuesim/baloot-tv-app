"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VOICE_GROUPS, ALL_CLIP_KEYS } from "@/lib/voice-narration";
import { uploadVoiceClipAction, removeVoiceClipAction } from "./actions";

const MAX_BYTES = 2 * 1024 * 1024; // ~2MB

export default function VoiceNarrationSetup({
  initialClips,
}: {
  initialClips: Record<string, string>;
}) {
  const router = useRouter();
  const [clips, setClips] = useState<Record<string, string>>(initialClips);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const recorded = ALL_CLIP_KEYS.filter((k) => clips[k]).length;

  async function onFile(key: string, file: File) {
    setMsg(null);
    if (file.size > MAX_BYTES) {
      setMsg({ ok: false, text: "حجم المقطع أكبر من ٢ ميجا" });
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">
          ارفع صوتك لكل لبنة، والتطبيق يركّبها لنطق النتيجة. أي مقطع ناقص يُنطق بالصوت الآلي.
        </p>
        <span className="text-xs text-gold shrink-0">
          {recorded}/{ALL_CLIP_KEYS.length}
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

      {VOICE_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-bold text-white/80 mb-2">{group.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.clips.map((clip) => {
              const uri = clips[clip.key];
              const isBusy = busy === clip.key;
              return (
                <div
                  key={clip.key}
                  className={`border rounded-xl px-3 py-2 flex items-center gap-2 ${
                    uri ? "bg-green-500/10 border-green-500/30" : "bg-navy-light border-white/10"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-black ${
                      uri ? "bg-green-500 text-navy-deep" : "bg-white/10 text-white/30"
                    }`}
                    title={uri ? "تم التسجيل" : "لم يُسجّل"}
                  >
                    {uri ? "✓" : ""}
                  </span>
                  <span className="text-sm font-medium shrink-0 w-20 truncate">{clip.label}</span>
                  {uri ? (
                    <>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio src={uri} controls className="h-8 flex-1 min-w-0" />
                      <button
                        type="button"
                        onClick={() => onRemove(clip.key)}
                        disabled={isBusy}
                        className="text-red-400/70 hover:text-red-400 text-sm shrink-0"
                        title="حذف"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <label className="flex-1 text-center cursor-pointer text-xs text-white/60 bg-white/5 hover:bg-white/10 rounded-lg py-1.5 border border-dashed border-white/20">
                      {isBusy ? "⏳ جاري الرفع..." : "🎙️ رفع صوت"}
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        disabled={isBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onFile(clip.key, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
