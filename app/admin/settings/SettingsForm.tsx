"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppSetting } from "@prisma/client";
import { updateSettingsAction } from "./actions";

export default function SettingsForm({ settings }: { settings: AppSetting }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await updateSettingsAction(formData);
      if (!res.ok) {
        setMsg({ type: "error", text: res.error });
        return;
      }
      setMsg({ type: "ok", text: "تم الحفظ" });
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="bg-navy p-6 rounded-2xl border border-white/10 space-y-5">
      <div>
        <label className="block text-sm mb-2 text-white/80">اسم التطبيق</label>
        <input
          name="appName"
          defaultValue={settings.appName}
          required
          className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm mb-2 text-white/80">الشعار</label>
        <input
          name="appTagline"
          defaultValue={settings.appTagline}
          className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm mb-2 text-white/80">
          الهدف الافتراضي (نقاط)
        </label>
        <input
          name="defaultTargetScore"
          type="number"
          defaultValue={settings.defaultTargetScore}
          min={50}
          max={500}
          required
          dir="ltr"
          className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
        />
      </div>

      <hr className="border-white/10" />

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="maintenanceMode"
            defaultChecked={settings.maintenanceMode}
            className="w-5 h-5 accent-accent"
          />
          <span className="font-bold">وضع الصيانة</span>
        </label>
        <p className="text-xs text-white/50 mt-1 mr-8">
          عند التفعيل، يُمنع كل المستخدمين العاديين من استخدام التطبيق (الأدمن فقط يقدر يدخل).
        </p>
      </div>

      <div>
        <label className="block text-sm mb-2 text-white/80">رسالة الصيانة</label>
        <textarea
          name="maintenanceMessage"
          defaultValue={settings.maintenanceMessage}
          rows={2}
          className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
        />
      </div>

      {msg && (
        <div
          className={`rounded-xl p-3 text-sm ${
            msg.type === "ok"
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
