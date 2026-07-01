"use client";

import { useState } from "react";

/** زر مشاركة الإحصائية كصورة PNG (Web Share API + تنزيل احتياطي) */
export default function ShareStatsButton({
  targetId,
  fileName,
}: {
  targetId: string;
  fileName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function share() {
    setErr(null);
    const node = document.getElementById(targetId);
    if (!node) {
      setErr("تعذّر إيجاد المحتوى");
      return;
    }
    setBusy(true);
    try {
      // html-to-image يعتمد على foreignObject فيدعم CSS الحديث (color-mix)
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#0a0a0e",
        cacheBust: true,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const safeName = fileName.replace(/[^\p{L}\p{N}_-]+/gu, "-");
      const file = new File([blob], `${safeName}.png`, { type: "image/png" });

      // مشاركة مباشرة (واتساب/غيره) إن كان مدعوماً
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
      } else {
        // تنزيل احتياطي
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${safeName}.png`;
        a.click();
      }
    } catch (e) {
      // إلغاء المستخدم للمشاركة ليس خطأً
      if ((e as Error)?.name !== "AbortError") {
        setErr("تعذّر إنشاء الصورة");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      className="text-xs px-3 py-1.5 rounded-lg bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors flex items-center gap-1.5 disabled:opacity-50"
    >
      {busy ? "⏳ جاري التجهيز…" : "📤 مشاركة كصورة"}
      {err && <span className="text-red-300 mr-1">· {err}</span>}
    </button>
  );
}
