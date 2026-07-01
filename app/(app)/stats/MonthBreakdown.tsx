"use client";

import { useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type DayEntry = {
  key: string;
  label: string;
  count: number;
  players: { id: string; name: string; imageUrl: string | null }[];
};

/** علامة بجانب عنوان الشهر — تفتح تفصيل أيام الشهر (صكات + لاعبون) */
export default function MonthBreakdown({
  days,
  monthLabel,
}: {
  days: DayEntry[];
  monthLabel: string;
}) {
  const [open, setOpen] = useState(false);

  const totalGames = days.reduce((s, d) => s + d.count, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="تفصيل أيام الشهر"
        title="تفصيل أيام الشهر"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-white/30 text-white/70 text-xs hover:border-gold hover:text-gold transition-colors align-middle ml-1"
      >
        📅
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-navy rounded-3xl border border-white/15 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس */}
            <div className="sticky top-0 bg-navy/95 backdrop-blur px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black">📅 تفصيل {monthLabel}</h3>
                <p className="text-xs text-white/50">
                  {days.length} يوم · {totalGames} صكة
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 shrink-0"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              {days.length === 0 ? (
                <div className="text-center text-white/40 py-8">لا توجد صكات هذا الشهر</div>
              ) : (
                days.map((d) => (
                  <div
                    key={d.key}
                    className="bg-navy-light rounded-2xl border border-white/10 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-sm">{d.label}</span>
                      <span className="text-xs font-bold text-gold bg-gold/15 border border-gold/30 rounded-full px-2.5 py-0.5 shrink-0">
                        {d.count} صكة
                      </span>
                    </div>
                    {d.players.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {d.players.map((p) => (
                          <div key={p.id} className="flex items-center gap-1.5 bg-white/5 rounded-full pr-1 pl-2.5 py-0.5">
                            <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="xs" />
                            <span className="text-[11px] text-white/70">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-white/30">بدون لاعبين مسجّلين</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
