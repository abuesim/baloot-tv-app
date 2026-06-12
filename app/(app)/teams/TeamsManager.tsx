"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import PlayerSelect, { type SelectablePlayer } from "@/components/PlayerSelect";
import { createTeamAction, deleteTeamAction } from "./actions";

type TeamRow = {
  id: string;
  name: string;
  player1: SelectablePlayer;
  player2: SelectablePlayer;
  tournamentsCount: number;
};

export default function TeamsManager({
  availablePlayers,
  totalPlayers,
  teams,
}: {
  availablePlayers: SelectablePlayer[];
  totalPlayers: number;
  teams: TeamRow[];
}) {
  const router = useRouter();
  const byId = new Map(availablePlayers.map((p) => [p.id, p]));

  const [name, setName] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  // لا نعرض اللاعب المختار في المنتقي الآخر (والمتاحون أصلاً غير مستخدَمين)
  const opts1 = availablePlayers.filter((p) => p.id !== p2);
  const opts2 = availablePlayers.filter((p) => p.id !== p1);

  function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("اكتب اسم الفريق");
    if (!p1 || !p2) return setError("اختر اللاعبين");
    start(async () => {
      const res = await createTeamAction({ name, player1Id: p1, player2Id: p2 });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setP1("");
      setP2("");
      router.refresh();
    });
  }

  function remove(team: TeamRow) {
    if (!confirm(`حذف فريق «${team.name}»؟`)) return;
    start(async () => {
      const res = await deleteTeamAction(team.id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  // اقتراح اسم تلقائي من اللاعبين
  const suggestedName =
    p1 && p2 ? `${byId.get(p1)?.name} و ${byId.get(p2)?.name}` : "";

  return (
    <div className="space-y-6">
      {/* إنشاء فريق */}
      {availablePlayers.length >= 2 ? (
        <form
          onSubmit={create}
          className="bg-navy rounded-2xl p-5 border border-white/10 space-y-4"
        >
          <h2 className="font-bold text-lg">➕ فريق جديد</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PlayerSelect
              label="اللاعب الأول"
              value={p1}
              onChange={setP1}
              options={opts1}
              byId={byId}
            />
            <PlayerSelect
              label="اللاعب الثاني"
              value={p2}
              onChange={setP2}
              options={opts2}
              byId={byId}
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-white/80">اسم الفريق</label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: الصقور"
                className="flex-1 bg-navy-light border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent"
              />
              {suggestedName && name !== suggestedName && (
                <button
                  type="button"
                  onClick={() => setName(suggestedName)}
                  className="text-xs px-3 rounded-xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 whitespace-nowrap"
                >
                  استخدم: {suggestedName}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-grad px-6 py-2.5 rounded-xl"
          >
            {isPending ? "..." : "إنشاء الفريق"}
          </button>
        </form>
      ) : totalPlayers < 2 ? (
        <div className="bg-navy/60 rounded-2xl p-4 border border-white/10 text-sm text-white/70">
          تحتاج لاعبَين على الأقل لتكوين فريق. أضِف لاعبين من صفحة «اللاعبون».
        </div>
      ) : (
        <div className="bg-navy/60 rounded-2xl p-4 border border-white/10 text-sm text-white/70">
          كل لاعبينك موجودون في فرق بالفعل. كل لاعب يكون في فريق واحد فقط — احذف فريقاً لتحرير لاعبيه.
        </div>
      )}

      {/* قائمة الفرق */}
      <div>
        <h2 className="font-bold text-lg mb-3">الفرق ({teams.length})</h2>
        {teams.length === 0 ? (
          <div className="bg-navy rounded-2xl p-8 text-center text-white/40 border border-white/10">
            ما في فرق بعد — كوّن أول فريق فوق
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teams.map((t) => (
              <div
                key={t.id}
                className="bg-navy rounded-2xl p-4 border border-white/10 flex items-center gap-3"
              >
                <div className="flex -space-x-3 -space-x-reverse shrink-0">
                  <PlayerAvatar
                    name={t.player1.name}
                    imageUrl={t.player1.imageUrl}
                    size="md"
                    className="ring-2 ring-navy"
                  />
                  <PlayerAvatar
                    name={t.player2.name}
                    imageUrl={t.player2.imageUrl}
                    size="md"
                    className="ring-2 ring-navy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{t.name}</div>
                  <div className="text-xs text-white/50 truncate">
                    {t.player1.name} · {t.player2.name}
                  </div>
                  {t.tournamentsCount > 0 && (
                    <div className="text-[10px] text-gold/70 mt-0.5">
                      في {t.tournamentsCount} بطولة
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  disabled={isPending}
                  className="text-red-400/70 hover:text-red-400 text-sm shrink-0 px-2"
                  title="حذف"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
