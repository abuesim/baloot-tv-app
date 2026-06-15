"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { deleteTournamentAction } from "./actions";

export type ChampionLite = {
  name: string;
  p1: string;
  p1img: string | null;
  p2: string;
  p2img: string | null;
};
type Row = {
  id: string;
  name: string;
  format: "KNOCKOUT" | "POINTS";
  matchBestOf: number;
  status: string;
  teamsCount: number;
  champion: ChampionLite | null;
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

export default function TournamentsList({
  tournaments,
  canDelete = true,
}: {
  tournaments: Row[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function remove(t: Row) {
    if (!confirm(`حذف بطولة «${t.name || "بدون اسم"}»؟ لا يمكن التراجع.`)) return;
    setBusyId(t.id);
    start(async () => {
      const res = await deleteTournamentAction(t.id);
      setBusyId(null);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  const active = tournaments.filter((t) => t.status !== "COMPLETED");
  const completed = tournaments.filter((t) => t.status === "COMPLETED");

  return (
    <div className="space-y-8">
      {/* البطولات النشطة */}
      <div className="space-y-3">
        {active.length === 0 && completed.length === 0 ? (
          <div className="bg-navy rounded-2xl p-8 text-center text-white/40 border border-white/10">
            ما في بطولات بعد — أنشئ أول بطولة فوق
          </div>
        ) : active.length === 0 ? (
          <div className="text-sm text-white/40 text-center py-2">ما في بطولات نشطة</div>
        ) : (
          active.map((t) => {
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
                {canDelete && <DeleteBtn onClick={() => remove(t)} busy={isPending && busyId === t.id} />}
              </div>
            );
          })
        )}
      </div>

      {/* سجل البطولات — المنتهية مع البطل */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            🏆 سجل البطولات
            <span className="text-sm font-normal text-white/40">({completed.length})</span>
          </h2>
          {completed.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-gold/30 bg-gradient-to-l from-gold/15 to-transparent hover:border-gold/55 transition-colors flex items-stretch"
            >
              <Link href={`/tournaments/${t.id}`} className="flex-1 min-w-0 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-3xl">🏆</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{t.name || "بطولة"}</div>
                    <div className="text-xs text-white/50">
                      {FORMAT_LABEL[t.format]} · {t.teamsCount} فريق
                    </div>
                  </div>
                  {t.champion ? (
                    <div className="flex items-center gap-2 bg-gold/10 rounded-xl px-3 py-1.5 border border-gold/20">
                      <span className="text-[10px] text-gold font-bold">البطل</span>
                      <div className="flex -space-x-2 -space-x-reverse">
                        <PlayerAvatar name={t.champion.p1} imageUrl={t.champion.p1img} size="sm" className="ring-2 ring-navy" />
                        <PlayerAvatar name={t.champion.p2} imageUrl={t.champion.p2img} size="sm" className="ring-2 ring-navy" />
                      </div>
                      <span className="text-sm font-bold">{t.champion.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-white/40">بدون بطل</span>
                  )}
                </div>
              </Link>
              <DeleteBtn onClick={() => remove(t)} busy={isPending && busyId === t.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteBtn({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="px-4 shrink-0 text-red-400/50 hover:text-red-400 hover:bg-danger/10 rounded-l-2xl transition-colors flex items-center"
      title="حذف البطولة"
    >
      {busy ? "…" : "🗑"}
    </button>
  );
}
