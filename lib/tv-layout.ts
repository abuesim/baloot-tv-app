export const TV_LAYOUT_KEYS = [
  "header",
  "team1",
  "difference",
  "team2",
  "players",
  "rounds",
  "tournament",
  "banners",
] as const;

export type TvLayoutKey = (typeof TV_LAYOUT_KEYS)[number];

export type TvLayoutElement = {
  x: number;
  y: number;
  scale: number;
  visible: boolean;
  color: string;
};

export type TvLayoutConfig = {
  version: 2;
  backgroundColor: string;
  playerRows: 1 | 2;
  elements: Record<TvLayoutKey, TvLayoutElement>;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function createDefaultTvLayout(accent = "#f5b042"): TvLayoutConfig {
  const safeAccent = HEX.test(accent) ? accent : "#f5b042";
  const element = (color: string): TvLayoutElement => ({
    x: 0,
    y: 0,
    scale: 1,
    visible: true,
    color,
  });

  return {
    version: 2,
    backgroundColor: "#0a0a0e",
    playerRows: 1,
    elements: {
      header: element(safeAccent),
      team1: element(safeAccent),
      difference: element(safeAccent),
      team2: element("#ffffff"),
      players: element("auto"),
      rounds: element(safeAccent),
      tournament: element(safeAccent),
      banners: element("#f5b042"),
    },
  };
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

export function normalizeTvLayout(value: unknown, accent = "#f5b042"): TvLayoutConfig {
  const defaults = createDefaultTvLayout(accent);
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  const raw = value as Record<string, unknown>;
  const rawElements =
    raw.elements && typeof raw.elements === "object" && !Array.isArray(raw.elements)
      ? (raw.elements as Record<string, unknown>)
      : {};

  const elements = Object.fromEntries(
    TV_LAYOUT_KEYS.map((key) => {
      const fallback = defaults.elements[key];
      const candidate =
        rawElements[key] && typeof rawElements[key] === "object" && !Array.isArray(rawElements[key])
          ? (rawElements[key] as Record<string, unknown>)
          : {};
      return [
        key,
        {
          x: finiteNumber(candidate.x, fallback.x, -40, 40),
          y: finiteNumber(candidate.y, fallback.y, -30, 30),
          scale: finiteNumber(candidate.scale, fallback.scale, 0.5, 1.8),
          visible: typeof candidate.visible === "boolean" ? candidate.visible : fallback.visible,
          color: typeof candidate.color === "string" && (HEX.test(candidate.color) || (key === "players" && candidate.color === "auto"))
            ? candidate.color
            : fallback.color,
        },
      ];
    }),
  ) as Record<TvLayoutKey, TvLayoutElement>;

  return {
    version: 2,
    backgroundColor:
      typeof raw.backgroundColor === "string" && HEX.test(raw.backgroundColor)
        ? raw.backgroundColor
        : defaults.backgroundColor,
    playerRows: raw.playerRows === 2 ? 2 : 1,
    elements,
  };
}

export function tvElementStyle(element: TvLayoutElement): React.CSSProperties {
  return {
    visibility: element.visible ? "visible" : "hidden",
    transform: `translate(${element.x}vw, ${element.y}vh) scale(${element.scale})`,
    transformOrigin: "center",
    position: "relative",
    zIndex: 2,
  };
}
