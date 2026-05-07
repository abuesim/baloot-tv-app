"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateTvCodeAction } from "./actions";

export default function TvSection({
  code,
  tvUrl,
  qrSvg,
  canRegenerate = true,
}: {
  code: string | null;
  tvUrl: string | null;
  qrSvg: string | null;
  canRegenerate?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    if (!tvUrl) return;
    navigator.clipboard.writeText(tvUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function regenerate() {
    if (!confirm("توليد كود جديد سيُخرج كل الشاشات الحالية. متأكد؟")) return;
    startTransition(async () => {
      await regenerateTvCodeAction();
      router.refresh();
    });
  }

  if (!code || !tvUrl) {
    if (!canRegenerate) return null;
    return (
      <div className="text-center py-4">
        <button
          onClick={regenerate}
          disabled={isPending}
          className="bg-accent text-white font-bold px-5 py-2 rounded-xl"
        >
          {isPending ? "..." : "توليد كود"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
      {/* QR Code */}
      {qrSvg && (
        <div
          className="bg-white p-3 rounded-2xl shrink-0 mx-auto"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-white/60 mb-1">الكود</label>
          <div className="text-5xl font-black text-gold tracking-widest">
            {code}
          </div>
          <p className="text-xs text-white/50 mt-1">
            هذا الكود دائم — الشاشة تتصل مرة وتعمل لكل صكاتك
          </p>
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">الرابط</label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={tvUrl}
              dir="ltr"
              className="flex-1 bg-navy-light border border-white/10 rounded-xl px-3 py-2 text-sm"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copyUrl}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm"
            >
              {copied ? "✓ تم النسخ" : "نسخ"}
            </button>
          </div>
          <p className="text-xs text-white/50 mt-1">
            افتح هذا الرابط في التلفزيون أو امسح الـ QR
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gold/20 text-gold px-4 py-2 rounded-xl text-sm hover:bg-gold/30"
          >
            ↗ افتح الشاشة
          </a>
          {canRegenerate && (
            <button
              onClick={regenerate}
              disabled={isPending}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm"
            >
              🔄 توليد كود جديد
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
