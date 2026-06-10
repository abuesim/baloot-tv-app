"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();

  // وضع الفورم: login أو register
  const [mode, setMode] = useState<"login" | "register">("login");

  // حقول تسجيل الدخول
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // حقول إضافية للتسجيل
  const [phone, setPhone] = useState("");

  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, start]    = useTransition();

  function reset() {
    setError(null);
    setSuccess(false);
    setUsername("");
    setPassword("");
    setPhone("");
  }

  function switchMode(m: "login" | "register") {
    reset();
    setMode(m);
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error ?? "فشل تسجيل الدخول");
          return;
        }
        router.refresh();
        router.push("/");
      } catch {
        setError("تعذّر الاتصال بالخادم، تحقق من شبكتك وحاول مرة أخرى");
      }
    });
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, phone }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(d.error ?? "فشل إنشاء الحساب");
          return;
        }
        setSuccess(true);
      } catch {
        setError("تعذّر الاتصال بالخادم، تحقق من شبكتك وحاول مرة أخرى");
      }
    });
  }

  /* ── تبويبات الوضع ── */
  const tabBase =
    "flex-1 py-2 text-sm font-bold rounded-xl transition-colors";
  const tabActive   = "bg-gold text-navy-deep";
  const tabInactive = "text-white/50 hover:text-white/80";

  return (
    <div className="card-elev rounded-3xl p-6 shadow-2xl space-y-5">
      {/* تبويبات */}
      <div className="flex gap-1 bg-navy rounded-xl p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`${tabBase} ${mode === "login" ? tabActive : tabInactive}`}
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`${tabBase} ${mode === "register" ? tabActive : tabInactive}`}
        >
          حساب جديد
        </button>
      </div>

      {/* ── فورم الدخول ── */}
      {mode === "login" && (
        <form onSubmit={onLogin} className="space-y-4">
          <Field
            label="اسم المستخدم"
            type="text"
            value={username}
            onChange={setUsername}
            disabled={isPending}
            autoFocus
          />
          <Field
            label="كلمة السر"
            type="password"
            value={password}
            onChange={setPassword}
            disabled={isPending}
          />

          {error && <ErrorBox msg={error} />}

          <button
            type="submit"
            disabled={isPending}
            className="btn-grad w-full py-3.5 rounded-xl text-lg"
          >
            {isPending ? "..." : "دخول"}
          </button>
        </form>
      )}

      {/* ── فورم التسجيل ── */}
      {mode === "register" && !success && (
        <form onSubmit={onRegister} className="space-y-4">
          <Field
            label="اسم المستخدم"
            type="text"
            value={username}
            onChange={setUsername}
            disabled={isPending}
            autoFocus
            hint="حروف إنجليزية صغيرة وأرقام و _ فقط"
          />
          <Field
            label="رقم الجوال"
            type="tel"
            value={phone}
            onChange={setPhone}
            disabled={isPending}
            hint="مثال: 0501234567"
          />
          <div>
            <label className="block text-sm mb-1.5 text-white/70">كلمة السر</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-accent transition-colors pr-10"
                required
                disabled={isPending}
                minLength={4}
              />
              {password.length >= 4 && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 text-lg select-none">
                  ✓
                </span>
              )}
            </div>
            <p className="text-xs mt-1 transition-colors" style={{ color: password.length > 0 && password.length < 4 ? "#f87171" : "rgba(255,255,255,0.3)" }}>
              {password.length > 0 && password.length < 4
                ? `تبقّى ${4 - password.length} ${4 - password.length === 1 ? "حرف" : "أحرف"}`
                : "٤ أحرف على الأقل"}
            </p>
          </div>

          {error && <ErrorBox msg={error} />}

          <button
            type="submit"
            disabled={isPending}
            className="btn-grad w-full py-3.5 rounded-xl text-lg"
          >
            {isPending ? "..." : "إنشاء الحساب"}
          </button>

          <p className="text-center text-xs text-white/40 leading-relaxed">
            الحساب الجديد يكون معطلاً حتى يفعّله الأدمن
          </p>
        </form>
      )}

      {/* ── نجاح التسجيل ── */}
      {mode === "register" && success && (
        <div className="space-y-4 text-center py-2">
          <div className="text-5xl">✅</div>
          <div>
            <p className="font-bold text-lg text-white">تم إرسال الطلب</p>
            <p className="text-white/60 text-sm mt-1 leading-relaxed">
              سيتم تفعيل حسابك من قِبَل الإدارة قريباً،
              <br />
              ثم تقدر تسجّل الدخول باسم المستخدم وكلمة السر.
            </p>
          </div>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="btn-grad px-8 py-2.5 rounded-xl text-sm"
          >
            تسجيل الدخول
          </button>
        </div>
      )}
    </div>
  );
}

/* ── مكونات مساعدة ── */
function Field({
  label,
  type,
  value,
  onChange,
  disabled,
  autoFocus,
  hint,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1.5 text-white/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-accent transition-colors"
        autoFocus={autoFocus}
        required
        disabled={disabled}
      />
      {hint && <p className="text-xs text-white/30 mt-1">{hint}</p>}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-danger/15 border border-danger/30 rounded-xl px-4 py-3 text-sm text-red-300">
      {msg}
    </div>
  );
}
