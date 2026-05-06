"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ImageCarousel } from "@/components/ImageCarousel";

type Player = { id: string; name: string; imageUrl: string | null };
type Participant = { team: number; player: Player };
type Round = { id: string; number: number; team1Score: number; team2Score: number };
type Game = {
  id: string;
  mode: "NORMAL" | "MASHDOOD";
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  team1Score: number;
  team2Score: number;
  targetScore: number;
  winner: number | null;
  startedAt: string | Date;
  participants: Participant[];
  rounds: Round[];
};

type TvUser = {
  id: string;
  displayName: string;
  tvOrientation: "LANDSCAPE" | "PORTRAIT";
  tvAccentColor: string;
  tvShowRounds: boolean;
  tvShowChat: boolean;
  tvChatUrl: string | null;
  tvShowDonations: boolean;
  tvDonationUrl: string | null;
};

type BannerItem = {
  id: string;
  imageUrl: string | null;
  text: string | null;
  linkUrl: string | null;
};

type FloatPop = { id: number; team: 1 | 2; delta: number };

export default function TvBoard({
  initialGame,
  initialUser,
  code,
  banners = [],
}: {
  initialGame: Game | null;
  initialUser: TvUser;
  code: string;
  banners?: BannerItem[];
}) {
  const [game, setGame] = useState<Game | null>(initialGame);
  const [user, setUser] = useState<TvUser>(initialUser);
  const [connected, setConnected] = useState(false);
  const [flash, setFlash] = useState<{ team1: boolean; team2: boolean }>({
    team1: false,
    team2: false,
  });
  const [pops, setPops] = useState<FloatPop[]>([]);
  const popIdRef = useRef(0);
  const prevRef = useRef<{ gameId: string | null; t1: number; t2: number }>({
    gameId: initialGame?.id ?? null,
    t1: initialGame?.team1Score ?? 0,
    t2: initialGame?.team2Score ?? 0,
  });

  useEffect(() => {
    const es = new EventSource(`/api/tv/${code}/stream`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "init") {
          if (msg.user) setUser(msg.user);
          setGame(msg.game ?? null);
          if (msg.game) {
            prevRef.current = {
              gameId: msg.game.id,
              t1: msg.game.team1Score,
              t2: msg.game.team2Score,
            };
          }
          return;
        }
        if (msg.type === "game") {
          const data: Game = msg.game;
          const isNewGame = prevRef.current.gameId !== data.id;
          if (isNewGame) {
            prevRef.current = { gameId: data.id, t1: data.team1Score, t2: data.team2Score };
            setGame(data);
            return;
          }
          const dt1 = data.team1Score - prevRef.current.t1;
          const dt2 = data.team2Score - prevRef.current.t2;
          if (dt1 > 0 || dt2 > 0) {
            setFlash({ team1: dt1 > 0, team2: dt2 > 0 });
            setTimeout(() => setFlash({ team1: false, team2: false }), 4000);
            if (dt1 > 0) {
              const id = ++popIdRef.current;
              setPops((p) => [...p, { id, team: 1, delta: dt1 }]);
              setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 2500);
            }
            if (dt2 > 0) {
              const id = ++popIdRef.current;
              setPops((p) => [...p, { id, team: 2, delta: dt2 }]);
              setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 2500);
            }
          }
          prevRef.current = { gameId: data.id, t1: data.team1Score, t2: data.team2Score };
          setGame(data);
        }
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, [code]);

  // المتغيرات اللازمة للستايل
  const accent = user.tvAccentColor || "#f5b042";
  const styleVars: React.CSSProperties = {
    ["--tv-accent" as never]: accent,
  };

  // حالة بدون مباراة
  if (!game) {
    return (
      <div
        className="min-h-screen flex flex-col bg-bg pb-32"
        style={styleVars}
      >
        <Header user={user} game={null} connected={connected} />
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="space-y-3">
            <div className="text-9xl">🎴</div>
            <div className="text-3xl text-white/80 font-bold">
              بانتظار بداية المباراة
            </div>
            <div className="text-white/50 text-lg">
              الكود:{" "}
              <span className="tracking-widest" style={{ color: accent }}>
                {code}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const team1 = game.participants.filter((p) => p.team === 1).map((p) => p.player);
  const team2 = game.participants.filter((p) => p.team === 2).map((p) => p.player);
  const lastRounds = game.rounds.slice(-5);
  const diff = Math.abs(game.team1Score - game.team2Score);
  const lead =
    game.team1Score === game.team2Score
      ? null
      : game.team1Score > game.team2Score
      ? 1
      : 2;

  const isPortrait = user.tvOrientation === "PORTRAIT";
  const showChat = user.tvShowChat && !!user.tvChatUrl;
  const showDonations = user.tvShowDonations && !!user.tvDonationUrl;

  // محتوى المباراة (مشترك بين الوضعين)
  const gameContent = (
    <>
      <Header user={user} game={game} connected={connected} />

      {showDonations && (
        <DonationStrip url={user.tvDonationUrl!} />
      )}

      <div className="flex-1 flex items-stretch px-6 gap-6">
        <div className={showChat ? "flex-[2]" : "flex-1"}>
          <div className="h-full flex items-center justify-center">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-6 w-full items-center">
              <ScoreColumn
                label="لنا"
                players={team1}
                score={game.team1Score}
                isWinner={game.winner === 1}
                target={game.targetScore}
                accent={accent}
                isAccent
                flashing={flash.team1}
                pops={pops.filter((p) => p.team === 1)}
              />
              <DiffPanel diff={diff} lead={lead} accent={accent} />
              <ScoreColumn
                label="لهم"
                players={team2}
                score={game.team2Score}
                isWinner={game.winner === 2}
                target={game.targetScore}
                accent={accent}
                isAccent={false}
                flashing={flash.team2}
                pops={pops.filter((p) => p.team === 2)}
              />
            </div>
          </div>
        </div>

        {showChat && (
          <div className="w-80 shrink-0">
            <ChatPanel url={user.tvChatUrl!} variant="side" />
          </div>
        )}
      </div>

      {user.tvShowRounds && lastRounds.length > 0 && (
        <RoundsStrip rounds={lastRounds} accent={accent} />
      )}

      {banners.length > 0 && <TvBannerBar banners={banners} />}

      <WinnerOverlay game={game} team1={team1} team2={team2} accent={accent} />
    </>
  );

  // ================== PORTRAIT — مدوّر 90° ==================
  if (isPortrait) {
    return (
      <div className="fixed inset-0 bg-bg overflow-hidden" style={styleVars}>
        {/*
          الحيلة: نجعل المحتوى بأبعاد الـ landscape (عرض = ارتفاع الشاشة، ارتفاع = عرض الشاشة)
          ثم ندوّره 90° حول المركز ليملأ الشاشة الطولية بالكامل
        */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "100vh",
            height: "100vw",
            transform: "translate(-50%, -50%) rotate(90deg)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {gameContent}
        </div>
      </div>
    );
  }

  // ================== LANDSCAPE ==================
  return (
    <div
      className="fixed inset-0 bg-bg overflow-hidden flex flex-col"
      style={styleVars}
    >
      {gameContent}
    </div>
  );
}

function Header({
  user,
  game,
  connected,
}: {
  user: TvUser;
  game: Game | null;
  connected: boolean;
}) {
  return (
    <div className="px-8 pt-6 pb-2 flex items-center justify-between">
      <div className="text-3xl font-black" style={{ color: user.tvAccentColor }}>
        بلوت
      </div>
      <div className="flex items-center gap-3 text-sm text-white/60">
        <span>{user.displayName}</span>
        {game?.mode === "MASHDOOD" && (
          <span
            className="px-3 py-1 rounded-full font-bold"
            style={{
              backgroundColor: `${user.tvAccentColor}33`,
              color: user.tvAccentColor,
            }}
          >
            مشدود
          </span>
        )}
        {game && <span>الهدف: {game.targetScore}</span>}
        <span
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-green-400 animate-pulse" : "bg-red-400"
          }`}
        />
      </div>
    </div>
  );
}

function RoundsStrip({ rounds, accent }: { rounds: Round[]; accent: string }) {
  if (rounds.length === 0) return null;
  return (
    <div className="px-8 pb-4">
      <div className="bg-navy/60 rounded-2xl p-4 border border-white/5">
        <div className="text-xs text-white/40 mb-2">آخر الجولات</div>
        <div className="flex gap-2 overflow-x-auto">
          {rounds.map((r) => (
            <div
              key={r.id}
              className="bg-navy rounded-xl px-4 py-2 border border-white/10 flex items-center gap-3 shrink-0"
            >
              <span className="text-xs text-white/40">#{r.number}</span>
              <span className="font-bold" style={{ color: accent }}>
                {r.team1Score}
              </span>
              <span className="text-white/30">-</span>
              <span className="font-bold">{r.team2Score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WinnerOverlay({
  game,
  team1,
  team2,
  accent,
}: {
  game: Game;
  team1: Player[];
  team2: Player[];
  accent: string;
}) {
  if (game.winner === null) return null;
  const winners = game.winner === 1 ? team1 : team2;
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm z-40">
      <div className="text-center animate-pulse">
        <div className="text-9xl mb-4">🏆</div>
        <div
          className="text-7xl font-black mb-3"
          style={{ color: accent }}
        >
          فوز للفريق {game.winner === 1 ? "لنا" : "لهم"}
        </div>
        <div className="flex items-center justify-center gap-6 mt-6">
          {winners.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-2">
              <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="2xl" />
              <span className="text-2xl text-white/80">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatPanel({ url, variant }: { url: string; variant: "side" | "bottom" }) {
  const cls =
    variant === "side"
      ? "h-full"
      : "h-64 mx-4 mb-4";
  return (
    <div className={`bg-navy rounded-2xl border border-white/10 overflow-hidden ${cls}`}>
      <div className="px-4 py-2 bg-white/5 text-xs text-white/60 flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        <span>الشات المباشر</span>
      </div>
      <iframe
        src={url}
        className="w-full h-[calc(100%-32px)] border-0 bg-transparent"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}

function DonationStrip({ url }: { url: string }) {
  return (
    <div className="mx-8 mb-2">
      <div className="bg-navy rounded-xl border border-white/10 overflow-hidden h-20">
        <iframe
          src={url}
          className="w-full h-full border-0 bg-transparent"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}

function ScoreColumn({
  label,
  players,
  score,
  isWinner,
  target,
  accent,
  isAccent,
  flashing,
  pops,
}: {
  label: string;
  players: Player[];
  score: number;
  isWinner: boolean;
  target: number;
  accent: string;
  isAccent: boolean;
  flashing: boolean;
  pops: FloatPop[];
}) {
  const pct = Math.min(100, Math.round((score / target) * 100));
  const color = isAccent || isWinner ? accent : "#ffffff";
  return (
    <div
      className={`text-center relative rounded-3xl p-4 transition-all ${
        flashing ? "panel-glow" : ""
      } ${isWinner ? "scale-105" : ""}`}
    >
      <div className="text-2xl text-white/60 mb-3">{label}</div>
      <div className="flex items-center justify-center gap-4 mb-4 min-h-20">
        {players.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-2">
            <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="xl" />
            <span className="text-base text-white/80 max-w-24 truncate">
              {p.name}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 top-1/3 pointer-events-none">
        {pops.map((p) => (
          <div
            key={p.id}
            className="float-up text-4xl font-black"
            style={{ color, position: "absolute", left: 0, right: 0 }}
          >
            +{p.delta}
          </div>
        ))}
      </div>
      <div
        key={score}
        className={`text-[10rem] md:text-[12rem] leading-none font-black mb-4 ${
          flashing ? "score-flash" : ""
        }`}
        style={{ color }}
      >
        {score}
      </div>
      <div className="bg-white/5 rounded-full h-2 overflow-hidden">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function DiffPanel({
  diff,
  lead,
  accent,
}: {
  diff: number;
  lead: 1 | 2 | null;
  accent: string;
}) {
  if (diff === 0) {
    return (
      <div className="bg-navy rounded-2xl px-4 py-6 border border-white/10 text-center self-center">
        <div className="text-xs text-white/40">الفرق</div>
        <div className="text-3xl font-bold text-white/60">=</div>
      </div>
    );
  }
  return (
    <div
      className="bg-navy rounded-2xl px-4 py-6 text-center self-center shadow-lg"
      style={{
        borderColor: `${accent}50`,
        borderWidth: 1,
        boxShadow: `0 10px 25px -10px ${accent}33`,
      }}
    >
      <div className="text-xs text-white/40 mb-1">الفرق</div>
      <div className="text-4xl md:text-5xl font-black" style={{ color: accent }}>
        {diff}
      </div>
      <div className="text-xs text-white/60 mt-1">
        {lead === 1 ? "← لنا" : "لهم →"}
      </div>
    </div>
  );
}

// ============================================================
// شريط الإعلانات — يُعرض داخل gameContent فيتدوّر مع الطولي
// ============================================================
function TvBannerBar({ banners }: { banners: BannerItem[] }) {
  const imageBanners = banners.filter((b) => b.imageUrl);
  const textBanners  = banners.filter((b) => b.text && !b.imageUrl);

  return (
    <div>
      {imageBanners.length > 0 && (
        <ImageCarousel
          banners={imageBanners.map((b) => ({
            id: b.id,
            imageUrl: b.imageUrl!,
            linkUrl: b.linkUrl,
            text: b.text,
          }))}
        />
      )}
      {textBanners.length > 0 && (
        <div className="bg-gold/95 text-navy-deep py-2 overflow-hidden whitespace-nowrap">
          <div className="inline-flex animate-marquee gap-12 font-bold text-sm">
            {[...textBanners, ...textBanners].map((b, i) => (
              <span key={`${b.id}-${i}`} className="px-6 inline-flex items-center gap-2">
                <span className="opacity-50">📢</span>
                {b.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

