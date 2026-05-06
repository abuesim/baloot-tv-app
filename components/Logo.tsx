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
    sm: { icon: "w-6 h-6", text: "text-lg", gap: "gap-2" },
    md: { icon: "w-8 h-8", text: "text-2xl", gap: "gap-2.5" },
    lg: { icon: "w-12 h-12", text: "text-4xl", gap: "gap-3" },
  }[size];

  return (
    <span className={`inline-flex items-center ${config.gap}`}>
      <span
        className={`${config.icon} rounded-full relative inline-flex items-center justify-center`}
        style={{
          background:
            "conic-gradient(from 200deg, #ff5e3a, #e91e63, #7c3aed, #ff5e3a)",
        }}
      >
        <span className="absolute inset-[3px] rounded-full bg-bg" />
        <span
          className="relative w-1/2 h-1/2 rounded-full"
          style={{
            background:
              "linear-gradient(135deg, #ff5e3a 0%, #e91e63 100%)",
          }}
        />
      </span>
      {showText && (
        <span className={`font-bold text-white ${config.text}`}>{text}</span>
      )}
    </span>
  );
}
