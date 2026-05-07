"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTvStudioAction } from "./actions";

const PRESET_COLORS = [
  { name: "ذهبي", value: "#f5b042" },
  { name: "برتقالي", value: "#ff5e3a" },
  { name: "وردي", value: "#e91e63" },
  { name: "بنفسجي", value: "#7c3aed" },
  { name: "أزرق", value: "#3b82f6" },
  { name: "أخضر", value: "#10b981" },
  { name: "أصفر", value: "#facc15" },
  { name: "أبيض", value: "#ffffff" },
];

export default function TvStudioForm({
  initial,
}: {
  initial: {
    tvAccentColor: string;
    tvShowRounds: boolean;
    tvShowChat: boolean;
    tvChatUrl: string | null;
    tvShowDonations: boolean;
    tvDonationUrl: string | null;
    tvShowAlert: boolean;
    tvAlertUrl: string | null;
    tvStreamlabsToken: string | null;
  };
}) {
  const router = useRouter();
  const [color, setColor] = useState(initial.tvAccentColor);
  const [showChat, setShowChat] = useState(initial.tvShowChat);
  const [showDonations, setShowDonations] = useState(initial.tvShowDonations);
  const [showAlert, setShowAlert] = useState(initial.tvShowAlert);
  const [showRounds, setShowRounds] = useState(initial.tvShowRounds);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    formData.set("tvAccentColor", color);
    if (showChat) formData.set("tvShowChat", "on");
    if (showDonations) formData.set("tvShowDonations", "on");
    if (showAlert) formData.set("tvShowAlert", "on");
    if (showRounds) formData.set("tvShowRounds", "on");
    startTransition(async () => {
      const res = await updateTvStudioAction(formData);
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      setMsg({ ok: true, text: "تم الحفظ" });
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      {/* لون الأكسنت */}
      <div>
        <label className="block text-sm mb-2 text-white/80">لون الأكسنت</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_COLORS.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-10 h-10 rounded-full border-2 transition ${
                color === c.value
                  ? "border-white scale-110"
                  : "border-white/20 hover:border-white/50"
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer bg-transparent border border-white/10"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            dir="ltr"
            className="bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-sm w-32"
            pattern="^#[0-9a-fA-F]{6}$"
          />
          <span className="text-xs text-white/50">سيُستخدم للنقاط والتمييز</span>
        </div>
      </div>

      {/* معاينة */}
      <div
        className="rounded-2xl p-6 border border-white/10 text-center bg-navy"
        style={{ "--tv-accent": color } as React.CSSProperties}
      >
        <div className="text-xs text-white/50 mb-2">معاينة</div>
        <div
          className="text-6xl font-black"
          style={{ color }}
        >
          152
        </div>
      </div>

      {/* العناصر */}
      <div className="space-y-2">
        <label className="block text-sm text-white/80 mb-2">عناصر الشاشة</label>

        <ToggleRow
          checked={showRounds}
          onChange={setShowRounds}
          label="عرض شريط الجولات"
          desc="آخر ٥ جولات أسفل الشاشة"
        />

        <ToggleRow
          checked={showChat}
          onChange={setShowChat}
          label="شات البث المباشر"
          desc="iframe من شات البث (creators.sa, StreamElements، إلخ)"
        />
        {showChat && (
          <input
            name="tvChatUrl"
            defaultValue={initial.tvChatUrl ?? ""}
            placeholder="https://overlay.creators.sa/chat/..."
            dir="ltr"
            className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-sm mr-8"
          />
        )}

        <ToggleRow
          checked={showDonations}
          onChange={setShowDonations}
          label="إشعارات الدونيشن"
          desc="iframe لإشعارات التبرعات"
        />
        {showDonations && (
          <input
            name="tvDonationUrl"
            defaultValue={initial.tvDonationUrl ?? ""}
            placeholder="https://..."
            dir="ltr"
            className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-sm mr-8"
          />
        )}

        <ToggleRow
          checked={showAlert}
          onChange={setShowAlert}
          label="صندوق التنبيهات (Alert Box)"
          desc="يظهر فوق الشاشة بخلفية شفافة — متوافق مع Streamlabs و StreamElements"
        />
        {showAlert && (
          <input
            name="tvAlertUrl"
            defaultValue={initial.tvAlertUrl ?? ""}
            placeholder="https://streamlabs.com/alert-box/v3/..."
            dir="ltr"
            className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-sm mr-8"
          />
        )}
      </div>

      {/* Streamlabs Socket Token */}
      <div>
        <label className="block text-sm font-bold mb-1">
          🔗 Streamlabs — Socket API Token
        </label>
        <p className="text-xs text-white/50 mb-2">
          للاتصال المباشر واستقبال التنبيهات نيتيف (متابع، دونيشن، اشتراك…)
          بدون iframe. احصل عليه من صفحة{" "}
          <span className="text-gold">API Settings</span> في Streamlabs.
        </p>
        <input
          name="tvStreamlabsToken"
          defaultValue={initial.tvStreamlabsToken ?? ""}
          placeholder="eyJ0eXAiOiJKV1Q..."
          dir="ltr"
          className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-sm font-mono"
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

      <button type="submit" disabled={isPending} className="btn-grad px-6 py-2 rounded-xl">
        {isPending ? "جاري الحفظ..." : "حفظ إعدادات الشاشة"}
      </button>
    </form>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-accent shrink-0"
      />
      <div className="flex-1">
        <div className="font-bold text-sm">{label}</div>
        <div className="text-xs text-white/50">{desc}</div>
      </div>
    </label>
  );
}
