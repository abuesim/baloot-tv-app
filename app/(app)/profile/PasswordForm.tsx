"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "./actions";

export default function PasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await changePasswordAction(formData);
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      setMsg({ ok: true, text: "تم تغيير كلمة السر" });
      (document.getElementById("password-form") as HTMLFormElement)?.reset();
    });
  }

  return (
    <form id="password-form" action={onSubmit} className="space-y-3 max-w-sm">
      <div>
        <label className="block text-sm mb-1 text-white/80">كلمة السر الحالية</label>
        <input
          name="currentPassword"
          type="password"
          required
          dir="ltr"
          className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm mb-1 text-white/80">كلمة السر الجديدة</label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={6}
          dir="ltr"
          className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm mb-1 text-white/80">تأكيد كلمة السر</label>
        <input
          name="confirmPassword"
          type="password"
          required
          dir="ltr"
          className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
        />
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
        {isPending ? "..." : "تغيير"}
      </button>
    </form>
  );
}
