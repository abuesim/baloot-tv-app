"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tv, ArrowLeft } from "lucide-react";

export default function TvEntryPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(i: number, val: string) {
    // قبول أرقام فقط
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    setError(null);

    // انتقل للخانة التالية تلقائياً
    if (digit && i < 5) {
      inputs.current[i + 1]?.focus();
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
    if (e.key === "Enter") submit();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setCode(next);
    // فوكس على آخر خانة مملوءة
    const last = Math.min(pasted.length, 5);
    inputs.current[last]?.focus();
  }

  function submit() {
    const full = code.join("");
    if (full.length < 6) {
      setError("أدخل الكود المكوّن من ٦ أرقام كاملاً");
      return;
    }
    router.push(`/tv/${full}`);
  }

  const isFull = code.every((d) => d !== "");

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 gap-8"
    >
      {/* عنوان */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Tv className="w-10 h-10 text-gold" />
        </div>
        <h1 className="text-3xl font-black text-gold">شاشة البث</h1>
        <p className="text-white/60 text-sm">
          أدخل كود البث للاتصال بالمباراة على شاشة التلفزيون
        </p>
      </div>

      {/* بوكس الكود */}
      <div className="bg-navy border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-6">
        <div>
          <label className="block text-sm text-white/70 mb-4 text-center">
            كود البث (٦ أرقام)
          </label>
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className={`w-11 h-14 text-center text-2xl font-black rounded-xl border-2 bg-navy-light transition-all outline-none
                  ${digit
                    ? "border-gold text-gold"
                    : "border-white/20 text-white focus:border-gold/60"
                  }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 text-center">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!isFull}
          className="btn-grad w-full py-3.5 rounded-xl text-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          اتصال بالشاشة
        </button>
      </div>

      {/* تعليمة الـ QR */}
      <div className="text-center max-w-xs">
        <p className="text-white/40 text-xs leading-relaxed">
          يمكنك أيضاً مسح رمز QR الظاهر في صفحة الملف الشخصي مباشرةً بكاميرا الجوال للاتصال الفوري
        </p>
      </div>

      {/* زر الرجوع */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        رجوع
      </button>
    </div>
  );
}
