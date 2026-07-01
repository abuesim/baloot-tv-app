"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
// أعمدة التقويم تبدأ بالسبت
const WEEK_HEADERS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

function keyOf(y: number, m: number, d: number) {
  return `${y}${String(m + 1).padStart(2, "0")}${String(d).padStart(2, "0")}`;
}

/** زر "مخصص" — يفتح تقويماً لاختيار أيام محددة من الشهر لإحصائية خاصة */
export default function CustomPeriodPicker({
  active,
  initial,
}: {
  active: boolean;
  initial: string; // "YYYYMMDD.YYYYMMDD..."
}) {
  const router = useRouter();
  const now = new Date();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial ? initial.split(".").filter(Boolean) : []),
  );

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstCol = (new Date(viewYear, viewMonth, 1).getDay() + 1) % 7; // السبت=0

  function toggle(day: number) {
    const k = keyOf(viewYear, viewMonth, day);
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function apply() {
    if (selected.size === 0) return;
    const enc = Array.from(selected).sort().join(".");
    setOpen(false);
    router.push(`/stats?period=custom-${enc}`);
  }

  // كم يوماً مختار في الشهر المعروض حالياً
  const selectedThisMonth = Array.from(selected).filter((k) =>
    k.startsWith(`${viewYear}${String(viewMonth + 1).padStart(2, "0")}`),
  ).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-xs px-3 py-1 rounded-lg transition-colors ${
          active ? "bg-gold text-navy-deep font-bold" : "bg-navy hover:bg-white/10"
        }`}
      >
        🗓️ اختيار أيام
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-navy rounded-3xl border border-white/15 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-base font-black">🗓️ اختر أيام الإحصائية</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {/* تنقّل الشهر */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10" aria-label="الشهر التالي">›</button>
                <span className="font-bold">{MONTHS_AR[viewMonth]} {viewYear}</span>
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10" aria-label="الشهر السابق">‹</button>
              </div>

              {/* رؤوس الأيام */}
              <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                {WEEK_HEADERS.map((w) => (
                  <span key={w} className="text-[10px] text-white/40">{w.slice(0, 3)}</span>
                ))}
              </div>

              {/* شبكة الأيام */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstCol }).map((_, i) => (
                  <span key={`b${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const k = keyOf(viewYear, viewMonth, day);
                  const on = selected.has(k);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggle(day)}
                      className={`aspect-square rounded-lg text-sm font-bold transition-colors ${
                        on
                          ? "bg-gold text-navy-deep"
                          : "bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* ملخّص + أزرار */}
              <div className="mt-4 flex items-center justify-between text-xs text-white/50">
                <span>المختار: {selected.size} يوم{selectedThisMonth ? ` (${selectedThisMonth} بهذا الشهر)` : ""}</span>
                {selected.size > 0 && (
                  <button onClick={() => setSelected(new Set())} className="text-white/50 hover:text-white">مسح الكل</button>
                )}
              </div>

              <button
                onClick={apply}
                disabled={selected.size === 0}
                className="w-full mt-3 btn-grad py-3 rounded-xl font-bold disabled:opacity-40"
              >
                عرض الإحصائية ({selected.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
