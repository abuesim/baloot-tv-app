"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  createTournamentTeamAction,
  removeTournamentTeamAction,
  randomTeamsAction,
  updateTournamentAction,
  runDrawAction,
  broadcastDrawAction,
  resetDrawAction,
  startMatchGameAction,
  deleteTournamentAction,
} from "../actions";
import DrawCeremony from "./DrawCeremony";
import PlayerSelect from "@/components/PlayerSelect";

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
  availablePlayers,
  matches,
  standings,
  champion,
}: {
  tournament: Tournament;
  teams: { seed: number; team: TeamLite }[];
  availablePlayers: PlayerLite[];
  matches: MatchView[];
  standings: { teamId: string; wins: number; losses: number; team: TeamLite | null }[];
  champion: TeamLite | null;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState<TeamLite[] | null>(null);

  const teamById = new Map(teams.map((t) => [t.team.id, t.team]));

  function createTeam(input: { name: string; player1Id: string; player2Id: string }) {
    setError(null);
    start(async () => {
      const res = await createTournamentTeamAction(tournament.id, input);
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
  function makeRandomTeams(playerIds: string[]) {
    setError(null);
    start(async () => {
      const res = await randomTeamsAction(tournament.id, playerIds);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }
  function saveSettings(input: {
    name: string;
    format: "KNOCKOUT" | "POINTS";
    matchBestOf: 1 | 3;
    gameMode: "NORMAL" | "MASHDOOD";
  }) {
    setError(null);
    start(async () => {
      const res = await updateTournamentAction(tournament.id, input);
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
  function broadcastDraw() {
    setError(null);
    start(async () => {
      const res = await broadcastDrawAction(tournament.id);
      if (!res.ok) setError(res.error);
    });
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
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-danger/15 text-red-300 border border-danger/30 hover:bg-danger/25 inline-flex items-center gap-1"
        >
          🗑 حذف البطولة
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
          tournament={tournament}
          teams={teams.map((t) => t.team)}
          availablePlayers={availablePlayers}
          onCreate={createTeam}
          onRemove={removeTeam}
          onRandomTeams={makeRandomTeams}
          onSaveSettings={saveSettings}
          onDraw={draw}
          isPending={isPending}
        />
      ) : (
        <>
          {/* أدوات */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={broadcastDraw}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25"
            >
              📺 اعرض القرعة على الشاشة
            </button>
            <button
              onClick={replayCeremony}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
            >
              ▶ إعادة عرض القرعة (هنا)
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

/* ─── وضع الإعداد: تكوين فرق البطولة ─── */
function DraftView({
  tournament,
  teams,
  availablePlayers,
  onCreate,
  onRemove,
  onRandomTeams,
  onSaveSettings,
  onDraw,
  isPending,
}: {
  tournament: Tournament;
  teams: TeamLite[];
  availablePlayers: PlayerLite[];
  onCreate: (input: { name: string; player1Id: string; player2Id: string }) => void;
  onRemove: (id: string) => void;
  onRandomTeams: (playerIds: string[]) => void;
  onSaveSettings: (input: {
    name: string;
    format: "KNOCKOUT" | "POINTS";
    matchBestOf: 1 | 3;
    gameMode: "NORMAL" | "MASHDOOD";
  }) => void;
  onDraw: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* تعديل إعدادات البطولة */}
      <EditSettingsPanel tournament={tournament} onSave={onSaveSettings} isPending={isPending} />

      {/* الفرق المشاركة */}
      <div>
        <h2 className="font-bold text-lg mb-2">فرق البطولة ({teams.length})</h2>
        {teams.length === 0 ? (
          <div className="bg-navy rounded-2xl p-6 text-center text-white/40 border border-white/10">
            كوّن الفرق يدوياً أو عشوائياً من تحت
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

      {/* فرق عشوائية من اللاعبين */}
      {availablePlayers.length >= 4 && (
        <RandomTeamsPanel
          players={availablePlayers}
          onSubmit={onRandomTeams}
          isPending={isPending}
        />
      )}

      {/* تكوين فريق يدوياً */}
      {availablePlayers.length >= 2 && (
        <CreateTeamInline
          players={availablePlayers}
          onCreate={onCreate}
          isPending={isPending}
        />
      )}

      {availablePlayers.length < 2 && teams.length === 0 && (
        <div className="bg-navy/60 rounded-2xl p-4 border border-white/10 text-sm text-white/70">
          ما عندك لاعبون كافون — أضِف لاعبين من{" "}
          <Link href="/players" className="text-gold underline">صفحة اللاعبين</Link> أولاً.
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

/* ─── تعديل إعدادات البطولة قبل القرعة ─── */
function EditSettingsPanel({
  tournament,
  onSave,
  isPending,
}: {
  tournament: Tournament;
  onSave: (input: {
    name: string;
    format: "KNOCKOUT" | "POINTS";
    matchBestOf: 1 | 3;
    gameMode: "NORMAL" | "MASHDOOD";
  }) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(tournament.name);
  const [format, setFormat] = useState(tournament.format);
  const [bestOf, setBestOf] = useState<1 | 3>(tournament.matchBestOf === 3 ? 3 : 1);
  const [gameMode, setGameMode] = useState(tournament.gameMode);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-navy rounded-2xl p-3 border border-white/10 hover:border-white/30 flex items-center justify-between transition-colors"
      >
        <span className="text-sm text-white/70">⚙️ إعدادات البطولة</span>
        <span className="text-xs text-white/40">
          {format === "KNOCKOUT" ? "إقصاء" : "نقاط"} · {bestOf === 3 ? "أفضل من ٣" : "صكة واحدة"} ·{" "}
          {gameMode === "MASHDOOD" ? "مشدود" : "عادي"} ✎
        </span>
      </button>
    );
  }

  return (
    <div className="bg-navy rounded-2xl p-4 border border-gold/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-bold text-sm">⚙️ تعديل إعدادات البطولة</div>
        <button type="button" onClick={() => setOpen(false)} className="text-white/40 hover:text-white/70 text-sm">✕</button>
      </div>

      <div>
        <label className="block text-sm mb-2 text-white/80">اسم البطولة</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
      </div>

      <EditChoice
        label="نظام البطولة"
        value={format}
        onChange={(v) => setFormat(v as "KNOCKOUT" | "POINTS")}
        options={[
          { v: "KNOCKOUT", t: "خروج المغلوب", d: "الخاسر يخرج" },
          { v: "POINTS", t: "تجميع النقاط", d: "دوري" },
        ]}
      />
      <EditChoice
        label="عدد الجولات (نظام المواجهة)"
        value={String(bestOf)}
        onChange={(v) => setBestOf(Number(v) as 1 | 3)}
        options={[
          { v: "1", t: "صكة واحدة", d: "تُحسم بصكة" },
          { v: "3", t: "أفضل من ٣", d: "2/0 أو 2/1" },
        ]}
      />
      <EditChoice
        label="نوع اللعب"
        value={gameMode}
        onChange={(v) => setGameMode(v as "NORMAL" | "MASHDOOD")}
        options={[
          { v: "NORMAL", t: "عادي", d: "٠ → ١٥٢" },
          { v: "MASHDOOD", t: "مشدود", d: "٥٢ → ١٥٢" },
        ]}
      />

      <button
        type="button"
        onClick={() => { onSave({ name: name.trim() || tournament.name, format, matchBestOf: bestOf, gameMode }); setOpen(false); }}
        disabled={isPending}
        className="btn-grad px-6 py-2.5 rounded-xl text-sm"
      >
        {isPending ? "..." : "حفظ"}
      </button>
    </div>
  );
}

function EditChoice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; t: string; d: string }[];
}) {
  return (
    <div>
      <label className="block text-sm mb-2 text-white/80">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const active = value === o.v;
          return (
            <button
              type="button"
              key={o.v}
              onClick={() => onChange(o.v)}
              className={`text-right p-3 rounded-xl border-2 transition-colors ${
                active ? "border-gold bg-gold/10" : "border-white/10 bg-navy-light hover:border-white/30"
              }`}
            >
              <div className="font-bold text-sm">{o.t}</div>
              <div className="text-[11px] text-white/55">{o.d}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── تكوين فريق يدوياً داخل البطولة ─── */
function CreateTeamInline({
  players,
  onCreate,
  isPending,
}: {
  players: PlayerLite[];
  onCreate: (input: { name: string; player1Id: string; player2Id: string }) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  const byId = new Map(players.map((p) => [p.id, p]));
  const opts1 = players.filter((p) => p.id !== p2);
  const opts2 = players.filter((p) => p.id !== p1);
  const suggested = p1 && p2 ? `${byId.get(p1)?.name} و ${byId.get(p2)?.name}` : "";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-navy rounded-2xl p-4 border border-dashed border-white/20 hover:border-white/40 text-right transition-colors"
      >
        <div className="font-bold text-sm">➕ كوّن فريقاً يدوياً</div>
        <div className="text-xs text-white/50 mt-1">اختر لاعبين وحدد اسم الفريق</div>
      </button>
    );
  }

  function submit() {
    if (!p1 || !p2) return;
    onCreate({ name: name.trim() || suggested, player1Id: p1, player2Id: p2 });
    setName("");
    setP1("");
    setP2("");
    setOpen(false);
  }

  return (
    <div className="bg-navy rounded-2xl p-4 border border-white/15 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold text-sm">➕ فريق جديد</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-white/40 hover:text-white/70 text-sm"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlayerSelect label="اللاعب الأول" value={p1} onChange={setP1} options={opts1} byId={byId} />
        <PlayerSelect label="اللاعب الثاني" value={p2} onChange={setP2} options={opts2} byId={byId} />
      </div>

      <div>
        <label className="block text-sm mb-1.5 text-white/80">اسم الفريق</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={suggested || "مثال: الصقور"}
          className="w-full bg-navy-light border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent placeholder:text-white/30"
        />
        {suggested && !name && (
          <p className="text-xs text-white/30 mt-1">سيُستخدم: {suggested}</p>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={isPending || !p1 || !p2}
        className="btn-grad px-6 py-2.5 rounded-xl text-sm disabled:opacity-40"
      >
        {isPending ? "..." : "إضافة الفريق"}
      </button>
    </div>
  );
}

/* ─── فرق عشوائية: اختر اللاعبين والقرعة تكوّنهم أزواجاً ─── */
function RandomTeamsPanel({
  players,
  onSubmit,
  isPending,
}: {
  players: PlayerLite[];
  onSubmit: (playerIds: string[]) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>([]);

  function toggle(id: string) {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const even = sel.length % 2 === 0;
  const ready = sel.length >= 4 && even;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-navy rounded-2xl p-4 border border-dashed border-gold/30 hover:border-gold/60 text-right transition-colors"
      >
        <div className="font-bold text-sm text-gold">🎲 فرق عشوائية من اللاعبين</div>
        <div className="text-xs text-white/50 mt-1">
          اختر اللاعبين والقرعة تكوّن الفرق تلقائياً ({players.length} لاعب متاح)
        </div>
      </button>
    );
  }

  return (
    <div className="bg-navy rounded-2xl p-4 border border-gold/30 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-sm text-gold">🎲 فرق عشوائية</div>
          <div className="text-xs text-white/50 mt-0.5">
            اضغط اللاعبين للاختيار — كل لاعبين يكوّنان فريقاً عشوائياً
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setSel([]); }}
          className="text-white/40 hover:text-white/70 text-sm shrink-0"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {players.map((p) => {
          const active = sel.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all"
              style={{
                borderColor: active ? "#f5b042" : "rgba(255,255,255,0.08)",
                background: active ? "#f5b0421f" : "rgba(255,255,255,0.02)",
                boxShadow: active ? "0 0 16px -4px #f5b042" : undefined,
              }}
            >
              {active && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gold text-navy-deep text-[10px] font-black flex items-center justify-center">
                  ✓
                </span>
              )}
              <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="md" />
              <span className="text-xs truncate max-w-full w-full text-center">{p.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${even ? "text-white/50" : "text-red-300"}`}>
          {sel.length === 0
            ? "اختر ٤ لاعبين على الأقل"
            : even
              ? `${sel.length} لاعب → ${sel.length / 2} فرق`
              : `${sel.length} لاعب — أضِف لاعباً ليكتمل الزوج`}
        </span>
        <button
          type="button"
          disabled={!ready || isPending}
          onClick={() => { onSubmit(sel); setSel([]); setOpen(false); }}
          className="btn-grad px-5 py-2 rounded-xl text-sm disabled:opacity-40"
        >
          {isPending ? "..." : "🎲 كوّن الفرق"}
        </button>
      </div>
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
