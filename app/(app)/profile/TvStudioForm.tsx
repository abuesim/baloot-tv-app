"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateTvStudioAction, uploadAlertSoundAction, removeAlertSoundAction } from "./actions";

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
    tvAlertSound: string | null;
    tvRefreshSeconds: number;
  };
}) {
  const router = useRouter();
  const [color, setColor] = useState(initial.tvAccentColor);
  const [showChat, setShowChat] = useState(initial.tvShowChat);
  const [showDonations, setShowDonations] = useState(initial.tvShowDonations);
  const [showAlert, setShowAlert] = useState(initial.tvShowAlert);
  const [showRounds, setShowRounds] = useState(initial.tvShowRounds);
  // التحديث الإجباري بعدّاد — 0 يعني مُطفأ
  const [autoRefresh, setAutoRefresh] = useState(initial.tvRefreshSeconds > 0);
  const [refreshSeconds, setRefreshSeconds] = useState(
    initial.tvRefreshSeconds > 0 ? initial.tvRefreshSeconds : 10,
  );
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ─── صوت التنبيه ───
  const [soundUrl, setSoundUrl] = useState<string | null>(initial.tvAlertSound);
  const [soundName, setSoundName] = useState<string | null>(null);
  const [soundUploading, setSoundUploading] = useState(false);
  const soundInputRef = useRef<HTMLInputElement>(null);

  async function handleSoundFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSoundName(file.name);
    setSoundUploading(true);
    setMsg(null);
    try {
      // نحوّل الملف إلى base64 في المتصفح — يعمل على Vercel
      const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
      if (file.size > MAX_BYTES) {
        setMsg({ ok: false, text: "حجم الملف أكبر من ٥ ميجا" });
        setSoundUploading(false);
        return;
      }
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("فشل قراءة الملف"));
        reader.readAsDataURL(file);
      });
      const fd = new FormData();
      fd.append("soundBase64", dataUri);
      const res = await uploadAlertSoundAction(fd);
      if (res.ok && res.url) {
        setSoundUrl(res.url);
        setMsg({ ok: true, text: "✅ تم رفع الصوت" });
      } else {
        setMsg({ ok: false, text: res.error ?? "فشل رفع الصوت" });
      }
    } catch {
      setMsg({ ok: false, text: "فشل معالجة الملف الصوتي" });
    } finally {
      setSoundUploading(false);
    }
  }

  async function handleRemoveSound() {
    setSoundUploading(true);
    await removeAlertSoundAction();
    setSoundUrl(null);
    setSoundName(null);
    setSoundUploading(false);
    if (soundInputRef.current) soundInputRef.current.value = "";
    router.refresh();
  }

  function onSubmit(formData: FormData) {
    setMsg(null);
    formData.set("tvAccentColor", color);
    if (showChat) formData.set("tvShowChat", "on");
    if (showDonations) formData.set("tvShowDonations", "on");
    if (showAlert) formData.set("tvShowAlert", "on");
    if (showRounds) formData.set("tvShowRounds", "on");
    formData.set("tvRefreshSeconds", String(autoRefresh ? refreshSeconds : 0));
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
          label="💰 شريط الدونيشن"
          desc="يظهر شريط تمرير أسفل الشاشة بأسماء المتبرعين — يصل تلقائياً عبر Streamlabs"
        />

        <ToggleRow
          checked={showAlert}
          onChange={setShowAlert}
          label="🎁 شريط التنبيهات"
          desc="هدايا TikTok، اشتراكات، متابعين — overlay.creators.sa أو Streamlabs أو StreamElements"
        />
        {showAlert && (
          <div className="mr-8 space-y-2">
            <input
              name="tvAlertUrl"
              defaultValue={initial.tvAlertUrl ?? ""}
              placeholder="https://overlay.creators.sa/alerts/CREATORS_..."
              dir="ltr"
              className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-white/40">
              💡 يظهر فوق الشاشة بخلفية شفافة — مثل OBS Browser Source
            </p>
          </div>
        )}
      </div>

      {/* التحديث الإجباري بعدّاد تنازلي */}
      <div className="bg-navy-light/40 rounded-xl p-3 border border-white/5">
        <ToggleRow
          checked={autoRefresh}
          onChange={setAutoRefresh}
          label="⏱️ تحديث الشاشة بعدّاد تنازلي"
          desc="افتراضياً مُطفأ (تحديث لحظي). فعّله لتحديث الشاشة إجبارياً كل عدد ثوانٍ مع ظهور عدّاد بجانب الشعار."
        />
        {autoRefresh && (
          <div className="mr-8 mt-2 flex items-center gap-3">
            <span className="text-sm text-white/70">كل</span>
            <input
              type="number"
              min={3}
              max={120}
              value={refreshSeconds}
              onChange={(e) =>
                setRefreshSeconds(
                  Math.max(3, Math.min(120, Number(e.target.value) || 3)),
                )
              }
              className="w-20 bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-sm text-center tabular-nums"
            />
            <span className="text-sm text-white/70">ثانية</span>
            <div className="flex gap-1">
              {[5, 8, 10, 15].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setRefreshSeconds(s)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    refreshSeconds === s
                      ? "bg-gold text-navy-deep font-bold"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
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

      {/* صوت التنبيه */}
      <div>
        <label className="block text-sm font-bold mb-1">🔊 صوت التنبيه</label>
        <p className="text-xs text-white/50 mb-2">
          MP3 أو WAV — حتى ٥ ميجا. يُشغَّل عند كل تنبيه على الشاشة.
          {!soundUrl && " إذا فارغ يُستخدم صوت Streamlabs الافتراضي."}
        </p>

        {soundUrl ? (
          <div className="flex items-center gap-3 bg-navy-light border border-white/10 rounded-xl px-3 py-2">
            {/* مشغّل مدمج */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={soundUrl} controls className="h-8 flex-1 min-w-0" />
            <span className="text-xs text-white/40 truncate max-w-28">
              {soundName ?? soundUrl.split("/").pop()}
            </span>
            <button
              type="button"
              onClick={handleRemoveSound}
              disabled={soundUploading}
              className="text-red-400 hover:text-red-300 text-lg leading-none shrink-0"
              title="حذف الصوت"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-3 bg-navy-light border border-dashed border-white/20 rounded-xl px-4 py-3 cursor-pointer hover:border-white/40 transition-colors">
            <span className="text-2xl">🎵</span>
            <span className="text-sm text-white/60">
              {soundUploading ? "⏳ جاري الرفع..." : "اضغط لاختيار ملف صوتي"}
            </span>
            <input
              ref={soundInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,.mp3,.wav,.ogg,.m4a"
              onChange={handleSoundFile}
              disabled={soundUploading}
              className="hidden"
            />
          </label>
        )}
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
