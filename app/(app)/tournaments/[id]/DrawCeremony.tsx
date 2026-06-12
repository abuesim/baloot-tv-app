"use client";

import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { TeamLite } from "./TournamentDetail";

const C_COLORS = ["#f5b042", "#ff5e3a", "#4ecdc4", "#a29bfe", "#fd79a8", "#55efc4", "#74b9ff"];

/** احتفالية القرعة — تكشف الفرق واحداً تلو الآخر */
export default function DrawCeremony({
  teams,
  format,
  onClose,
}: {
  teams: TeamLite[];
  format: "KNOCKOUT" | "POINTS";
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(0);
  const done = revealed >= teams.length;

  useEffect(() => {
    if (revealed >= teams.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), revealed === 0 ? 600 : 1100);
    return () => clearTimeout(t);
  }, [revealed, teams.length]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-sm">
      <style>{`
        @keyframes drawPop {
          0%   { transform: scale(0.4) translateY(20px); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawGlow { 0%,100%{ box-shadow:0 0 20px -6px #f5b042 } 50%{ box-shadow:0 0 40px 0px #f5b042 } }
        @keyframes confFall { to { transform: translateY(105vh) rotate(540deg); opacity: 0; } }
      `}</style>

      {/* كونفيتي عند الانتهاء */}
      {done && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "-5%",
                left: `${(i * 1.7) % 100}%`,
                width: 8,
                height: 12,
                background: C_COLORS[i % C_COLORS.length],
                borderRadius: 2,
                animation: `confFall ${2 + (i % 5) * 0.5}s linear ${(i % 10) * 0.15}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="text-gold text-sm font-bold mb-1">🎲 القرعة</div>
        <h2 className="text-2xl font-black mb-6">
          {done ? "اكتملت القرعة!" : "جارٍ سحب الفرق..."}
        </h2>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto px-1">
          {teams.slice(0, revealed).map((t, i) => (
            <div
              key={t.id}
              className="bg-navy rounded-xl border-2 border-gold/40 p-3 flex items-center gap-3"
              style={{ animation: "drawPop 0.5s ease-out" }}
            >
              <span className="w-7 h-7 rounded-full bg-gold/20 text-gold font-black text-sm flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex -space-x-2 -space-x-reverse shrink-0">
                <PlayerAvatar name={t.player1.name} imageUrl={t.player1.imageUrl} size="sm" className="ring-2 ring-navy" />
                <PlayerAvatar name={t.player2.name} imageUrl={t.player2.imageUrl} size="sm" className="ring-2 ring-navy" />
              </div>
              <span className="flex-1 text-right font-bold truncate">{t.name}</span>
            </div>
          ))}

          {/* بطاقة "يُسحب الآن" */}
          {!done && (
            <div
              className="bg-navy-light rounded-xl border-2 border-dashed border-white/20 p-3 flex items-center justify-center text-white/40 text-sm"
              style={{ animation: "drawGlow 1s ease-in-out infinite" }}
            >
              ...
            </div>
          )}
        </div>

        {done && (
          <button
            onClick={onClose}
            className="mt-6 btn-grad px-8 py-3 rounded-xl text-lg"
          >
            {format === "KNOCKOUT" ? "عرض الشجرة" : "عرض الجدول"}
          </button>
        )}
      </div>
    </div>
  );
}
