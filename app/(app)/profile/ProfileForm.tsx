"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "./actions";

export default function ProfileForm({
  displayName,
  tvOrientation,
  calculatorStyle,
}: {
  displayName: string;
  tvOrientation: "LANDSCAPE" | "PORTRAIT";
  calculatorStyle: "CLASSIC" | "ADVANCED";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [orientation, setOrientation] = useState<"LANDSCAPE" | "PORTRAIT">(tvOrientation);
  const [calcStyle, setCalcStyle] = useState<"CLASSIC" | "ADVANCED">(calculatorStyle);

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await updateProfileAction(formData);
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      setMsg({ ok: true, text: "تم الحفظ" });
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-2 text-white/80">اسم العرض</label>
        <input
          name="displayName"
          defaultValue={displayName}
          className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 text-white/80">اتجاه شاشة التلفزيون</label>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 ${
              orientation === "LANDSCAPE"
                ? "border-gold bg-gold/10"
                : "border-white/10 bg-navy-light hover:border-white/30"
            }`}
          >
            <input
              type="radio"
              name="tvOrientation"
              value="LANDSCAPE"
              checked={orientation === "LANDSCAPE"}
              onChange={() => setOrientation("LANDSCAPE")}
              className="sr-only"
            />
            <div className="w-12 h-7 border-2 border-current rounded" />
            <div>
              <div className="font-bold">عرضي</div>
              <div className="text-xs text-white/60">للشاشات الأفقية</div>
            </div>
          </label>
          <label
            className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 ${
              orientation === "PORTRAIT"
                ? "border-gold bg-gold/10"
                : "border-white/10 bg-navy-light hover:border-white/30"
            }`}
          >
            <input
              type="radio"
              name="tvOrientation"
              value="PORTRAIT"
              checked={orientation === "PORTRAIT"}
              onChange={() => setOrientation("PORTRAIT")}
              className="sr-only"
            />
            <div className="w-7 h-12 border-2 border-current rounded" />
            <div>
              <div className="font-bold">طولي</div>
              <div className="text-xs text-white/60">للشاشات العمودية</div>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2 text-white/80">نوع الحاسبة</label>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`p-3 rounded-xl border-2 cursor-pointer ${
              calcStyle === "CLASSIC"
                ? "border-gold bg-gold/10"
                : "border-white/10 bg-navy-light hover:border-white/30"
            }`}
          >
            <input
              type="radio"
              name="calculatorStyle"
              value="CLASSIC"
              checked={calcStyle === "CLASSIC"}
              onChange={() => setCalcStyle("CLASSIC")}
              className="sr-only"
            />
            <div className="font-bold mb-1">كلاسيكية</div>
            <div className="text-xs text-white/60">
              التصميم الحالي مع كل الميزات
            </div>
          </label>
          <label
            className={`p-3 rounded-xl border-2 cursor-pointer ${
              calcStyle === "ADVANCED"
                ? "border-gold bg-gold/10"
                : "border-white/10 bg-navy-light hover:border-white/30"
            }`}
          >
            <input
              type="radio"
              name="calculatorStyle"
              value="ADVANCED"
              checked={calcStyle === "ADVANCED"}
              onChange={() => setCalcStyle("ADVANCED")}
              className="sr-only"
            />
            <div className="font-bold mb-1">متقدمة ✨</div>
            <div className="text-xs text-white/60">
              تصميم مينمالي مع اختصارات سريعة
            </div>
          </label>
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-xl p-3 text-sm ${
            msg.ok
              ? "bg-green-500/20 text-green-300"
              : "bg-danger/20 text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-grad px-6 py-2 rounded-xl"
      >
        {isPending ? "جاري الحفظ..." : "حفظ"}
      </button>
    </form>
  );
}
