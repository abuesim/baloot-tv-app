"use client";

import { useEffect, useState } from "react";

type Banner = {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  text: string | null;
};

const ROTATE_MS = 5000;

export function ImageCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [banners.length]);

  return (
    <div className="bg-navy/95 backdrop-blur border-t border-white/10 px-3 py-2">
      <div className="max-w-6xl mx-auto relative h-16 md:h-20">
        {banners.map((b, i) => {
          const visible = i === index;
          const inner = (
            <div
              className={`absolute inset-0 flex items-center justify-center gap-3 transition-all duration-700 ${
                visible
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <img
                src={b.imageUrl}
                alt={b.text ?? ""}
                className="h-full max-h-16 md:max-h-20 rounded-xl object-cover border border-gold/30"
              />
              {b.text && (
                <span className="text-white/90 font-bold text-sm md:text-base truncate">
                  {b.text}
                </span>
              )}
            </div>
          );
          return b.linkUrl ? (
            <a
              key={b.id}
              href={b.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {inner}
            </a>
          ) : (
            <div key={b.id}>{inner}</div>
          );
        })}

        {/* مؤشّرات نقاط */}
        {banners.length > 1 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === index ? "bg-gold w-4" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
