"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteTournamentAction } from "./actions";

type Row = {
  id: string;
  name: string;
  format: "KNOCKOUT" | "POINTS";
  matchBestOf: number;
  status: string;
  teamsCount: number;
};

const FORMAT_LABEL: Record<string, string> = {
  KNOCKOUT: "خروج المغلوب",
  POINTS: "تجميع النقاط",
};
const STATUS_LABEL: Record<string, { t: string; cls: string }> = {
  DRAFT: { t: "إعداد", cls: "bg-white/10 text-white/60" },
  DRAWN: { t: "تمت القرعة", cls: "bg-sky-500/20 text-sky-300" },
  IN_PROGRESS: { t: "جارية", cls: "bg-green-500/20 text-green-300" },
  COMPLETED: { t: "انتهت", cls: "bg-gold/20 text-gold" },
};

export default function TournamentsList({ tournaments }: { tournaments: Row[] }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function remove(t: Row) {
    if (!confirm(`حذف بطولة «${t.name}»؟ لا يمكن التراجع.`)) return;
    setBusyId(t.id);
    start(async () => {
      const res = await deleteTournamentAction(t.id);
      setBusyId(null);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  if (tournaments.length === 0) {
    return (
      <div className="bg-navy rounded-2xl p-8 text-center text-white/40 border border-white/10">
        ما في بطولات بعد — أنشئ أول بطولة فوق
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tournaments.map((t) => {
        const st = STATUS_LABEL[t.status] ?? STATUS_LABEL.DRAFT;
        return (
          <div
            key={t.id}
            className="bg-navy rounded-2xl border border-white/10 hover:border-gold/40 transition-colors flex items-stretch"
          >
            <Link href={`/tournaments/${t.id}`} className="flex-1 min-w-0 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-lg truncate">{t.name || "— بدون اسم —"}</div>
                  <div className="text-xs text-white/50 mt-0.5">
                    {FORMAT_LABEL[t.format]} ·{" "}
                    {t.matchBestOf === 3 ? "أفضل من ٣" : "صكة واحدة"} · {t.teamsCount} فريق
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full shrink-0 ${st.cls}`}>
                  {st.t}
                </span>
              </div>
            </Link>
            <button
              onClick={() => remove(t)}
              disabled={isPending && busyId === t.id}
              className="px-4 shrink-0 text-red-400/50 hover:text-red-400 hover:bg-danger/10 rounded-l-2xl transition-colors flex items-center"
              title="حذف البطولة"
            >
              {isPending && busyId === t.id ? "…" : "🗑"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
