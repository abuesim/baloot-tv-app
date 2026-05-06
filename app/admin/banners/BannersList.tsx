"use client";

import { useTransition } from "react";
import type { AdBanner } from "@prisma/client";
import { toggleBannerAction, deleteBannerAction } from "./actions";

export default function BannersList({ banners }: { banners: AdBanner[] }) {
  const [isPending, startTransition] = useTransition();

  if (banners.length === 0) {
    return (
      <div className="bg-navy rounded-2xl border border-white/10 p-12 text-center text-white/40">
        لا توجد إعلانات بعد
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {banners.map((b) => (
        <div
          key={b.id}
          className={`bg-navy rounded-2xl border border-white/10 p-4 flex items-center gap-4 ${
            !b.active ? "opacity-50" : ""
          }`}
        >
          {b.imageUrl && (
            <img
              src={b.imageUrl}
              alt=""
              className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">
              {b.text || (
                <span className="text-white/40 italic">— بدون نص —</span>
              )}
            </div>
            {b.linkUrl && (
              <div className="text-xs text-white/50 mt-1 truncate" dir="ltr">
                ↗ {b.linkUrl}
              </div>
            )}
            <div className="text-xs text-white/40 mt-1 flex gap-2">
              <span>ترتيب: {b.order}</span>
              {b.imageUrl && <span>• فيها صورة</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              disabled={isPending}
              onClick={() => startTransition(() => toggleBannerAction(b.id))}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded"
            >
              {b.active ? "تعطيل" : "تفعيل"}
            </button>
            <button
              disabled={isPending}
              onClick={() => {
                if (confirm("حذف هذا الإعلان؟")) {
                  startTransition(() => deleteBannerAction(b.id));
                }
              }}
              className="text-xs bg-danger/20 hover:bg-danger/30 text-red-300 px-3 py-1 rounded"
            >
              حذف
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
