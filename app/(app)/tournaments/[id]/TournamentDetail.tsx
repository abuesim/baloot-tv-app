"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  addTournamentTeamAction,
  removeTournamentTeamAction,
  runDrawAction,
  resetDrawAction,
  startMatchGameAction,
  deleteTournamentAction,
} from "../actions";
import DrawCeremony from "./DrawCeremony";

type PlayerLite = { id: string; name: string; imageUrl: string | null };
export type TeamLite = {
  id: string;
  name: string;
  player1: PlayerLite;
  player2: PlayerLite;
};
type MatchView = {
  id: string;
  round: number;
  position: number;
  teamA: TeamLite | null;
  teamB: TeamLite | null;
  teamAWins: number;
  teamBWins: number;
  bestOf: number;
  winnerTeamId: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  ongoingGameId: string | null;
  playedGames: number;
};
type Tournament = {
  id: string;
  name: string;
  format: "KNOCKOUT" | "POINTS";
  matchBestOf: number;
  gameMode: "NORMAL" | "MASHDOOD";
  status: "DRAFT" | "DRAWN" | "IN_PROGRESS" | "COMPLETED";
  championTeamId: string | null;
};

export default function TournamentDetail({
  tournament,
  teams,
  availableTeams,
  matches,
  standings,
  champion,
}: {
  tournament: Tournament;
  teams: { seed: number; team: TeamLite }[];
  availableTeams: TeamLite[];
  matches: MatchView[];
  standings: { teamId: string; wins: number; losses: number; team: TeamLite | null }[];
  champion: TeamLite | null;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState<TeamLite[] | null>(null);

  const teamById = new Map(teams.map((t) => [t.team.id, t.team]));

  function addTeam(teamId: string) {
    setError(null);
    start(async () => {
      const res = await addTournamentTeamAction(tournament.id, teamId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }
  function removeTeam(teamId: string) {
    setError(null);
    start(async () => {
      const res = await removeTournamentTeamAction(tournament.id, teamId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }
  function draw() {
    setError(null);
    start(async () => {
      const res = await runDrawAction(tournament.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // شغّل الاحتفالية بترتيب القرعة
      const ordered = res.order
        .map((id) => teamById.get(id))
        .filter((t): t is TeamLite => Boolean(t));
      setCeremony(ordered);
    });
  }
  function replayCeremony() {
    const ordered = [...teams].sort((a, b) => a.seed - b.seed).map((t) => t.team);
    setCeremony(ordered);
  }
  function resetDraw() {
    if (!confirm("إعادة القرعة؟ ستُحذف الشجرة الحالية.")) return;
    setError(null);
    start(async () => {
      const res = await resetDrawAction(tournament.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }
  function startMatch(matchId: string) {
    setError(null);
    start(async () => {
      const res = await startMatchGameAction(matchId);
      // عند النجاح يحوّل للحاسبة (redirect) ولا يصل هنا
      if (res && !res.ok) setError(res.error);
    });
  }
  function removeTournament() {
    if (!confirm(`حذف بطولة «${tournament.name}»؟`)) return;
    start(async () => {
      const res = await deleteTournamentAction(tournament.id);
      if (!res.ok) setError(res.error);
      else router.push("/tournaments");
    });
  }

  const anyStarted = matches.some((m) => m.playedGames > 0 || m.ongoingGameId);

  return (
    <div className="space-y-6">
      {ceremony && (
        <DrawCeremony
          teams={ceremony}
          format={tournament.format}
          onClose={() => {
            setCeremony(null);
            router.refresh();
          }}
        />
      )}

      {/* رأس */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/tournaments" className="text-xs text-white/40 hover:text-white/70">
            ← كل البطولات
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1 truncate">{tournament.name}</h1>
          <p className="text-xs text-white/50 mt-1">
            {tournament.format === "KNOCKOUT" ? "خروج المغلوب" : "تجميع النقاط"} ·{" "}
            {tournament.matchBestOf === 3 ? "أفضل من ٣" : "صكة واحدة"} ·{" "}
            {tournament.gameMode === "MASHDOOD" ? "مشدود" : "عادي"} · {teams.length} فريق
          </p>
        </div>
        <button
          onClick={removeTournament}
          disabled={isPending}
          className="text-red-400/60 hover:text-red-400 text-sm shrink-0"
          title="حذف البطولة"
        >
          🗑
        </button>
      </div>

      {error && <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3">{error}</div>}

      {/* بطل البطولة */}
      {champion && (
        <div className="bg-gradient-to-l from-gold/30 to-gold/10 rounded-2xl p-5 border border-gold/40 flex items-center gap-4">
          <div className="text-5xl">🏆</div>
          <div className="flex -space-x-3 -space-x-reverse">
            <PlayerAvatar name={champion.player1.name} imageUrl={champion.player1.imageUrl} size="lg" className="ring-2 ring-navy" />
            <PlayerAvatar name={champion.player2.name} imageUrl={champion.player2.imageUrl} size="lg" className="ring-2 ring-navy" />
          </div>
          <div>
            <div className="text-sm text-gold">بطل البطولة</div>
            <div className="text-2xl font-black">{champion.name}</div>
          </div>
        </div>
      )}

      {/* ════════ وضع الإعداد ════════ */}
      {tournament.status === "DRAFT" ? (
        <DraftView
          teams={teams.map((t) => t.team)}
          availableTeams={availableTeams}
          onAdd={addTeam}
          onRemove={removeTeam}
          onDraw={draw}
          isPending={isPending}
        />
      ) : (
        <>
          {/* أدوات */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={replayCeremony}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
            >
              ▶ إعادة عرض القرعة
            </button>
            {tournament.status === "DRAWN" && !anyStarted && (
              <button
                onClick={resetDraw}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
              >
                🔄 إعادة القرعة
              </button>
            )}
          </div>

          {tournament.format === "KNOCKOUT" ? (
            <Bracket matches={matches} onStart={startMatch} isPending={isPending} />
          ) : (
            <PointsView
              matches={matches}
              standings={standings}
              onStart={startMatch}
              isPending={isPending}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ─── وضع الإعداد: اختيار الفرق ─── */
function DraftView({
  teams,
  availableTeams,
  onAdd,
  onRemove,
  onDraw,
  isPending,
}: {
  teams: TeamLite[];
  availableTeams: TeamLite[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onDraw: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* الفرق المشاركة */}
      <div>
        <h2 className="font-bold text-lg mb-2">الفرق المشاركة ({teams.length})</h2>
        {teams.length === 0 ? (
          <div className="bg-navy rounded-2xl p-6 text-center text-white/40 border border-white/10">
            أضِف فرقاً من القائمة تحت
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {teams.map((t) => (
              <div key={t.id} className="bg-navy rounded-xl p-3 border border-white/10 flex items-center gap-3">
                <TeamAvatars team={t} />
                <span className="flex-1 font-bold text-sm truncate">{t.name}</span>
                <button
                  onClick={() => onRemove(t.id)}
                  disabled={isPending}
                  className="text-red-400/60 hover:text-red-400 text-sm shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* فرق متاحة للإضافة */}
      {availableTeams.length > 0 && (
        <div>
          <h3 className="text-sm text-white/60 mb-2">أضِف فريقاً</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableTeams.map((t) => (
              <button
                key={t.id}
                onClick={() => onAdd(t.id)}
                disabled={isPending}
                className="bg-navy-light rounded-xl p-3 border border-white/10 hover:border-gold/40 flex items-center gap-3 text-right"
              >
                <TeamAvatars team={t} />
                <span className="flex-1 font-bold text-sm truncate">{t.name}</span>
                <span className="text-gold text-lg shrink-0">＋</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {availableTeams.length === 0 && teams.length === 0 && (
        <div className="bg-navy/60 rounded-2xl p-4 border border-white/10 text-sm text-white/70">
          ما في فرق — كوّن فرقاً من{" "}
          <Link href="/teams" className="text-gold underline">صفحة الفرق</Link> أولاً.
        </div>
      )}

      {/* زر القرعة */}
      <button
        onClick={onDraw}
        disabled={isPending || teams.length < 2}
        className="w-full btn-grad py-4 rounded-xl text-lg shadow-lg shadow-accent/30 disabled:opacity-40"
      >
        {teams.length < 2 ? "أضِف فريقين على الأقل" : `🎲 إجراء القرعة (${teams.length} فرق)`}
      </button>
    </div>
  );
}

/* ─── شجرة خروج المغلوب ─── */
function Bracket({
  matches,
  onStart,
  isPending,
}: {
  matches: MatchView[];
  onStart: (id: string) => void;
  isPending: boolean;
}) {
  const maxRound = Math.max(...matches.map((m) => m.round), 1);
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

  function roundLabel(r: number) {
    const fromEnd = maxRound - r;
    if (fromEnd === 0) return "النهائي";
    if (fromEnd === 1) return "نصف النهائي";
    if (fromEnd === 2) return "ربع النهائي";
    return `الدور ${r}`;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-max">
        {rounds.map((r) => (
          <div key={r} className="flex flex-col gap-3 justify-around min-w-[220px]">
            <div className="text-xs text-white/40 text-center font-bold">{roundLabel(r)}</div>
            {matches
              .filter((m) => m.round === r)
              .map((m) => (
                <MatchCard key={m.id} match={m} onStart={onStart} isPending={isPending} />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── نظام النقاط: ترتيب + مواجهات ─── */
function PointsView({
  matches,
  standings,
  onStart,
  isPending,
}: {
  matches: MatchView[];
  standings: { teamId: string; wins: number; losses: number; team: TeamLite | null }[];
  onStart: (id: string) => void;
  isPending: boolean;
}) {
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  return (
    <div className="space-y-6">
      {/* الترتيب */}
      <div>
        <h2 className="font-bold text-lg mb-3">الترتيب</h2>
        <div className="bg-navy rounded-2xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[360px]">
            <thead className="bg-white/5 text-white/60 text-xs">
              <tr>
                <th className="p-3 text-right">#</th>
                <th className="p-3 text-right">الفريق</th>
                <th className="p-3 text-center">فوز</th>
                <th className="p-3 text-center">خسارة</th>
                <th className="p-3 text-center">نقاط</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.teamId} className="border-t border-white/5">
                  <td className={`p-3 ${i === 0 ? "text-gold font-bold" : "text-white/40"}`}>{i + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {s.team && <TeamAvatars team={s.team} sm />}
                      <span className="truncate text-xs">{s.team?.name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-green-400 font-bold">{s.wins}</td>
                  <td className="p-3 text-center text-red-400">{s.losses}</td>
                  <td className="p-3 text-center font-black text-gold">{s.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* المواجهات */}
      <div>
        <h2 className="font-bold text-lg mb-3">المواجهات</h2>
        <div className="space-y-4">
          {rounds.map((r) => (
            <div key={r}>
              <div className="text-xs text-white/40 mb-2">الجولة {r}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matches
                  .filter((m) => m.round === r)
                  .map((m) => (
                    <MatchCard key={m.id} match={m} onStart={onStart} isPending={isPending} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── بطاقة مواجهة ─── */
function MatchCard({
  match,
  onStart,
  isPending,
}: {
  match: MatchView;
  onStart: (id: string) => void;
  isPending: boolean;
}) {
  const { teamA, teamB, winnerTeamId, status } = match;
  const ready = teamA && teamB;

  return (
    <div className="bg-navy rounded-xl border border-white/10 p-3 space-y-2">
      <TeamRow team={teamA} wins={match.teamAWins} isWinner={winnerTeamId === teamA?.id} />
      <div className="text-center text-[10px] text-white/30">
        {match.bestOf === 3 ? "أفضل من ٣" : "صكة واحدة"}
      </div>
      <TeamRow team={teamB} wins={match.teamBWins} isWinner={winnerTeamId === teamB?.id} />

      <div className="pt-1">
        {status === "COMPLETED" ? (
          <div className="text-center text-xs text-gold font-bold">
            ✓ فاز {winnerTeamId === teamA?.id ? teamA?.name : teamB?.name}
          </div>
        ) : !ready ? (
          <div className="text-center text-xs text-white/30">بانتظار التأهل</div>
        ) : (
          <button
            onClick={() => onStart(match.id)}
            disabled={isPending}
            className="w-full btn-grad py-2 rounded-lg text-sm"
          >
            {match.ongoingGameId
              ? "↩ أكمل الصكة"
              : match.playedGames > 0
                ? `الصكة التالية (${match.teamAWins}-${match.teamBWins})`
                : "▶ ابدأ الصكة"}
          </button>
        )}
      </div>
    </div>
  );
}

function TeamRow({
  team,
  wins,
  isWinner,
}: {
  team: TeamLite | null;
  wins: number;
  isWinner: boolean;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-1 py-1 opacity-40">
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10" />
        <span className="text-xs text-white/40">—</span>
      </div>
    );
  }
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
        isWinner ? "bg-gold/10" : ""
      }`}
    >
      <TeamAvatars team={team} sm />
      <span className={`flex-1 text-xs truncate ${isWinner ? "text-gold font-bold" : ""}`}>
        {team.name}
      </span>
      <span className={`text-sm font-black tabular-nums ${isWinner ? "text-gold" : "text-white/50"}`}>
        {wins}
      </span>
    </div>
  );
}

export function TeamAvatars({ team, sm }: { team: TeamLite; sm?: boolean }) {
  const size = sm ? "xs" : "sm";
  return (
    <div className="flex -space-x-2 -space-x-reverse shrink-0">
      <PlayerAvatar name={team.player1.name} imageUrl={team.player1.imageUrl} size={size} className="ring-2 ring-navy" />
      <PlayerAvatar name={team.player2.name} imageUrl={team.player2.imageUrl} size={size} className="ring-2 ring-navy" />
    </div>
  );
}
