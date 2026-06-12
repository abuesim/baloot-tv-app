import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import CreateTournamentForm from "./CreateTournamentForm";

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

export default async function TournamentsPage() {
  const user = await requireUser();
  const ownerUserId = user.parentUserId ?? user.id;

  const tournaments = await db.tournament.findMany({
    where: { userId: ownerUserId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { teams: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">البطولات</h1>
        <p className="text-white/60">نظّم بطولة بين فرقك</p>
      </div>

      <CreateTournamentForm />

      <div className="space-y-3">
        {tournaments.length === 0 ? (
          <div className="bg-navy rounded-2xl p-8 text-center text-white/40 border border-white/10">
            ما في بطولات بعد — أنشئ أول بطولة فوق
          </div>
        ) : (
          tournaments.map((t) => {
            const st = STATUS_LABEL[t.status] ?? STATUS_LABEL.DRAFT;
            return (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="block bg-navy rounded-2xl p-5 border border-white/10 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-lg truncate">{t.name}</div>
                    <div className="text-xs text-white/50 mt-0.5">
                      {FORMAT_LABEL[t.format]} · {t.matchBestOf === 3 ? "أفضل من ٣" : "صكة واحدة"} ·{" "}
                      {t._count.teams} فريق
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full shrink-0 ${st.cls}`}>
                    {st.t}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
