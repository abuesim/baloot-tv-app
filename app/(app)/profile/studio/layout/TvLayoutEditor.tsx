"use client";

import { useRef, useState, useTransition } from "react";
import {
  Eye,
  EyeOff,
  ExternalLink,
  Grip,
  Minus,
  Plus,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  createDefaultTvLayout,
  type TvLayoutConfig,
  type TvLayoutElement,
  type TvLayoutKey,
} from "@/lib/tv-layout";
import { resetTvLayoutAction, updateTvLayoutAction } from "./actions";

const ITEMS: { key: TvLayoutKey; label: string }[] = [
  { key: "header", label: "الشعار والعنوان" },
  { key: "team1", label: "نتيجة لنا" },
  { key: "difference", label: "الفرق" },
  { key: "team2", label: "نتيجة لهم" },
  { key: "rounds", label: "آخر الجولات" },
  { key: "tournament", label: "البطولة" },
  { key: "banners", label: "الإعلانات" },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function TvLayoutEditor({
  initialLayout,
  accent,
  tvUrl,
}: {
  initialLayout: TvLayoutConfig;
  accent: string;
  tvUrl: string | null;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [selected, setSelected] = useState<TvLayoutKey>("team1");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, startTransition] = useTransition();
  const previewRef = useRef<HTMLDivElement>(null);
  const current = layout.elements[selected];

  function updateSelected(patch: Partial<TvLayoutElement>) {
    setLayout((old) => ({
      ...old,
      elements: { ...old.elements, [selected]: { ...old.elements[selected], ...patch } },
    }));
    setMessage(null);
  }

  function startDrag(event: React.PointerEvent, key: TvLayoutKey) {
    if (!previewRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelected(key);
    const rect = previewRef.current.getBoundingClientRect();
    const original = layout.elements[key];
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (ev: PointerEvent) => {
      const x = clamp(original.x + ((ev.clientX - startX) / rect.width) * 100, -40, 40);
      const y = clamp(original.y + ((ev.clientY - startY) / rect.height) * 100, -30, 30);
      setLayout((old) => ({
        ...old,
        elements: { ...old.elements, [key]: { ...old.elements[key], x, y } },
      }));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateTvLayoutAction(JSON.stringify(layout));
      setMessage({ ok: result.ok, text: result.ok ? "تم حفظ التصميم وتحديث شاشة البث" : result.error });
    });
  }

  function resetAll() {
    startTransition(async () => {
      const result = await resetTvLayoutAction();
      if (result.ok) {
        setLayout(createDefaultTvLayout(accent));
        setConfirmReset(false);
        setMessage({ ok: true, text: "عادت الشاشة إلى التصميم الأصلي" });
      } else setMessage({ ok: false, text: result.error });
    });
  }

  const previewStyle = (key: TvLayoutKey): React.CSSProperties => {
    const item = layout.elements[key];
    return {
      color: item.color,
      opacity: item.visible ? 1 : 0.18,
      transform: `translate(${item.x}cqw, ${item.y * 0.5625}cqw) scale(${item.scale})`,
      transformOrigin: "center",
      touchAction: "none",
      outline: selected === key ? `2px solid ${accent}` : "2px solid transparent",
      outlineOffset: 3,
      cursor: "grab",
    };
  };

  return (
    <section dir="rtl" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">محرر شاشة البث</h2>
          <p className="mt-1 text-sm text-white/55">اسحب العناصر من المعاينة، ثم اضبط الحجم واللون والظهور بدقة.</p>
        </div>
        {tvUrl && (
          <a href={tvUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold hover:bg-white/5">
            <ExternalLink size={17} /> فتح شاشة البث
          </a>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
        <div className="rounded-2xl border border-white/10 bg-navy p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-white/45">
            <span>معاينة 16:9</span><span className="inline-flex items-center gap-1"><Grip size={14} /> اسحب أي عنصر</span>
          </div>
          <div
            ref={previewRef}
            className="relative aspect-video select-none overflow-hidden rounded-xl border border-white/10 shadow-2xl"
            style={{ backgroundColor: layout.backgroundColor, touchAction: "none", containerType: "inline-size" }}
          >
            <button type="button" onPointerDown={(e) => startDrag(e, "header")} onClick={() => setSelected("header")} style={previewStyle("header")} className="absolute right-[4%] top-[6%] flex items-center gap-2 rounded-lg p-1 text-right">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-512x512.png" alt="" className="h-7 w-7 rounded-full sm:h-10 sm:w-10" />
              <span className="text-sm font-black sm:text-xl">أكك لايف</span>
            </button>
            <button type="button" onPointerDown={(e) => startDrag(e, "team1")} onClick={() => setSelected("team1")} style={previewStyle("team1")} className="absolute right-[12%] top-[29%] w-[25%] rounded-xl py-2 text-center">
              <span className="block text-xs font-bold sm:text-base">لنا</span><strong className="block text-4xl leading-none sm:text-7xl">88</strong>
            </button>
            <button type="button" onPointerDown={(e) => startDrag(e, "difference")} onClick={() => setSelected("difference")} style={previewStyle("difference")} className="absolute right-[44%] top-[38%] rounded-lg bg-white/5 px-2 py-2 text-center sm:px-4">
              <span className="block text-[8px] text-white/50 sm:text-xs">الفرق</span><strong className="text-xl sm:text-3xl">23</strong>
            </button>
            <button type="button" onPointerDown={(e) => startDrag(e, "team2")} onClick={() => setSelected("team2")} style={previewStyle("team2")} className="absolute left-[12%] top-[29%] w-[25%] rounded-xl py-2 text-center">
              <span className="block text-xs font-bold sm:text-base">لهم</span><strong className="block text-4xl leading-none sm:text-7xl">65</strong>
            </button>
            <button type="button" onPointerDown={(e) => startDrag(e, "rounds")} onClick={() => setSelected("rounds")} style={previewStyle("rounds")} className="absolute bottom-[14%] right-[4%] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] sm:text-xs">آخر الجولات · 26 - 14</button>
            <button type="button" onPointerDown={(e) => startDrag(e, "tournament")} onClick={() => setSelected("tournament")} style={previewStyle("tournament")} className="absolute bottom-[4%] right-[28%] w-[44%] rounded-lg border border-white/10 bg-white/5 py-1 text-[8px] sm:text-xs">🏆 البطولة الحالية</button>
            <button type="button" onPointerDown={(e) => startDrag(e, "banners")} onClick={() => setSelected("banners")} style={{ ...previewStyle("banners"), backgroundColor: layout.elements.banners.color }} className="absolute inset-x-0 bottom-0 py-0.5 text-center text-[8px] font-bold text-black sm:text-xs">مساحة الإعلان</button>
          </div>
          <p className="mt-3 text-xs leading-5 text-white/40">المعاينة توضيحية. تُطبّق القيم النسبية نفسها على الصكة الحقيقية وتحافظ على تناسقها مع اختلاف حجم الشاشة.</p>
        </div>

        <aside className="space-y-4 rounded-2xl border border-white/10 bg-navy p-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-white/55">العنصر المحدد</label>
            <div className="grid grid-cols-2 gap-2">
              {ITEMS.map((item) => (
                <button key={item.key} type="button" onClick={() => setSelected(item.key)} className={`min-h-11 rounded-xl border px-2 text-xs font-bold ${selected === item.key ? "border-accent bg-accent/15 text-white" : "border-white/10 text-white/60 hover:bg-white/5"}`}>{item.label}</button>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">إظهار العنصر</span>
              <button type="button" aria-pressed={current.visible} onClick={() => updateSelected({ visible: !current.visible })} className={`flex min-h-11 min-w-24 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold ${current.visible ? "bg-green-500/15 text-green-300" : "bg-white/5 text-white/45"}`}>
                {current.visible ? <Eye size={18} /> : <EyeOff size={18} />}{current.visible ? "ظاهر" : "مخفي"}
              </button>
            </div>
            <Control label="الحجم" value={current.scale} min={0.5} max={1.8} step={0.05} display={`${Math.round(current.scale * 100)}٪`} onChange={(scale) => updateSelected({ scale })} />
            <Control label="أفقي" value={current.x} min={-40} max={40} step={1} display={`${Math.round(current.x)}`} onChange={(x) => updateSelected({ x })} />
            <Control label="عمودي" value={current.y} min={-30} max={30} step={1} display={`${Math.round(current.y)}`} onChange={(y) => updateSelected({ y })} />
            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-bold"><span>لون العنصر</span><span dir="ltr" className="font-mono text-xs text-white/50">{current.color}</span></label>
              <div className="flex gap-2">
                <input aria-label="اختيار لون العنصر" type="color" value={current.color} onChange={(e) => updateSelected({ color: e.target.value })} className="h-11 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" />
                <input aria-label="قيمة لون العنصر" dir="ltr" value={current.color} readOnly className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 font-mono text-white/65 outline-none" />
              </div>
            </div>
            <button type="button" onClick={() => updateSelected(createDefaultTvLayout(accent).elements[selected])} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-bold text-white/65 hover:bg-white/5"><RotateCcw size={17} /> إعادة هذا العنصر</button>
          </div>

          <div className="border-t border-white/10 pt-4">
            <label className="mb-2 flex items-center justify-between text-sm font-bold"><span>لون الخلفية</span><span dir="ltr" className="font-mono text-xs text-white/50">{layout.backgroundColor}</span></label>
            <input aria-label="لون خلفية الشاشة" type="color" value={layout.backgroundColor} onChange={(e) => setLayout((old) => ({ ...old, backgroundColor: e.target.value }))} className="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-transparent p-1" />
          </div>
        </aside>
      </div>

      {message && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.ok ? "border-green-500/25 bg-green-500/10 text-green-300" : "border-red-500/25 bg-red-500/10 text-red-300"}`}>{message.text}</div>}

      {confirmReset && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
          <p className="font-bold text-amber-200">هل تريد إعادة تصميم الشاشة الأصلي؟</p>
          <p className="mt-1 text-xs text-white/55">سيتم حذف تغييرات الموقع والحجم والألوان فقط. بقية إعدادات الاستديو لن تتغير.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={pending} onClick={resetAll} className="min-h-11 rounded-xl bg-amber-400 px-4 text-sm font-black text-black disabled:opacity-50">نعم، استعادة الأصلي</button>
            <button type="button" onClick={() => setConfirmReset(false)} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-bold">إلغاء</button>
          </div>
        </div>
      )}

      <div className="sticky bottom-3 z-20 flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#111118]/95 p-3 shadow-2xl backdrop-blur sm:flex-row">
        <button type="button" disabled={pending} onClick={save} className="btn-grad flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl disabled:opacity-50"><Save size={19} />{pending ? "جارٍ الحفظ…" : "حفظ وتطبيق"}</button>
        <button type="button" disabled={pending} onClick={() => setConfirmReset(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-400/25 px-5 text-sm font-bold text-red-300 hover:bg-red-400/10 disabled:opacity-50"><RotateCcw size={18} /> استعادة الافتراضي</button>
      </div>
    </section>
  );
}

function Control({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between"><label className="text-sm font-bold">{label}</label><output className="min-w-12 text-left text-xs text-white/50">{display}</output></div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`تقليل ${label}`} onClick={() => onChange(clamp(value - step, min, max))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 hover:bg-white/5"><Minus size={17} /></button>
        <input aria-label={label} type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} className="h-11 min-w-0 flex-1 accent-[#ff5e3a]" />
        <button type="button" aria-label={`زيادة ${label}`} onClick={() => onChange(clamp(value + step, min, max))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 hover:bg-white/5"><Plus size={17} /></button>
      </div>
    </div>
  );
}
