export function Logo({
  size = "md",
  showText = true,
  text = "بلوت",
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  text?: string;
}) {
  const config = {
    sm: { icon: "w-6 h-6",  text: "text-lg",  gap: "gap-2"   },
    md: { icon: "w-8 h-8",  text: "text-2xl", gap: "gap-2.5" },
    lg: { icon: "w-12 h-12", text: "text-4xl", gap: "gap-3"  },
  }[size];

  return (
    <span className={`inline-flex items-center ${config.gap}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon-512x512.png"
        alt={text}
        className={`${config.icon} rounded-full object-cover`}
      />
      {showText && (
        <span className={`font-bold text-white ${config.text}`}>{text}</span>
      )}
    </span>
  );
}
