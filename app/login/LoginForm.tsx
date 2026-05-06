"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "فشل تسجيل الدخول");
        return;
      }

      router.refresh();
      router.push("/");
    } catch {
      setError("تعذّر الاتصال بالخادم، تحقق من شبكتك وحاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card-elev rounded-3xl p-6 space-y-4 shadow-2xl"
    >
      <div>
        <label className="block text-sm mb-2 text-white/70">اسم المستخدم</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-accent transition-colors"
          autoFocus
          required
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm mb-2 text-white/70">كلمة السر</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-accent transition-colors"
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="bg-danger/15 border border-danger/30 rounded-xl px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-grad w-full py-3.5 rounded-xl text-lg"
      >
        {loading ? "..." : "دخول"}
      </button>
    </form>
  );
}
