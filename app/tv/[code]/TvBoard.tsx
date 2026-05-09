"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

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
  tvShowAlert: boolean;
  tvAlertUrl: string | null;
  tvStreamlabsToken: string | null;
  tvAlertSound: string | null;
};

type BannerItem = {
  id: string;
  imageUrl: string | null;
  text: string | null;
  linkUrl: string | null;
};

type FloatPop = { id: number; team: 1 | 2; delta: number };
type TvAlert = {
  id: number;
  listener: string;
  name: string;
  amount: string;
  currency: string;
  message: string;
  image_href: string;
  sound_href: string;
};

// ─── بيانات الكونفيتي ───
const C_COLORS = ["#f5b042","#ff5e3a","#4ecdc4","#a29bfe","#fd79a8","#55efc4","#fdcb6e","#74b9ff","#e17055"];
const TV_CONFETTI = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  color: C_COLORS[i % 9],
  left: (i * 1.27) % 100,
  size: 6 + (i % 6) * 3,
  dur: 2.4 + (i % 5) * 0.55,
  delay: (i * 0.11) % 3.8,
  circle: i % 3 !== 2,
}));

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
  const [alertQueue, setAlertQueue] = useState<TvAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<TvAlert | null>(null);
  const [alertPaused, setAlertPaused] = useState(false);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recentDonations, setRecentDonations] = useState<
    { id: number; name: string; amount: string; currency: string }[]
  >([]);
  // استشعار حجم الشاشة لعكس الاتجاه على الجوال
  const [isMobileView, setIsMobileView] = useState(false);
  // هل الشاشة الفعلية أفقية؟ — نستخدم screen.orientation أو أبعاد الشاشة الحقيقية
  const [isScreenLandscape, setIsScreenLandscape] = useState(true);
  useEffect(() => {
    function check() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobileView(w < 768);

      // screen.orientation أدق من innerWidth لأنه لا يتأثر بالـ viewport meta
      const orientType = (window.screen as Screen & { orientation?: { type: string } })
        .orientation?.type ?? "";
      if (orientType) {
        setIsScreenLandscape(orientType.includes("landscape"));
      } else {
        // fallback: قارن أبعاد الشاشة الفعلية
        setIsScreenLandscape(
          window.screen.availWidth > window.screen.availHeight || w > h
        );
      }
    }
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);
  const [showCelebration, setShowCelebration] = useState(
    initialGame?.winner !== null && initialGame?.winner !== undefined,
  );
  const popIdRef = useRef(0);
  const prevRef = useRef<{ gameId: string | null; t1: number; t2: number }>({
    gameId: initialGame?.id ?? null,
    t1: initialGame?.team1Score ?? 0,
    t2: initialGame?.team2Score ?? 0,
  });
  const prevWinnerRef = useRef<number | null>(initialGame?.winner ?? null);

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
        if (msg.type === "alert") {
          const alertId = ++popIdRef.current;
          setAlertQueue((q) => [
            ...q,
            {
              id: alertId,
              listener: msg.listener ?? "",
              name: msg.name ?? "",
              amount: msg.amount ?? "",
              currency: msg.currency ?? "",
              message: msg.message ?? "",
              image_href: msg.image_href ?? "",
              sound_href: msg.sound_href ?? "",
            },
          ]);
          // تتبع الدونيشن لشريط التمرير النيتيف
          const isDonation = (msg.listener ?? "").includes("donation");
          if (isDonation && msg.name) {
            setRecentDonations((prev) =>
              [{ id: alertId, name: msg.name ?? "", amount: msg.amount ?? "", currency: msg.currency ?? "" },
               ...prev].slice(0, 30)
            );
          }
          return;
        }
        if (msg.type === "game") {
          const data: Game = msg.game;

          // صكة متروكة → أخفِ الشاشة فوراً
          if (data.status === "ABANDONED") {
            setGame(null);
            setShowCelebration(false);
            prevRef.current = { gameId: null, t1: 0, t2: 0 };
            prevWinnerRef.current = null;
            return;
          }

          const isNewGame = prevRef.current.gameId !== data.id;
          if (isNewGame) {
            prevRef.current = { gameId: data.id, t1: data.team1Score, t2: data.team2Score };
            prevWinnerRef.current = data.winner ?? null;
            setShowCelebration(data.winner !== null);
            setGame(data);
            return;
          }
          // كشف فوز جديد — شغّل الاحتفال
          if (data.winner !== null && prevWinnerRef.current === null) {
            setShowCelebration(true);
          }
          prevWinnerRef.current = data.winner ?? null;
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

  // ─── Streamlabs Socket.IO — اتصال مباشر لاستقبال التنبيهات ───
  // نحتفظ بـ ref للـ socket حتى نقدر نقطعه صح في الـ cleanup
  const slSocketRef = useRef<{ disconnect: () => void } | null>(null);
  // deduplication: نتجاهل نفس الحدث إذا جاء مرتين
  const recentKeysRef  = useRef<Set<string>>(new Set());
  // وقت آخر اتصال — نتجاهل أي حدث يصل خلال أول 3 ثواني (replay من Streamlabs)
  const slConnectedAtRef = useRef(0);

  useEffect(() => {
    const token = user.tvStreamlabsToken;
    if (!token) return;

    let cancelled = false;

    import("socket.io-client").then(({ io }) => {
      if (cancelled) return;

      const socket = io("https://sockets.streamlabs.com", {
        transports: ["websocket"],
        query: { token },
      });

      // نحفظ المرجع فوراً حتى يقدر الـ cleanup يقطعه
      slSocketRef.current = socket;

      // نسجل وقت الاتصال — أي حدث قبل 3 ثوانٍ منه هو replay نتجاهله
      socket.on("connect", () => {
        slConnectedAtRef.current = Date.now();
      });

      socket.on("event", (data: {
        type?: string;
        for?: string;
        message?: {
          name?: string;
          amount?: string | number;
          currency?: string;
          message?: string;
          image_href?: string;
          sound_href?: string;
        }[];
      }) => {
        // تجاهل أي حدث يصل في أول 3 ثوانٍ بعد الاتصال — هذه replays من Streamlabs
        if (Date.now() - slConnectedAtRef.current < 3_000) return;

        const msg = data.message?.[0] ?? {};

        // فلتر: فقط الأحداث الحقيقية — نتجاهل alertbox-test وأي حدث إعدادات
        const REAL_EVENTS = new Set([
          "donation", "follow", "subscription", "resub",
          "bits", "host", "raid",
          "follower-latest", "donation-latest",
          "subscription-latest", "cheer-latest",
        ]);
        if (!REAL_EVENTS.has(data.type ?? "")) return;

        // dedup: نطبّع المبلغ والاسم لتجنب "65" vs "65.00"
        const nameNorm = String(msg.name  ?? "").toLowerCase().trim();
        const amtNorm  = String(Math.round(parseFloat(String(msg.amount ?? "0")) * 100) || "0");
        const dedupKey = `${nameNorm}:${amtNorm}`;
        if (recentKeysRef.current.has(dedupKey)) return;
        recentKeysRef.current.add(dedupKey);
        setTimeout(() => recentKeysRef.current.delete(dedupKey), 20_000);

        const alertId = ++popIdRef.current;
        setAlertQueue((q) => [
          ...q,
          {
            id: alertId,
            listener: data.type ?? "",
            name: msg.name ?? "",
            amount: String(msg.amount ?? ""),
            currency: msg.currency ?? "",
            message: msg.message ?? "",
            image_href: msg.image_href ?? "",
            sound_href: msg.sound_href ?? "",
          },
        ]);
        // تتبع الدونيشن لشريط التمرير النيتيف
        if (data.type === "donation" && msg.name) {
          setRecentDonations((prev) =>
            [{ id: alertId, name: msg.name ?? "", amount: String(msg.amount ?? ""), currency: msg.currency ?? "" },
             ...prev].slice(0, 30)
          );
        }
      });
    });

    // cleanup صح: يقطع الـ socket فعلاً
    return () => {
      cancelled = true;
      slSocketRef.current?.disconnect();
      slSocketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.tvStreamlabsToken]);

  // ─── معالجة طابور التنبيهات — واحد تلو الآخر مع فجوة بينهما ───
  const ALERT_SHOW_MS = 12_000; // مدة عرض كل تنبيه
  const ALERT_GAP_MS  = 1_200;  // فجوة بين تنبيه والتالي

  useEffect(() => {
    if (alertQueue.length === 0 || activeAlert || alertPaused) return;
    const next = alertQueue[0];
    setAlertQueue((q) => q.slice(1));
    setActiveAlert(next);
    alertTimerRef.current = setTimeout(() => {
      setActiveAlert(null);
      setAlertPaused(true);
      setTimeout(() => setAlertPaused(false), ALERT_GAP_MS);
    }, ALERT_SHOW_MS);
  }, [alertQueue, activeAlert, alertPaused]);

  // المتغيرات اللازمة للستايل
  const accent = user.tvAccentColor || "#f5b042";
  const styleVars: React.CSSProperties = {
    ["--tv-accent" as never]: accent,
  };

  // overlay.creators.sa و streamelements تشتغل عبر الـ proxy — نفعّل الـ iframe
  const showAlert = user.tvShowAlert && !!user.tvAlertUrl;

  // حالة بدون صكة
  if (!game) {
    return (
      <div
        className="fixed inset-0 flex flex-col bg-bg overflow-hidden"
        style={styleVars}
      >
        {/* الهيدر: شعار + اسم التطبيق + اسم اليوزر */}
        <div className="px-4 md:px-8 pt-4 md:pt-6 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-512x512.png"
              alt="logo"
              className="w-9 h-9 md:w-12 md:h-12 rounded-full object-cover"
            />
            <span className="text-xl md:text-3xl font-black" style={{ color: accent }}>
              أكك لايف
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm text-white/50">
            <span>{user.displayName}</span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                connected ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
          </div>
        </div>

        {/* المنتصف */}
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div className="space-y-4">
            <div className="text-6xl md:text-9xl">🎴</div>
            <div className="text-xl md:text-3xl text-white/80 font-bold">
              بانتظار بداية الصكة
            </div>
            <div className="text-white/40 text-sm md:text-base tracking-widest" style={{ color: accent }}>
              {code}
            </div>
          </div>
        </div>

        {/* إعلانات الصور في المنتصف */}
        {banners.filter((b) => b.imageUrl).length > 0 && (
          <TvImageBannerCenter banners={banners.filter((b) => b.imageUrl)} />
        )}

        {/* الإعلانات النصية في الأسفل */}
        {banners.length > 0 && <TvBannerBar banners={banners} />}

        {/* صندوق التنبيهات — طبقة شفافة فوق كل شيء */}
        {showAlert && <AlertBoxOverlay url={tvProxy(user.tvAlertUrl!)} />}

        {/* تنبيه Streamlabs النيتيف */}
        {activeAlert && (
          <TvAlertBadge key={activeAlert.id} alert={activeAlert} accent={accent} customSound={user.tvAlertSound} />
        )}
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

  // شاشة أفقية فعلية (TV / كمبيوتر landscape) → landscape دائماً بصرف النظر عن الإعداد
  // جوال أفقي  → portrait (لأنه في يد اللاعب عادةً بالطول)
  // جوال عمودي → حسب الإعداد مع الـ flip
  const isPortrait = isScreenLandscape
    ? false
    : isMobileView
      ? user.tvOrientation === "LANDSCAPE"
      : user.tvOrientation === "PORTRAIT";
  const showChat = user.tvShowChat && !!user.tvChatUrl;
  // الدونيشن native — يظهر فقط لما تصل دونيشن فعلية (لا iframe)
  const showDonations = user.tvShowDonations && recentDonations.length > 0;

  // ألوان الفريقين الثابتة
  const TEAM1_COLOR = "#ff7c2a"; // لنا  — برتقالي
  const TEAM2_COLOR = "#ffffff"; // لهم — أبيض

  // محتوى الصكة (مشترك بين الوضعين)
  const gameContent = (
    <>
      <Header user={user} game={game} connected={connected} />

      {/* إعلانات صور — تظهر في المنتصف فوق النقاط */}
      {banners.filter((b) => b.imageUrl).length > 0 && (
        <TvImageBannerCenter banners={banners.filter((b) => b.imageUrl)} />
      )}

      <div className="flex-1 flex items-stretch px-2 md:px-6 gap-2 md:gap-6">
        <div className={showChat ? "flex-[2]" : "flex-1"}>
          <div className="h-full flex items-center justify-center">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 md:gap-6 w-full items-center">
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
          <div className="w-48 sm:w-64 md:w-80 lg:w-96 xl:w-[26rem] shrink-0">
            <ChatPanel url={user.tvChatUrl!} variant="side" />
          </div>
        )}
      </div>

      {/* شريط سفلي: الدونيشن (يسار) + الجولات (يمين) في صف واحد */}
      {(showDonations || (user.tvShowRounds && lastRounds.length > 0)) && (
        <div className="flex items-center gap-2 px-3 md:px-8 pb-2 md:pb-4">
          {showDonations && (
            <div className="flex-1 min-w-0">
              <NativeDonationStrip donations={recentDonations} accent={accent} />
            </div>
          )}
          {user.tvShowRounds && lastRounds.length > 0 && (
            <div className="shrink-0">
              <RoundsStrip rounds={lastRounds} accent={accent} />
            </div>
          )}
        </div>
      )}

      {banners.length > 0 && <TvBannerBar banners={banners} />}

      {showCelebration && game.winner !== null && (
        <TvWinCelebration
          game={game}
          team1={team1}
          team2={team2}
          accent={accent}
        />
      )}

      {/* تنبيه Streamlabs النيتيف — يظهر فوق المحتوى */}
      {activeAlert && (
        <TvAlertBadge key={activeAlert.id} alert={activeAlert} accent={accent} customSound={user.tvAlertSound} />
      )}
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
          {/* صندوق التنبيهات داخل المحتوى المدوَّر حتى يتوافق مع اتجاه الشاشة */}
          {showAlert && <AlertBoxOverlay url={tvProxy(user.tvAlertUrl!)} />}
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
      {/* صندوق التنبيهات — طبقة شفافة فوق المحتوى */}
      {showAlert && <AlertBoxOverlay url={tvProxy(user.tvAlertUrl!)} />}
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
    <div className="px-3 md:px-8 pt-3 md:pt-6 pb-1 md:pb-2 flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-512x512.png"
          alt="logo"
          className="w-8 h-8 md:w-11 md:h-11 rounded-full object-cover"
        />
        <span className="text-xl md:text-3xl font-black" style={{ color: user.tvAccentColor }}>
          أكك لايف
        </span>
      </div>
      <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-white/60">
        <span className="hidden sm:inline">{user.displayName}</span>
        {game?.mode === "MASHDOOD" && (
          <span
            className="px-2 md:px-3 py-0.5 md:py-1 rounded-full font-bold text-xs md:text-sm"
            style={{
              backgroundColor: `${user.tvAccentColor}33`,
              color: user.tvAccentColor,
            }}
          >
            مشدود
          </span>
        )}

        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
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
    <div className="bg-navy/60 rounded-xl md:rounded-2xl p-2 md:p-3 border border-white/5">
      <div className="text-xs text-white/40 mb-1">آخر الجولات</div>
      <div className="flex gap-1.5 md:gap-2 overflow-x-auto">
          {rounds.map((r) => (
            <div
              key={r.id}
              className="bg-navy rounded-lg md:rounded-xl px-2 md:px-4 py-1 md:py-2 border border-white/10 flex items-center gap-2 md:gap-3 shrink-0"
            >
              <span className="text-xs text-white/40">#{r.number}</span>
              <span className="font-bold text-sm md:text-base" style={{ color: accent }}>
                {r.team1Score}
              </span>
              <span className="text-white/30 text-xs">-</span>
              <span className="font-bold text-sm md:text-base">{r.team2Score}</span>
            </div>
          ))}
        </div>
    </div>
  );
}

function TvWinCelebration({
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
  const winners = game.winner === 1 ? team1 : team2;
  const label   = game.winner === 1 ? "لنا" : "لهم";
  const winScore  = game.winner === 1 ? game.team1Score : game.team2Score;
  const loseScore = game.winner === 1 ? game.team2Score : game.team1Score;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
      <style>{`
        @keyframes tvRise {
          0%   { transform:translateY(105%) rotate(0deg);   opacity:1 }
          80%  { opacity:1 }
          100% { transform:translateY(-20%) rotate(600deg); opacity:0 }
        }
        @keyframes tvPop {
          0%,100% { transform:scale(1)    }
          30%     { transform:scale(1.06) }
          60%     { transform:scale(0.97) }
        }
        @keyframes tvGlow {
          0%,100% { text-shadow: 0 0 20px currentColor  }
          50%     { text-shadow: 0 0 60px currentColor  }
        }
      `}</style>

      {/* خلفية ضبابية */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* كونفيتي لا ينتهي */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {TV_CONFETTI.map((p) => (
          <div
            key={p.id}
            className="absolute bottom-0"
            style={{
              left: `${p.left}%`,
              width:  p.size,
              height: p.size,
              background:  p.circle ? p.color : undefined,
              border: !p.circle ? `${Math.ceil(p.size / 2)}px solid ${p.color}` : undefined,
              borderRadius: p.circle ? "50%" : "3px",
              animation: `tvRise ${p.dur}s ease-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* المحتوى */}
      <div
        className="relative z-10 text-center px-6"
        style={{ animation: "tvPop 2s ease-in-out infinite" }}
      >
        <div className="text-5xl md:text-8xl mb-2 md:mb-4">🏆</div>
        <div
          className="text-4xl md:text-7xl font-black mb-1 md:mb-2"
          style={{ color: accent, animation: "tvGlow 2s ease-in-out infinite" }}
        >
          فوز فريق {label}!
        </div>
        <div className="text-white/50 text-lg md:text-3xl mb-5 md:mb-8 tabular-nums">
          {winScore} — {loseScore}
        </div>
        <div className="flex justify-center gap-8 md:gap-16">
          {winners.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-2 md:gap-4">
              {/* جوال: 2xl (128px) — شاشة كبيرة: 2xl × scale-125 ≈ 160px */}
              <div className="md:scale-125 md:my-4">
                <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="2xl" />
              </div>
              <span className="text-sm md:text-xl font-bold" style={{ color: accent }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** يمرّر الرابط عبر الـ proxy لإزالة رؤوس X-Frame-Options و CSP frame-ancestors */
function tvProxy(url: string) {
  return `/api/tv-proxy?url=${encodeURIComponent(url)}`;
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
        src={tvProxy(url)}
        className="w-full h-[calc(100%-32px)] border-0 bg-transparent"
        allow="autoplay"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}

/** شريط الدونيشن النيتيف — يُغذّى من Socket.IO بدون iframe */
function NativeDonationStrip({
  donations,
  accent,
}: {
  donations: { id: number; name: string; amount: string; currency: string }[];
  accent: string;
}) {
  if (donations.length === 0) return null;
  // نكرر العناصر للتمرير السلس
  const items = donations.length < 6
    ? [...donations, ...donations, ...donations]
    : [...donations, ...donations];

  return (
    <div className="overflow-hidden">
      <div
        className="rounded-xl flex items-center h-10 md:h-12"
        style={{
          background: "rgba(6,10,20,0.88)",
          border: `1px solid ${accent}35`,
        }}
      >
        {/* تسمية ثابتة */}
        <div
          className="shrink-0 px-3 md:px-5 text-xs md:text-sm font-black flex items-center gap-1.5 h-full border-r"
          style={{ color: accent, borderColor: `${accent}30` }}
        >
          💰 <span className="hidden sm:inline">دونيشن</span>
        </div>

        {/* شريط التمرير */}
        <div className="flex-1 overflow-hidden flex items-center">
          <div className="flex animate-marquee gap-10 whitespace-nowrap pl-4">
            {items.map((d, i) => (
              <span
                key={`${d.id}-${i}`}
                className="inline-flex items-center gap-2 text-sm"
              >
                <span className="font-black" style={{ color: accent }}>
                  {d.name || "—"}
                </span>
                {d.amount && d.amount !== "0" && (
                  <span className="font-bold text-white/90">
                    {d.amount}
                    {d.currency ? ` ${d.currency}` : ""}
                  </span>
                )}
                <span className="text-white/20 text-lg">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** محفوظ للتوافق مع ChatPanel — DonationStrip القديم (iframe) */
function DonationStrip({ url }: { url: string }) {
  return (
    <div className="mx-3 md:mx-8 mb-2">
      <div className="bg-navy rounded-xl border border-white/10 overflow-hidden h-14 md:h-20">
        <iframe
          src={tvProxy(url)}
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
      className={`text-center relative rounded-2xl md:rounded-3xl p-2 md:p-4 transition-all ${
        flashing ? "panel-glow" : ""
      } ${isWinner ? "scale-105" : ""}`}
    >
      <div
        className="text-base md:text-2xl font-bold mb-1 md:mb-3"
        style={{ color }}
      >
        {label}
      </div>
      <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4 min-h-8 md:min-h-24">
        {players.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1 md:gap-2">
            {/* جوال: lg (64px) — شاشة كبيرة: xl (96px ≈ +50%) */}
            <span className="block md:hidden">
              <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="lg" />
            </span>
            <span className="hidden md:block">
              <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="xl" />
            </span>
            <span
              className="text-xs md:text-base max-w-16 md:max-w-24 truncate font-medium"
              style={{ color }}
            >
              {p.name}
            </span>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 top-1/3 pointer-events-none">
        {pops.map((p) => (
          <div
            key={p.id}
            className="float-up text-2xl md:text-4xl font-black"
            style={{ color, position: "absolute", left: 0, right: 0 }}
          >
            +{p.delta}
          </div>
        ))}
      </div>
      <div
        key={score}
        className={`text-[3.5rem] sm:text-[5rem] md:text-[7rem] lg:text-[10rem] xl:text-[12rem] leading-none font-black mb-2 md:mb-4 ${
          flashing ? "score-flash" : ""
        }`}
        style={{ color }}
      >
        {score}
      </div>
      <div className="bg-white/5 rounded-full h-1.5 md:h-2 overflow-hidden">
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
      <div className="bg-navy rounded-xl md:rounded-2xl px-2 md:px-4 py-3 md:py-6 border border-white/10 text-center self-center">
        <div className="text-xs text-white/40">الفرق</div>
        <div className="text-xl md:text-3xl font-bold text-white/60">=</div>
      </div>
    );
  }
  return (
    <div
      className="bg-navy rounded-xl md:rounded-2xl px-2 md:px-4 py-3 md:py-6 text-center self-center shadow-lg"
      style={{
        borderColor: `${accent}50`,
        borderWidth: 1,
        boxShadow: `0 10px 25px -10px ${accent}33`,
      }}
    >
      <div className="text-xs text-white/40 mb-1">الفرق</div>
      <div className="text-2xl md:text-4xl lg:text-5xl font-black" style={{ color: accent }}>
        {diff}
      </div>
      <div className="text-xs text-white/60 mt-1 hidden sm:block">
        {lead === 1 ? "لنا →" : "← لهم"}
      </div>
    </div>
  );
}

// ============================================================
// بادج التنبيه النيتيف (يُطلق من Streamlabs Custom HTML)
// ============================================================
const ALERT_META: Record<string, { icon: string; label: string }> = {
  // أنواع Streamlabs Socket المباشرة
  "follow":              { icon: "❤️",  label: "متابع جديد"   },
  "donation":            { icon: "💰",  label: "دونيشن"        },
  "subscription":        { icon: "⭐",  label: "اشتراك جديد"  },
  "resub":               { icon: "⭐",  label: "اشتراك مجدد"  },
  "bits":                { icon: "💎",  label: "Bits"           },
  "host":                { icon: "📡",  label: "هوست"           },
  "raid":                { icon: "⚔️",  label: "ريد"            },
  // أنواع push-alert (Custom HTML fallback)
  "follower-latest":     { icon: "❤️",  label: "متابع جديد"   },
  "donation-latest":     { icon: "💰",  label: "دونيشن"        },
  "subscription-latest": { icon: "⭐",  label: "اشتراك جديد"  },
  "cheer-latest":        { icon: "💎",  label: "Bits"           },
  "alertbox-test":       { icon: "🔔",  label: "تجربة"         },
};

function TvAlertBadge({ alert, accent, customSound }: { alert: TvAlert; accent: string; customSound: string | null }) {
  const meta = ALERT_META[alert.listener] ?? { icon: "🎉", label: "تنبيه" };
  const hasDonation = !!alert.amount && alert.amount !== "0";

  // ─── تشغيل الصوت عند ظهور التنبيه ───
  useEffect(() => {
    const url = customSound || alert.sound_href;
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(() => {/* autoplay blocked — silent fail */});
    return () => { audio.pause(); audio.src = ""; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`
        @keyframes alertDrop {
          0%   { transform: translateX(-50%) translateY(-120%) scale(0.8); opacity: 0; }
          12%  { transform: translateX(-50%) translateY(0)     scale(1.04); opacity: 1; }
          18%  { transform: translateX(-50%) translateY(0)     scale(1);    opacity: 1; }
          80%  { transform: translateX(-50%) translateY(0)     scale(1);    opacity: 1; }
          100% { transform: translateX(-50%) translateY(-120%) scale(0.8);  opacity: 0; }
        }
        @keyframes alertGlow {
          0%,100% { box-shadow: 0 0 30px 0px ${accent}55; }
          50%      { box-shadow: 0 0 70px 18px ${accent}77; }
        }
        @keyframes alertBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes alertConfettiRise {
          0%   { transform: translateY(110%) rotate(0deg);   opacity: 1; }
          75%  { opacity: 1; }
          100% { transform: translateY(-15%) rotate(600deg); opacity: 0; }
        }
      `}</style>

      {/* ─── كونفيتي يغطي كامل الشاشة ─── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 47,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {TV_CONFETTI.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              bottom: 0,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: p.circle ? p.color : undefined,
              border: !p.circle ? `${Math.ceil(p.size / 2)}px solid ${p.color}` : undefined,
              borderRadius: p.circle ? "50%" : "3px",
              // كل جزيء يتكرر مرتين ويكمل ضمن مدة التنبيه (12ث)
              animation: `alertConfettiRise ${p.dur * 0.8}s ease-out ${p.delay * 0.35}s 2 both`,
            }}
          />
        ))}
      </div>

      {/* ─── بادج التنبيه ─── */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: "50%",
          zIndex: 48,
          animation: "alertDrop 12s cubic-bezier(.22,.68,0,1.2) forwards",
          pointerEvents: "none",
          width: "min(48rem, 94vw)",
        }}
      >
        <div
          style={{
            background: "rgba(6,10,20,0.97)",
            border: `2px solid ${accent}`,
            borderRadius: "1.8rem",
            overflow: "hidden",
            backdropFilter: "blur(24px)",
            animation: "alertGlow 1.8s ease-in-out 4",
          }}
        >
          {/* الصورة / GIF */}
          {alert.image_href && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={alert.image_href}
              alt=""
              style={{
                display: "block",
                width: "100%",
                maxHeight: "220px",
                objectFit: "contain",
                background: "transparent",
              }}
            />
          )}

          {/* النص */}
          <div className="px-8 py-6 text-center">
            {/* نوع التنبيه */}
            <div
              className="text-lg font-bold uppercase tracking-widest mb-2"
              style={{ color: `${accent}cc` }}
            >
              {meta.icon} {meta.label}
            </div>

            {/* الاسم */}
            <div
              className="font-black leading-tight"
              style={{
                color: accent,
                fontSize: "clamp(2.4rem, 6vw, 5rem)",
              }}
            >
              {alert.name || "—"}
            </div>

            {/* المبلغ */}
            {hasDonation && (
              <div
                className="font-black mt-2"
                style={{
                  color: "#fff",
                  fontSize: "clamp(1.8rem, 4.5vw, 3.5rem)",
                }}
              >
                {alert.amount}
                {alert.currency ? ` ${alert.currency}` : ""}
              </div>
            )}

            {/* الرسالة */}
            {alert.message && (
              <div
                className="text-white/70 mt-3 leading-snug line-clamp-2"
                style={{ fontSize: "clamp(1.05rem, 2.5vw, 1.5rem)" }}
              >
                &ldquo;{alert.message}&rdquo;
              </div>
            )}
          </div>

          {/* شريط countdown */}
          <div style={{ height: "4px", background: `${accent}30` }}>
            <div
              style={{
                height: "100%",
                background: accent,
                animation: "alertBar 12s linear forwards",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// صندوق التنبيهات — طبقة شفافة مكتملة الحجم (Streamlabs / StreamElements)
// ============================================================
function AlertBoxOverlay({ url }: { url: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 45, // فوق المحتوى (40) وتحت الاحتفالية (50)
        pointerEvents: "none",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <iframe
        src={url}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "transparent",
          display: "block",
        }}
        allow="autoplay"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}

// ============================================================
// شريط الإعلانات — يُعرض داخل gameContent فيتدوّر مع الطولي
// ============================================================
/** شريط النص السفلي — يعرض كل البانرات التي لديها نص */
function TvBannerBar({ banners }: { banners: BannerItem[] }) {
  const textBanners = banners.filter((b) => b.text); // صورة+نص أو نص فقط
  if (textBanners.length === 0) return null;
  return (
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
  );
}

/** إعلانات الصور — تدور في المنتصف فوق النقاط (مستقل عن ImageCarousel) */
function TvImageBannerCenter({ banners }: { banners: BannerItem[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const b = banners[index % banners.length];
  if (!b?.imageUrl) return null;

  return (
    <div className="w-full flex justify-center items-center px-4 py-2 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={b.imageUrl}
        alt={b.text ?? ""}
        className="rounded-xl object-contain"
        style={{ maxHeight: "clamp(60px, 10vh, 120px)", maxWidth: "min(500px, 75vw)" }}
      />
    </div>
  );
}

