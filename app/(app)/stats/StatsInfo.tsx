"use client";

import { useState } from "react";

/** زر معلومات "!" يفتح نافذة تشرح معايير احتساب الإحصائيات والتصنيف */
export default function StatsInfo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="طريقة احتساب الإحصائيات"
        title="طريقة احتساب الإحصائيات"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gold/50 text-gold text-sm font-black hover:bg-gold/15 transition-colors align-middle"
      >
        !
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
              <h3 className="text-lg font-black flex items-center gap-2">📊 كيف تُحتسب الإحصائيات؟</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5 text-sm leading-relaxed">
              {/* التأهّل */}
              <Section icon="✅" title="شرط التأهّل للتصنيف">
                <p>
                  يدخل التصنيف فقط من لعب <b className="text-gold">١٠٪ من إجمالي صكات الفترة</b> على
                  الأقل (حدّ ديناميكي يتكيّف مع النشاط). هذا يمنع لاعباً لعب صكة واحدة وفاز فيها
                  (١٠٠٪) من التصدّر.
                </p>
              </Section>

              {/* ترتيب البطل */}
              <Section icon="🏆" title="ترتيب أفضل لاعب وأفضل فريق">
                <p>يُرتّب المؤهّلون بالأولوية التالية:</p>
                <ol className="mt-2 space-y-1.5 list-decimal pr-5 marker:text-gold marker:font-bold">
                  <li>
                    <b>الأكثر فوزاً</b>
                  </li>
                  <li>
                    عند التعادل → <b>الأقل خسارة</b>
                  </li>
                  <li>
                    عند التعادل → <b>آخر من فاز</b> (الأحدث فوزاً يتقدّم)
                  </li>
                </ol>
              </Section>

              {/* وسام التعادل */}
              <Section icon="🤝" title="وسام التعادل">
                <p>
                  يظهر بجانب البطل/الفريق عندما يوجد مؤهّل آخر بنفس <b>الفوز</b> ونفس <b>الخسارة</b>
                  تماماً — ويُحسم التقدّم حينها بآخر من فاز.
                </p>
              </Section>

              {/* عام */}
              <Section icon="ℹ️" title="ملاحظات">
                <ul className="space-y-1.5 list-disc pr-5 marker:text-white/40">
                  <li>نفس المعايير تُطبَّق على اللاعب الفردي والفريق (الفريق = زوج لاعبين).</li>
                  <li>
                    عمود <b>%</b> هو نسبة الفوز للعرض فقط، ولا يُرتَّب به.
                  </li>
                  <li>تُحتسب الصكات المكتملة (ذات فائز) فقط ضمن الفترة المختارة.</li>
                  <li>أسماء اللاعبين روابط لصفحة اللاعب لعرض تفاصيله.</li>
                </ul>
              </Section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-bold text-white/90 mb-1.5 flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="text-white/70">{children}</div>
    </div>
  );
}
