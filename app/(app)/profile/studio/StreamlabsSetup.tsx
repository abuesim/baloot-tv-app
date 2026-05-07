"use client";

import { useState } from "react";

export default function StreamlabsSetup({
  origin,
  tvCode,
}: {
  origin: string;
  tvCode: string;
}) {
  const [tab, setTab] = useState<"socket" | "html">("socket");
  const apiUrl = `${origin}/api/tv/${tvCode}/push-alert`;
  const [copied, setCopied] = useState(false);

  const snippet = `<script>
window.addEventListener('onEventReceived', function(obj) {
  var d = obj.detail || {};
  var e = d.event || {};
  fetch('${apiUrl}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listener: d.listener || '',
      name: e.name || '',
      amount: String(e.amount || ''),
      currency: e.currency || '',
      message: e.message || '',
    })
  }).catch(function(){});
});
<\/script>`;

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <section className="bg-navy rounded-2xl p-6 border border-white/10 space-y-4">
      <div>
        <h2 className="font-bold text-lg mb-1">🔔 تكامل Streamlabs</h2>
        <p className="text-xs text-white/50">
          تنبيهات المتابعين والدونيشن تظهر مباشرة على شاشة TV
        </p>
      </div>

      {/* تبديل الطريقة */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("socket")}
          className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${
            tab === "socket"
              ? "bg-gold text-navy-deep"
              : "bg-white/10 text-white/60 hover:text-white"
          }`}
        >
          ⚡ Socket Token (موصى به)
        </button>
        <button
          onClick={() => setTab("html")}
          className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${
            tab === "html"
              ? "bg-gold text-navy-deep"
              : "bg-white/10 text-white/60 hover:text-white"
          }`}
        >
          Custom HTML
        </button>
      </div>

      {tab === "socket" && (
        <div className="space-y-3">
          <p className="text-sm text-white/80">
            أسرع وأبسط — فقط الصق الـ Socket API Token في حقل
            <span className="text-gold font-bold mx-1">Streamlabs — Socket API Token</span>
            في الإعدادات أعلاه.
          </p>
          <ol className="space-y-3 text-sm">
            <Step n={1}>
              افتح{" "}
              <a
                href="https://streamlabs.com/dashboard#/settings/api-settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline"
              >
                Streamlabs ← API Settings
              </a>
            </Step>
            <Step n={2}>
              انسخ{" "}
              <span className="text-gold font-bold">Socket API Token</span>{" "}
              (الرمز الطويل JWT)
            </Step>
            <Step n={3}>
              الصقه في حقل{" "}
              <span className="text-gold font-bold">Socket API Token</span>{" "}
              في قسم إعدادات الشاشة أعلاه واضغط حفظ
            </Step>
          </ol>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-xs text-white/70">
            <span className="text-green-400 font-bold">✓ نتيجة: </span>
            شاشة TV ستتصل مباشرة بـ Streamlabs وتستقبل التنبيهات في الوقت الفعلي —
            متابع، دونيشن، اشتراك، bits، ريد — وتعرضها في الزاوية العلوية تلقائيًا.
          </div>
        </div>
      )}

      {tab === "html" && (
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            بديل إذا كانت لديك مشكلة مع الـ Socket Token.
          </p>
          <ol className="space-y-3 text-sm">
            <Step n={1}>
              افتح <strong>Streamlabs ← Alert Box ← Settings ← Custom HTML/CSS</strong>
            </Step>
            <Step n={2}>
              فعّل{" "}
              <span className="text-gold font-bold">Enable Custom HTML/CSS</span>
            </Step>
            <Step n={3}>
              في حقل <strong>HTML</strong> أضف الكود التالي في النهاية:
            </Step>
          </ol>

          <div className="relative">
            <pre
              dir="ltr"
              className="bg-[#0a0f1c] border border-white/10 rounded-xl p-4 text-xs text-green-300 overflow-x-auto whitespace-pre-wrap leading-relaxed"
            >
              {snippet}
            </pre>
            <button
              onClick={copy}
              className="absolute top-3 left-3 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? "✓ تم النسخ" : "نسخ"}
            </button>
          </div>

          <Step n={4}>
            اضغط <strong>Save</strong>
          </Step>
        </div>
      )}
    </section>
  );
}

function Step({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 items-start list-none">
      <span className="bg-gold/20 text-gold font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <span className="text-white/80 leading-relaxed">{children}</span>
    </li>
  );
}
