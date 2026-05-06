type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_CLASS: Record<Size, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-base",
  lg: "w-16 h-16 text-xl",
  xl: "w-24 h-24 text-3xl",
  "2xl": "w-32 h-32 text-5xl",
};

export function PlayerAvatar({
  name,
  imageUrl,
  size = "md",
  className = "",
}: {
  name: string;
  imageUrl?: string | null;
  size?: Size;
  className?: string;
}) {
  const initial = name.trim().charAt(0) || "?";
  const sizeClass = SIZE_CLASS[size];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover bg-navy-light border border-white/10 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-navy-light to-navy flex items-center justify-center font-black text-gold border border-white/10 ${className}`}
    >
      {initial}
    </div>
  );
}
