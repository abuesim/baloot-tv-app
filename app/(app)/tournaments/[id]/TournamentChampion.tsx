"use client";

import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { TeamLite } from "./TournamentDetail";

const C_COLORS = ["#f5b042", "#ff5e3a", "#4ecdc4", "#a29bfe", "#fd79a8", "#55efc4", "#74b9ff"];

// فقاعات صاعدة + كونفيتي متساقط
const BUBBLES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  left: (i * 3.9) % 100,
  size: 10 + (i % 6) * 8,
  dur: 4 + (i % 6) * 1.1,
  delay: (i * 0.37) % 6,
}));
const CONFETTI = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  left: (i * 1.43) % 100,
  color: C_COLORS[i % 7],
  size: 6 + (i % 5) * 3,
  dur: 2.6 + (i % 6) * 0.5,
  delay: (i * 0.11) % 4,
  circle: i % 3 === 0,
}));

/** تصميم احتفالي للبطل — يعرض الفريق البطل والوصيف مع فقاعات وكونفيتي */
export default function TournamentChampion({
  champion,
  runnerUp,
}: {
  champion: TeamLite;
  runnerUp: TeamLite | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-b from-gold/20 via-navy to-navy p-6 md:p-8">
      <style>{`
        @keyframes champBubble {
          0%   { transform: translateY(0) scale(0.6); opacity: 0; }
          15%  { opacity: 0.5; }
          100% { transform: translateY(-340px) scale(1.1); opacity: 0; }
        }
        @keyframes champConf {
          0%   { transform: translateY(-10%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(420px) rotate(560deg); opacity: 0; }
        }
        @keyframes champGlow { 0%,100%{ text-shadow: 0 0 20px #f5b04299 } 50%{ text-shadow: 0 0 50px #f5b042 } }
        @keyframes champPop { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* فقاعات */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {BUBBLES.map((b) => (
          <div
            key={b.id}
            className="absolute bottom-0 rounded-full"
            style={{
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              background: "radial-gradient(circle at 30% 30%, rgba(245,176,66,0.55), rgba(245,176,66,0.05))",
              border: "1px solid rgba(245,176,66,0.3)",
              animation: `champBubble ${b.dur}s ease-in ${b.delay}s infinite`,
            }}
          />
        ))}
        {CONFETTI.map((c) => (
          <div
            key={`c${c.id}`}
            className="absolute top-0"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.circle ? c.size : c.size * 0.5,
              background: c.color,
              borderRadius: c.circle ? "50%" : "2px",
              animation: `champConf ${c.dur}s linear ${c.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* المحتوى */}
      <div className="relative z-10 text-center">
        <div className="text-6xl md:text-7xl mb-2" style={{ animation: "champPop 0.6s ease-out" }}>🏆</div>
        <div
          className="text-2xl md:text-4xl font-black text-gold mb-1"
          style={{ animation: "champGlow 2s ease-in-out infinite" }}
        >
          بطل البطولة
        </div>

        {/* الفريق البطل */}
        <div className="mt-4 flex flex-col items-center" style={{ animation: "champPop 0.7s ease-out" }}>
          <div className="flex items-end justify-center gap-6 md:gap-10">
            {[champion.player1, champion.player2].map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="md:scale-110">
                  <PlayerAvatar name={p.name} imageUrl={p.imageUrl} size="xl" />
                </div>
                <span className="text-sm md:text-lg font-bold text-gold">{p.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xl md:text-2xl font-black bg-gold/15 border border-gold/30 rounded-full px-5 py-1.5">
            {champion.name}
          </div>
        </div>

        {/* الوصيف */}
        {runnerUp && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="text-xs text-white/40 mb-2">🥈 الوصيف</div>
            <div className="flex items-center justify-center gap-2 opacity-70">
              <div className="flex -space-x-2 -space-x-reverse">
                <PlayerAvatar name={runnerUp.player1.name} imageUrl={runnerUp.player1.imageUrl} size="sm" className="ring-2 ring-navy" />
                <PlayerAvatar name={runnerUp.player2.name} imageUrl={runnerUp.player2.imageUrl} size="sm" className="ring-2 ring-navy" />
              </div>
              <span className="text-sm font-bold">{runnerUp.name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
