"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUserAction } from "./actions";

export default function NewUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createUserAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      (document.getElementById("new-user-form") as HTMLFormElement)?.reset();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-grad px-5 py-3 rounded-xl"
      >
        + إضافة مستخدم
      </button>
    );
  }

  return (
    <form
      id="new-user-form"
      action={onSubmit}
      className="bg-navy p-6 rounded-2xl border border-white/10 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">مستخدم جديد</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-white/60 hover:text-white"
        >
          إلغاء
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2 text-white/80">اسم المستخدم</label>
          <input
            name="username"
            required
            className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
            dir="ltr"
            placeholder="user123"
          />
        </div>
        <div>
          <label className="block text-sm mb-2 text-white/80">اسم العرض</label>
          <input
            name="displayName"
            required
            className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
            placeholder="محمد"
          />
        </div>
        <div>
          <label className="block text-sm mb-2 text-white/80">كلمة السر</label>
          <input
            name="password"
            type="password"
            required
            className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm mb-2 text-white/80">الصلاحية</label>
          <select
            name="role"
            defaultValue="USER"
            className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
          >
            <option value="USER">مستخدم</option>
            <option value="CONTENT_CREATOR">صانع محتوى</option>
            <option value="SUPPORT">دعم فني</option>
            <option value="ADMIN">أدمن</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-danger/20 border border-danger/40 rounded-xl p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-grad px-6 py-2 rounded-xl"
      >
        {isPending ? "جاري الإنشاء..." : "إنشاء"}
      </button>
    </form>
  );
}
